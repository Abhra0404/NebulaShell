import fs from "node:fs/promises";
import { serverConfig } from "../config.js";
import { ensureUserHistoryDir, isSafeTerminalName, userHistoryDir, userHistoryFile } from "./userPaths.js";

export interface SavedTerminal {
  name: string;
  size: number;
  updatedAt: string;
}

class HistoryStore {
  async list(userId: string): Promise<SavedTerminal[]> {
    const dir = userHistoryDir(userId);

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const records: SavedTerminal[] = [];

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".log")) {
          continue;
        }

        const name = entry.name.slice(0, -4);

        if (!isSafeTerminalName(name)) {
          continue;
        }

        const stat = await fs.stat(userHistoryFile(userId, name));
        records.push({ name, size: stat.size, updatedAt: stat.mtime.toISOString() });
      }

      return records.sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  async read(userId: string, terminalName: string): Promise<string> {
    if (!isSafeTerminalName(terminalName)) {
      return "";
    }

    try {
      return await fs.readFile(userHistoryFile(userId, terminalName), "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return "";
      }

      throw error;
    }
  }

  async append(userId: string, terminalName: string, chunk: string): Promise<void> {
    if (!isSafeTerminalName(terminalName) || !chunk) {
      return;
    }

    await ensureUserHistoryDir(userId);
    const file = userHistoryFile(userId, terminalName);
    await fs.appendFile(file, chunk, "utf-8");

    const stat = await fs.stat(file).catch(() => null);

    if (stat && stat.size > serverConfig.historyMaxBytes) {
      const buffer = await fs.readFile(file);
      const trimmed = buffer.subarray(buffer.length - serverConfig.historyMaxBytes);
      await fs.writeFile(file, trimmed);
    }
  }

  async clear(userId: string, terminalName: string): Promise<void> {
    if (!isSafeTerminalName(terminalName)) {
      return;
    }

    await fs.rm(userHistoryFile(userId, terminalName), { force: true });
  }
}

export const historyStore = new HistoryStore();
