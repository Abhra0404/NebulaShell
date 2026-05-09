import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { authenticateSocket } from "../auth/middleware.js";
import { serverConfig } from "../config.js";
import { historyStore } from "../persistence/historyStore.js";
import { ptyManager } from "../pty/ptyManager.js";
import { sessionStore, type TerminalSession } from "../sessions/sessionStore.js";

interface CreatePayload {
  name?: string;
  cols?: number;
  rows?: number;
}

interface SessionPayload {
  sessionId: string;
}

interface InputPayload extends SessionPayload {
  data: string;
}

interface ResizePayload extends SessionPayload {
  cols: number;
  rows: number;
}

interface ReconnectByNamePayload {
  name: string;
  cols?: number;
  rows?: number;
}

type Ack<T> = (response: { ok: true; data: T } | { ok: false; error: string }) => void;

interface SocketData {
  user: { sub: string; username: string };
  terminalListeners: Map<string, Array<() => void>>;
}

function publicSession(session: TerminalSession) {
  return {
    id: session.id,
    name: session.terminalName,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    dimensions: session.dimensions,
    status: session.status
  };
}

function nextTerminalName(userId: string): string {
  const taken = new Set(sessionStore.listForUser(userId).map((session) => session.terminalName));

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `terminal-${index}`;

    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `terminal-${Date.now()}`;
}

function attachTerminal(socket: Socket, session: TerminalSession): void {
  const terminal = ptyManager.ensure(session);
  const dataListener = (data: string) => {
    socket.emit("terminal:output", { sessionId: session.id, data });
    void historyStore.append(session.userId, session.terminalName, data);
  };
  const exitListener = ({ exitCode }: { exitCode: number }) => socket.emit("terminal:closed", { sessionId: session.id, exitCode });

  terminal.on("data", dataListener);
  terminal.on("exit", exitListener);
  const data = socket.data as SocketData;
  data.terminalListeners ??= new Map();
  data.terminalListeners.set(session.id, [
    () => terminal.off("data", dataListener),
    () => terminal.off("exit", exitListener)
  ]);
}

function detachSocketTerminals(socket: Socket): void {
  const data = socket.data as SocketData;
  const listeners = data.terminalListeners;

  if (!listeners) {
    return;
  }

  for (const cleanupList of listeners.values()) {
    cleanupList.forEach((cleanup) => cleanup());
  }

  listeners.clear();
}

export function registerTerminalGateway(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: serverConfig.clientOrigin,
      credentials: true
    }
  });

  io.use((socket, next) => {
    const user = authenticateSocket(socket);

    if (!user) {
      next(new Error("Authentication required."));
      return;
    }

    (socket.data as SocketData).user = user;
    next();
  });

  io.on("connection", async (socket) => {
    const user = (socket.data as SocketData).user;
    socket.emit("session:list", { sessions: sessionStore.listForUser(user.sub).map(publicSession) });

    try {
      const saved = await historyStore.list(user.sub);
      socket.emit("terminal:saved", { terminals: saved });
    } catch {
      // ignore listing errors; client just gets nothing.
    }

    socket.on("terminal:create", async (payload: CreatePayload, ack?: Ack<{ session: ReturnType<typeof publicSession>; history: string }>) => {
      let session: TerminalSession | undefined;

      try {
        const terminalName = (payload.name?.trim() || nextTerminalName(user.sub));
        session = await sessionStore.create({
          userId: user.sub,
          socketId: socket.id,
          terminalName,
          dimensions: { cols: payload.cols ?? 100, rows: payload.rows ?? 30 }
        });

        const history = await historyStore.read(user.sub, session.terminalName);
        attachTerminal(socket, session);

        if (history) {
          socket.emit("terminal:output", { sessionId: session.id, data: history });
        }

        const data = { session: publicSession(session), history };
        socket.emit("terminal:created", { session: publicSession(session) });
        ack?.({ ok: true, data });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create terminal.";

        if (session) {
          ptyManager.close(session.id);
          await sessionStore.close(session.id);
        }

        ack?.({ ok: false, error: message });
        socket.emit("terminal:error", { message });
      }
    });

    socket.on("terminal:reconnect", async (payload: SessionPayload, ack?: Ack<{ session: ReturnType<typeof publicSession>; history: string }>) => {
      try {
        const session = sessionStore.attachSocket(payload.sessionId, user.sub, socket.id);

        if (!session) {
          ack?.({ ok: false, error: "Session not found." });
          return;
        }

        const history = await historyStore.read(user.sub, session.terminalName);
        attachTerminal(socket, session);

        if (history) {
          socket.emit("terminal:output", { sessionId: session.id, data: history });
        }

        ack?.({ ok: true, data: { session: publicSession(session), history } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to reconnect terminal.";
        ack?.({ ok: false, error: message });
        socket.emit("terminal:error", { message });
      }
    });

    socket.on("terminal:input", (payload: InputPayload) => {
      const session = sessionStore.getOwned(payload.sessionId, user.sub);

      if (!session) {
        return;
      }

      ptyManager.get(session.id)?.write(payload.data);
      sessionStore.touch(session.id);
    });

    socket.on("terminal:resize", (payload: ResizePayload) => {
      const session = sessionStore.getOwned(payload.sessionId, user.sub);

      if (!session) {
        return;
      }

      const cols = Math.max(20, Math.min(payload.cols, 300));
      const rows = Math.max(6, Math.min(payload.rows, 120));
      ptyManager.get(session.id)?.resize(cols, rows);
      sessionStore.resize(session.id, { cols, rows });
    });

    socket.on("terminal:close", async (payload: SessionPayload, ack?: Ack<{ sessionId: string }>) => {
      const session = sessionStore.getOwned(payload.sessionId, user.sub);

      if (!session) {
        ack?.({ ok: false, error: "Session not found." });
        return;
      }

      ptyManager.close(session.id);
      await sessionStore.close(session.id);
      socket.emit("terminal:closed", { sessionId: session.id });
      ack?.({ ok: true, data: { sessionId: session.id } });
    });

    socket.on("terminal:reset-history", async (payload: ReconnectByNamePayload, ack?: Ack<{ name: string }>) => {
      try {
        await historyStore.clear(user.sub, payload.name);
        ack?.({ ok: true, data: { name: payload.name } });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Unable to clear history." });
      }
    });

    socket.on("disconnect", () => {
      detachSocketTerminals(socket);
      sessionStore.detachSocket(socket.id);
    });
  });

  return io;
}
