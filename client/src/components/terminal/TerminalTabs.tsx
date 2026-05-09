import { Plus, X } from "lucide-react";
import type { TerminalSession } from "../../types";

interface TerminalTabsProps {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onCreate: () => void;
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
}

export function TerminalTabs({ sessions, activeSessionId, onCreate, onSelect, onClose }: TerminalTabsProps) {
  return (
    <div className="flex h-10 min-w-0 items-center border-b border-ink-700 bg-ink-900">
      <div className="flex min-w-0 flex-1 overflow-x-auto">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            className={`tab ${session.id === activeSessionId ? "active" : ""}`}
            onClick={() => onSelect(session.id)}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${session.connected ? "bg-accent-green" : "bg-accent-amber"}`} />
            <span className="truncate">{session.title}</span>
            <span
              className="close-chip"
              role="button"
              tabIndex={0}
              title="Close terminal"
              onClick={(event) => {
                event.stopPropagation();
                onClose(session.id);
              }}
            >
              <X size={13} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      <button className="icon-button mx-2" type="button" title="New terminal" onClick={onCreate}>
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}