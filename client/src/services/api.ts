import type { AuthUser, FileEntry, SavedTerminal, SessionStats } from "../types";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include", ...init });
  } catch (networkError) {
    const reason = networkError instanceof Error ? networkError.message : "network error";
    throw new ApiError(`Cannot reach NebulaShell server (${reason}). Is the backend running?`, 0);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(payload.error ?? response.statusText, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export { ApiError };

export async function login(username: string, password: string): Promise<AuthUser> {
  const payload = await request<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return payload.user;
}

export async function register(username: string, password: string): Promise<AuthUser> {
  const payload = await request<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return payload.user;
}

export async function logout(): Promise<void> {
  await request<void>("/api/auth/logout", { method: "POST" });
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const payload = await request<{ user: AuthUser }>("/api/auth/me");
    return payload.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function listFiles(sessionId: string, path: string): Promise<FileEntry[]> {
  const query = new URLSearchParams({ sessionId, path });
  const payload = await request<{ entries: FileEntry[] }>(`/api/files?${query}`);
  return payload.entries;
}

export async function readFile(sessionId: string, path: string): Promise<string> {
  const query = new URLSearchParams({ sessionId, path });
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/file?${query}`, { credentials: "include" });
  } catch (networkError) {
    const reason = networkError instanceof Error ? networkError.message : "network error";
    throw new ApiError(`Cannot reach NebulaShell server (${reason}).`, 0);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(payload.error ?? response.statusText, response.status);
  }

  return response.text();
}

export async function saveFile(sessionId: string, path: string, content: string): Promise<void> {
  await request<void>("/api/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, path, content })
  });
}

export async function createDirectory(sessionId: string, path: string): Promise<void> {
  await request<void>("/api/directory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, path })
  });
}

export async function deletePath(sessionId: string, path: string): Promise<void> {
  const query = new URLSearchParams({ sessionId, path });
  await request<void>(`/api/file?${query}`, { method: "DELETE" });
}

export async function uploadFile(sessionId: string, path: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("sessionId", sessionId);
  form.append("path", path);
  form.append("file", file);
  await request<void>("/api/upload", { method: "POST", body: form });
}

export function downloadUrl(sessionId: string, path: string): string {
  const query = new URLSearchParams({ sessionId, path });
  return `${API_BASE_URL}/api/download?${query}`;
}

export async function listSessions(): Promise<SessionStats[]> {
  const payload = await request<{ sessions: SessionStats[] }>("/api/sessions");
  return payload.sessions;
}

export async function listSavedTerminals(): Promise<SavedTerminal[]> {
  const payload = await request<{ terminals: SavedTerminal[] }>("/api/terminals");
  return payload.terminals;
}
