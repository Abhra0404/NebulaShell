import { accessSync, constants } from "node:fs";
import path from "node:path";

const fallbackSearchPaths = ["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin", "/bin", "/Applications/Docker.app/Contents/Resources/bin"];

function isExecutable(filePath: string): boolean {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveDockerCommand(command: string): string {
  if (command.includes("/")) {
    return command;
  }

  const searchPaths = [...new Set([...(process.env.PATH ?? "").split(path.delimiter), ...fallbackSearchPaths].filter(Boolean))];

  for (const searchPath of searchPaths) {
    const candidate = path.join(searchPath, command);

    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  return command;
}

export function dockerPathHelp(command: string): string {
  return `Docker CLI '${command}' was not found. Install Docker Desktop or set CONTAINER_CLI to an absolute docker executable path such as /usr/local/bin/docker.`;
}