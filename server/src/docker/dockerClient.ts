import { execFile, spawn } from "node:child_process";
import type { SpawnOptionsWithoutStdio } from "node:child_process";
import { dockerPathHelp } from "./dockerBinary.js";

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export class DockerCommandError extends Error {
  constructor(
    message: string,
    readonly args: string[],
    readonly stderr: string,
    readonly code: string | number | null | undefined
  ) {
    super(message);
    this.name = "DockerCommandError";
  }
}

export class DockerClient {
  constructor(private readonly dockerCommand: string) {}

  exec(args: string[], input?: Buffer | string): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      const child = execFile(this.dockerCommand, args, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          const errorCode = (error as NodeJS.ErrnoException).code;
          const message = errorCode === "ENOENT" ? dockerPathHelp(this.dockerCommand) : `${this.dockerCommand} ${args.join(" ")} failed`;
          reject(new DockerCommandError(message, args, stderr, errorCode));
          return;
        }

        resolve({ stdout, stderr });
      });

      if (input !== undefined && child.stdin) {
        child.stdin.end(input);
      }
    });
  }

  spawn(args: string[], options: SpawnOptionsWithoutStdio = {}) {
    return spawn(this.dockerCommand, args, options);
  }
}