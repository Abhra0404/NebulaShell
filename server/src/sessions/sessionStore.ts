import { randomUUID } from "node:crypto";
import { dockerManager } from "../docker/dockerManager.js";
import { serverConfig } from "../config.js";
import { ensureUserWorkspace, isSafeTerminalName } from "../persistence/userPaths.js";

export interface TerminalDimensions {
  cols: number;
  rows: number;
}

export interface TerminalSession {
  id: string;
  userId: string;
  terminalName: string;
  socketId: string | null;
  containerId: string;
  createdAt: number;
  lastActivityAt: number;
  dimensions: TerminalDimensions;
  status: "creating" | "ready" | "closed";
}

interface CreateOptions {
  userId: string;
  socketId: string;
  terminalName: string;
  dimensions: TerminalDimensions;
}

export class SessionStore {
  private readonly sessions = new Map<string, TerminalSession>();

  findByUserAndName(userId: string, terminalName: string): TerminalSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.status !== "closed" && session.userId === userId && session.terminalName === terminalName) {
        return session;
      }
    }

    return undefined;
  }

  async create(options: CreateOptions): Promise<TerminalSession> {
    if (!isSafeTerminalName(options.terminalName)) {
      throw new Error("Invalid terminal name.");
    }

    const existing = this.findByUserAndName(options.userId, options.terminalName);

    if (existing) {
      existing.socketId = options.socketId;
      existing.lastActivityAt = Date.now();
      existing.dimensions = options.dimensions;
      return existing;
    }

    const now = Date.now();
    const session: TerminalSession = {
      id: randomUUID(),
      userId: options.userId,
      terminalName: options.terminalName,
      socketId: options.socketId,
      containerId: "",
      createdAt: now,
      lastActivityAt: now,
      dimensions: options.dimensions,
      status: "creating"
    };
    this.sessions.set(session.id, session);

    try {
      const hostWorkspace = await ensureUserWorkspace(options.userId);
      session.containerId = await dockerManager.createContainer(session.id, hostWorkspace);
      session.status = "ready";
      return session;
    } catch (error) {
      this.sessions.delete(session.id);
      throw error;
    }
  }

  get(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  getOwned(sessionId: string, userId: string): TerminalSession | undefined {
    const session = this.sessions.get(sessionId);
    return session && session.userId === userId ? session : undefined;
  }

  list(): TerminalSession[] {
    return [...this.sessions.values()].filter((session) => session.status !== "closed");
  }

  listForUser(userId: string): TerminalSession[] {
    return this.list().filter((session) => session.userId === userId);
  }

  attachSocket(sessionId: string, userId: string, socketId: string): TerminalSession | undefined {
    const session = this.sessions.get(sessionId);

    if (!session || session.status === "closed" || session.userId !== userId) {
      return undefined;
    }

    session.socketId = socketId;
    session.lastActivityAt = Date.now();
    return session;
  }

  detachSocket(socketId: string): void {
    for (const session of this.sessions.values()) {
      if (session.socketId === socketId) {
        session.socketId = null;
      }
    }
  }

  touch(sessionId: string): void {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.lastActivityAt = Date.now();
    }
  }

  resize(sessionId: string, dimensions: TerminalDimensions): void {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.dimensions = dimensions;
      session.lastActivityAt = Date.now();
    }
  }

  async close(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    session.status = "closed";
    this.sessions.delete(sessionId);
    await dockerManager.stopContainer(session.containerId);
  }

  async closeExpired(): Promise<string[]> {
    const now = Date.now();
    const expired = this.list().filter((session) => {
      const idle = now - session.lastActivityAt > serverConfig.sessionIdleTimeoutMs;
      const tooOld = now - session.createdAt > serverConfig.sessionMaxLifetimeMs;
      return idle || tooOld;
    });

    await Promise.all(expired.map((session) => this.close(session.id)));
    return expired.map((session) => session.id);
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.list().map((session) => this.close(session.id)));
  }
}

export const sessionStore = new SessionStore();
