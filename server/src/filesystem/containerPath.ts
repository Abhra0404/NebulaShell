import path from "node:path";
import { serverConfig } from "../config.js";

export function resolveWorkspacePath(inputPath: string | undefined): string {
  const rawPath = inputPath?.trim() || serverConfig.workspaceDir;
  const absolutePath = rawPath.startsWith("/")
    ? path.posix.normalize(rawPath)
    : path.posix.normalize(path.posix.join(serverConfig.workspaceDir, rawPath));

  if (absolutePath !== serverConfig.workspaceDir && !absolutePath.startsWith(`${serverConfig.workspaceDir}/`)) {
    throw new Error("Path escapes the workspace root.");
  }

  return absolutePath;
}