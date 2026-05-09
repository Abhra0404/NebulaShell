import { EventEmitter } from "node:events";
import pty, { type IPty } from "@homebridge/node-pty-prebuilt-multiarch";
import { serverConfig } from "../config.js";
import { dockerManager } from "../docker/dockerManager.js";
import type { TerminalSession } from "../sessions/sessionStore.js";

interface PtyEvents {
  data: [string];
  exit: [{ exitCode: number; signal?: number }];
}

class TypedEmitter extends EventEmitter {
  emit<EventName extends keyof PtyEvents>(eventName: EventName, ...args: PtyEvents[EventName]): boolean {
    return super.emit(eventName, ...args);
  }

  on<EventName extends keyof PtyEvents>(eventName: EventName, listener: (...args: PtyEvents[EventName]) => void): this {
    return super.on(eventName, listener);
  }

  off<EventName extends keyof PtyEvents>(eventName: EventName, listener: (...args: PtyEvents[EventName]) => void): this {
    return super.off(eventName, listener);
  }
}

class TerminalPty extends TypedEmitter {
  private readonly process: IPty;

  constructor(session: TerminalSession) {
    super();
    const dockerAttachCommand = [
      "exec",
      shellQuote(dockerManager.getDockerCommand()),
      "exec",
      "-it",
      "--workdir",
      shellQuote(serverConfig.workspaceDir),
      shellQuote(session.containerId),
      shellQuote(serverConfig.shell)
    ].join(" ");

    try {
      this.process = pty.spawn(
        serverConfig.hostShell,
        ["-lc", dockerAttachCommand],
        {
          name: "xterm-256color",
          cols: session.dimensions.cols,
          rows: session.dimensions.rows,
          cwd: process.cwd(),
          env: {
            ...process.env,
            TERM: "xterm-256color"
          }
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to spawn Docker PTY.";
      throw new Error(`Unable to attach terminal PTY through ${serverConfig.hostShell}: ${message}`);
    }

    this.process.onData((data) => this.emit("data", data));
    this.process.onExit(({ exitCode, signal }) => this.emit("exit", { exitCode, signal }));
  }

  write(data: string): void {
    this.process.write(data);
  }

  resize(cols: number, rows: number): void {
    this.process.resize(cols, rows);
  }

  kill(): void {
    this.process.kill();
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export class PtyManager {
  private readonly terminals = new Map<string, TerminalPty>();

  ensure(session: TerminalSession): TerminalPty {
    const existing = this.terminals.get(session.id);

    if (existing) {
      return existing;
    }

    const terminal = new TerminalPty(session);
    terminal.on("exit", () => this.terminals.delete(session.id));
    this.terminals.set(session.id, terminal);
    return terminal;
  }

  get(sessionId: string): TerminalPty | undefined {
    return this.terminals.get(sessionId);
  }

  close(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    terminal?.kill();
    this.terminals.delete(sessionId);
  }

  closeAll(): void {
    for (const sessionId of this.terminals.keys()) {
      this.close(sessionId);
    }
  }
}

export const ptyManager = new PtyManager();