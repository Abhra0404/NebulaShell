import fs from "node:fs/promises";
import path from "node:path";
import { serverConfig } from "../config.js";

export function usersFile(): string {
  return path.join(serverConfig.dataRoot, "users.json");
}

export function userWorkspaceDir(userId: string): string {
  return path.join(serverConfig.dataRoot, "workspaces", userId);
}

export function userHistoryDir(userId: string): string {
  return path.join(serverConfig.dataRoot, "history", userId);
}

export function userHistoryFile(userId: string, terminalName: string): string {
  return path.join(userHistoryDir(userId), `${terminalName}.log`);
}

export function isSafeTerminalName(name: string): boolean {
  return /^[a-zA-Z0-9._-]{1,64}$/.test(name);
}

export async function ensureUserWorkspace(userId: string): Promise<string> {
  const dir = userWorkspaceDir(userId);
  await fs.mkdir(dir, { recursive: true });
  // Allow the in-container `sandbox` user to read/write the bind mount regardless of host uid.
  await fs.chmod(dir, 0o777).catch(() => undefined);
  return dir;
}

export async function ensureUserHistoryDir(userId: string): Promise<string> {
  const dir = userHistoryDir(userId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function ensureDataRoot(): Promise<void> {
  await fs.mkdir(serverConfig.dataRoot, { recursive: true });
}
