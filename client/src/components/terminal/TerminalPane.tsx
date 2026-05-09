import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import type { TerminalSession } from "../../types";

interface TerminalPaneProps {
  session: TerminalSession | null;
  onInput: (sessionId: string, data: string) => void;
  onResize: (sessionId: string, cols: number, rows: number) => void;
}

export function TerminalPane({ session, onInput, onResize }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const writtenLengthRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current || !session) {
      return;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "JetBrains Mono, SFMono-Regular, ui-monospace, monospace",
      fontSize: 13,
      theme: {
        background: "#111314",
        foreground: "#f6f7f8",
        cursor: "#54d6d0",
        selectionBackground: "#3a434b"
      }
    });
    const fitAddon = new FitAddon();
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    writtenLengthRef.current = session.buffer.length;
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    terminal.write(session.buffer);
    fitAddon.fit();
    terminal.focus();
    onResize(session.id, terminal.cols, terminal.rows);

    const inputDisposable = terminal.onData((data) => onInput(session.id, data));
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      onResize(session.id, terminal.cols, terminal.rows);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      inputDisposable.dispose();
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [onInput, onResize, session?.id]);

  useEffect(() => {
    if (!session || !terminalRef.current) {
      return;
    }

    const nextChunk = session.buffer.slice(writtenLengthRef.current);

    if (nextChunk) {
      terminalRef.current.write(nextChunk);
      writtenLengthRef.current = session.buffer.length;
    }
  }, [session]);

  if (!session) {
    return (
      <div className="grid h-full place-items-center bg-ink-950 text-sm text-ink-500">
        <button className="primary-button" type="button" onClick={() => undefined} disabled>
          No active terminal
        </button>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-0 overflow-hidden bg-ink-950" />;
}