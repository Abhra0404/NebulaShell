import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { listSavedTerminals } from "../services/api";
import { createSocket } from "../services/socket";
import type { RemoteSession, SavedTerminal, TerminalSession } from "../types";

const STORAGE_KEY_PREFIX = "nebulashell.sessionIds.";

type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

function toTerminalSession(remote: RemoteSession, existing: TerminalSession | undefined, history: string): TerminalSession {
  return {
    ...remote,
    title: remote.name,
    buffer: history || existing?.buffer || "",
    connected: true
  };
}

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function loadStoredSessionIds(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveStoredSessionIds(userId: string, sessionIds: string[]): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(sessionIds));
}

export function useTerminalSessions(userId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [sessions, setSessions] = useState<Record<string, TerminalSession>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedTerminals, setSavedTerminals] = useState<SavedTerminal[]>([]);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [error, setError] = useState<string | null>(null);
  const restoredRef = useRef<Set<string>>(new Set());

  const sessionList = useMemo(() => Object.values(sessions), [sessions]);

  const persistSessions = useCallback(
    (nextSessions: Record<string, TerminalSession>) => {
      if (userId) {
        saveStoredSessionIds(userId, Object.keys(nextSessions));
      }
    },
    [userId]
  );

  const upsertSession = useCallback((remote: RemoteSession, history = "") => {
    setSessions((current) => {
      const next = {
        ...current,
        [remote.id]: toTerminalSession(remote, current[remote.id], history)
      };
      persistSessions(next);
      return next;
    });
    setActiveSessionId((current) => current ?? remote.id);
  }, [persistSessions]);

  useEffect(() => {
    if (!userId) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSessions({});
      setActiveSessionId(null);
      setSavedTerminals([]);
      setConnectionState("disconnected");
      restoredRef.current = new Set();
      return;
    }

    restoredRef.current = new Set();
    const socket = createSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      setError(null);
      const storedSessionIds = loadStoredSessionIds(userId);

      for (const sessionId of storedSessionIds) {
        socket.emit("terminal:reconnect", { sessionId }, (response: Ack<{ session: RemoteSession; history: string }>) => {
          if (response.ok) {
            restoredRef.current.add(response.data.session.name);
            upsertSession(response.data.session, response.data.history);
          }
        });
      }
    });

    socket.on("disconnect", () => setConnectionState("disconnected"));
    socket.on("connect_error", (socketError) => setError(socketError.message));

    socket.on("terminal:saved", ({ terminals }: { terminals: SavedTerminal[] }) => {
      setSavedTerminals(terminals);
    });

    socket.on("terminal:output", ({ sessionId, data }: { sessionId: string; data: string }) => {
      setSessions((current) => {
        const session = current[sessionId];

        if (!session) {
          return current;
        }

        return {
          ...current,
          [sessionId]: {
            ...session,
            buffer: `${session.buffer}${data}`,
            lastActivityAt: Date.now()
          }
        };
      });
    });

    socket.on("terminal:created", ({ session }: { session: RemoteSession }) => upsertSession(session));
    socket.on("terminal:closed", ({ sessionId }: { sessionId: string }) => {
      setSessions((current) => {
        const next = { ...current };
        delete next[sessionId];
        persistSessions(next);
        return next;
      });
      setActiveSessionId((current) => (current === sessionId ? null : current));
    });
    socket.on("terminal:error", ({ message }: { message: string }) => setError(message));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [persistSessions, upsertSession, userId]);

  useEffect(() => {
    if (activeSessionId || sessionList.length === 0) {
      return;
    }

    setActiveSessionId(sessionList[0].id);
  }, [activeSessionId, sessionList]);

  const createSession = useCallback((options: { name?: string; cols?: number; rows?: number } = {}) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setError("Server connection is not ready.");
      return;
    }

    const payload = { cols: options.cols ?? 100, rows: options.rows ?? 30, ...(options.name ? { name: options.name } : {}) };
    socket.emit("terminal:create", payload, (response: Ack<{ session: RemoteSession; history: string }>) => {
      if (!response.ok) {
        setError(response.error);
        return;
      }

      restoredRef.current.add(response.data.session.name);
      upsertSession(response.data.session, response.data.history);
      setActiveSessionId(response.data.session.id);
    });
  }, [upsertSession]);

  const sendInput = useCallback((sessionId: string, data: string) => {
    socketRef.current?.emit("terminal:input", { sessionId, data });
  }, []);

  const resizeSession = useCallback((sessionId: string, cols: number, rows: number) => {
    socketRef.current?.emit("terminal:resize", { sessionId, cols, rows });
  }, []);

  const closeSession = useCallback((sessionId: string) => {
    socketRef.current?.emit("terminal:close", { sessionId });
    setSessions((current) => {
      const next = { ...current };
      delete next[sessionId];
      persistSessions(next);
      return next;
    });
    setActiveSessionId((current) => (current === sessionId ? null : current));
  }, [persistSessions]);

  const restoreSavedTerminal = useCallback((name: string) => {
    createSession({ name });
  }, [createSession]);

  // Auto-attach saved terminals once on connect.
  useEffect(() => {
    if (connectionState !== "connected" || savedTerminals.length === 0) {
      return;
    }

    const liveNames = new Set(sessionList.map((session) => session.name));

    for (const terminal of savedTerminals) {
      if (!liveNames.has(terminal.name) && !restoredRef.current.has(terminal.name)) {
        restoredRef.current.add(terminal.name);
        createSession({ name: terminal.name });
      }
    }
  }, [connectionState, createSession, savedTerminals, sessionList]);

  const refreshSavedTerminals = useCallback(async () => {
    try {
      setSavedTerminals(await listSavedTerminals());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void refreshSavedTerminals();
  }, [refreshSavedTerminals, userId]);

  return {
    sessions: sessionList,
    activeSession: activeSessionId ? sessions[activeSessionId] ?? null : null,
    activeSessionId,
    connectionState,
    error,
    savedTerminals,
    createSession: () => createSession(),
    setActiveSessionId,
    sendInput,
    resizeSession,
    closeSession,
    restoreSavedTerminal,
    refreshSavedTerminals
  };
}
