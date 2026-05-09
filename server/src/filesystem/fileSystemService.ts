import path from "node:path";
import { DockerClient } from "../docker/dockerClient.js";
import { serverConfig } from "../config.js";
import { resolveWorkspacePath } from "./containerPath.js";

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "other";
  size: number;
  updatedAt: string;
}

export class FileSystemService {
  private readonly client = new DockerClient(serverConfig.dockerCommand);

  async list(containerId: string, inputPath?: string): Promise<FileEntry[]> {
    const targetPath = resolveWorkspacePath(inputPath);
    const script = `
const fs = require('fs');
const path = require('path');
const target = process.env.NEBULA_PATH;
const entries = fs.readdirSync(target, { withFileTypes: true }).map((entry) => {
  const fullPath = path.posix.join(target, entry.name);
  const stat = fs.statSync(fullPath);
  return {
    name: entry.name,
    path: fullPath,
    type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
    size: stat.size,
    updatedAt: stat.mtime.toISOString()
  };
});
console.log(JSON.stringify(entries));`;
    const { stdout } = await this.client.exec(["exec", "--env", `NEBULA_PATH=${targetPath}`, containerId, "node", "-e", script]);
    return JSON.parse(stdout) as FileEntry[];
  }

  async read(containerId: string, inputPath: string): Promise<string> {
    const targetPath = resolveWorkspacePath(inputPath);
    const { stdout } = await this.client.exec(["exec", containerId, "cat", targetPath]);
    return stdout;
  }

  async write(containerId: string, inputPath: string, content: Buffer | string): Promise<void> {
    const targetPath = resolveWorkspacePath(inputPath);
    const script = `
const fs = require('fs');
const path = require('path');
const target = process.env.NEBULA_PATH;
fs.mkdirSync(path.dirname(target), { recursive: true });
const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => fs.writeFileSync(target, Buffer.concat(chunks)));`;
    await this.client.exec(["exec", "-i", "--env", `NEBULA_PATH=${targetPath}`, containerId, "node", "-e", script], content);
  }

  async mkdir(containerId: string, inputPath: string): Promise<void> {
    const targetPath = resolveWorkspacePath(inputPath);
    await this.client.exec(["exec", containerId, "mkdir", "-p", targetPath]);
  }

  async remove(containerId: string, inputPath: string): Promise<void> {
    const targetPath = resolveWorkspacePath(inputPath);

    if (targetPath === serverConfig.workspaceDir) {
      throw new Error("Cannot delete the workspace root.");
    }

    await this.client.exec(["exec", containerId, "rm", "-rf", targetPath]);
  }

  filename(inputPath: string): string {
    return path.posix.basename(resolveWorkspacePath(inputPath));
  }
}

export const fileSystemService = new FileSystemService();