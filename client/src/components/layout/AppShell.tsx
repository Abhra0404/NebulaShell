import { LogOut, Server, Shield, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTerminalSessions } from "../../hooks/useTerminalSessions";
import { FileExplorer } from "../explorer/FileExplorer";
import { SessionMonitor } from "../monitoring/SessionMonitor";
import { TerminalPane } from "../terminal/TerminalPane";
import { TerminalTabs } from "../terminal/TerminalTabs";

export function AppShell() {
  const { user, logout } = useAuth();
  const {
    sessions,
    activeSession,
    activeSessionId,
    connectionState,
    error,
    createSession,
    setActiveSessionId,
    sendInput,
    resizeSession,
    closeSession
  } = useTerminalSessions(user?.id ?? null);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-ink-950 text-ink-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-ink-700 bg-ink-900 px-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-md border border-ink-700 bg-ink-850 text-accent-cyan">
            <Server size={17} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">NebulaShell</h1>
            <p className="truncate text-xs text-ink-300">Persistent Docker-isolated terminals</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-300">
          <div className="hidden items-center gap-2 rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1 sm:flex">
            <span className={`h-2 w-2 rounded-full ${connectionState === "connected" ? "bg-accent-green" : "bg-accent-amber"}`} />
            {connectionState}
          </div>
          <div className="hidden items-center gap-1 rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1 md:flex">
            <Shield size={14} aria-hidden="true" />
            Docker sandbox
          </div>
          {user ? (
            <div className="flex items-center gap-2 rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1">
              <User size={14} aria-hidden="true" />
              <span className="truncate">{user.username}</span>
              <button
                type="button"
                title="Sign out"
                className="ml-1 text-ink-300 hover:text-accent-red"
                onClick={() => void logout()}
              >
                <LogOut size={14} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {error ? <div className="border-b border-accent-red/40 bg-accent-red/10 px-4 py-2 text-sm text-ink-100">{error}</div> : null}

      <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_420px] overflow-hidden xl:grid-cols-[minmax(0,1fr)_430px] xl:grid-rows-1">
        <section className="grid min-h-0 grid-rows-[40px_minmax(0,1fr)_104px]">
          <TerminalTabs
            sessions={sessions}
            activeSessionId={activeSessionId}
            onCreate={() => createSession()}
            onSelect={setActiveSessionId}
            onClose={closeSession}
          />
          <TerminalPane session={activeSession} onInput={sendInput} onResize={resizeSession} />
          <SessionMonitor />
        </section>
        <FileExplorer session={activeSession} />
      </main>
    </div>
  );
}
