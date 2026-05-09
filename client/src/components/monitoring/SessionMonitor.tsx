import { Activity, Cpu, Database } from "lucide-react";
import { useEffect, useState } from "react";
import { listSessions } from "../../services/api";
import type { SessionStats } from "../../types";

export function SessionMonitor() {
  const [sessions, setSessions] = useState<SessionStats[]>([]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const nextSessions = await listSessions();

        if (active) {
          setSessions(nextSessions);
        }
      } catch {
        if (active) {
          setSessions([]);
        }
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const activeCount = sessions.filter((session) => session.status === "ready").length;

  return (
    <section className="border-t border-ink-700 bg-ink-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-ink-300">Monitoring</span>
        <span className="rounded border border-ink-700 px-2 py-0.5 text-xs text-ink-300">{activeCount} active</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="metric">
          <Activity size={14} aria-hidden="true" />
          <span>{sessions.length}</span>
        </div>
        <div className="metric">
          <Cpu size={14} aria-hidden="true" />
          <span>{sessions[0]?.stats?.cpuPercent ?? "0%"}</span>
        </div>
        <div className="metric">
          <Database size={14} aria-hidden="true" />
          <span>{sessions[0]?.stats?.memoryPercent ?? "0%"}</span>
        </div>
      </div>
    </section>
  );
}