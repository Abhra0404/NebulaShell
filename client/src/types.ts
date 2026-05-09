export interface RemoteSession {
  id: string;
  name: string;
  createdAt: number;
  lastActivityAt: number;
  dimensions: {
    cols: number;
    rows: number;
  };
  status: "creating" | "ready" | "closed";
}

export interface TerminalSession extends RemoteSession {
  title: string;
  buffer: string;
  connected: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "other";
  size: number;
  updatedAt: string;
}

export interface SessionStats {
  id: string;
  name?: string;
  containerId: string;
  createdAt: number;
  lastActivityAt: number;
  status: string;
  stats: null | {
    id: string;
    name: string;
    cpuPercent: string;
    memoryUsage: string;
    memoryPercent: string;
    networkIo: string;
    blockIo: string;
    pids: string;
  };
}

export interface AuthUser {
  id: string;
  username: string;
  createdAt: number;
}

export interface SavedTerminal {
  name: string;
  size: number;
  updatedAt: string;
}