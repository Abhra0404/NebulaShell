import { Activity, CheckCircle2, Cpu, Database, Files, History, Lock, Server, ShieldCheck, Terminal } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const metrics = [
  { label: "Workspace", value: "Persistent", icon: Database },
  { label: "Runtime", value: "Docker", icon: Server },
  { label: "Sessions", value: "Resumable", icon: History }
];

const capabilities = [
  {
    title: "Isolated execution",
    body: "Each sign-in opens Docker-backed terminals with scoped file access and predictable runtime boundaries.",
    icon: ShieldCheck
  },
  {
    title: "Saved workspaces",
    body: "Files created under /workspace stay attached to the account and come back in the next session.",
    icon: Files
  },
  {
    title: "Terminal continuity",
    body: "Recent terminal output is replayed so the next login starts with the same working context.",
    icon: Terminal
  }
];

const workflow = ["Sign in", "Open sandbox", "Code in terminal", "Return later"];

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await login(username, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-screen overflow-auto bg-ink-950 text-ink-100">
      <header className="sticky top-0 z-10 border-b border-ink-700 bg-ink-950/95 px-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-ink-700 bg-ink-850 text-accent-cyan">
              <Server size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">NebulaShell</p>
              <p className="hidden truncate text-xs text-ink-500 sm:block">Persistent cloud-style development sandbox</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-ink-300 sm:flex">
            <span className="rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1">Docker runtime</span>
            <span className="rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1">Account workspaces</span>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-ink-700 px-5 py-8 sm:px-8 lg:py-12">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
            <div className="space-y-7">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-ink-700 bg-ink-900 px-3 py-1 text-xs font-medium text-accent-cyan">
                  <Activity size={14} aria-hidden="true" />
                  Browser terminal platform
                </div>
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-ink-100 sm:text-5xl">NebulaShell</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                  A secure Linux workspace that keeps terminal history and project files ready whenever the user signs back in.
                </p>
              </div>

              <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
                {metrics.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-md border border-ink-700 bg-ink-900 p-4">
                    <div className="mb-3 flex items-center justify-between text-ink-500">
                      <span className="text-xs uppercase">{label}</span>
                      <Icon size={15} aria-hidden="true" />
                    </div>
                    <p className="text-lg font-semibold text-ink-100">{value}</p>
                  </div>
                ))}
              </div>

              <div className="max-w-4xl rounded-md border border-ink-700 bg-[#0d0f10] shadow-2xl">
                <div className="flex h-10 items-center justify-between border-b border-ink-700 px-3 text-xs text-ink-500">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} aria-hidden="true" />
                    <span>/workspace</span>
                  </div>
                  <span className="rounded border border-ink-700 px-2 py-0.5 text-ink-300">live sandbox</span>
                </div>
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_230px]">
                  <div className="space-y-2 p-4 font-mono text-xs text-ink-300 sm:text-sm">
                    <p>
                      <span className="text-accent-green">sandbox@nebulashell</span>:<span className="text-accent-cyan">/workspace</span>$ ls
                    </p>
                    <p className="text-ink-500">api main.cpp notebooks package.json saved.txt</p>
                    <p>
                      <span className="text-accent-green">sandbox@nebulashell</span>:<span className="text-accent-cyan">/workspace</span>$ python3 api/app.py
                    </p>
                    <p className="text-ink-100">Server ready on port 8000</p>
                    <p>
                      <span className="text-accent-green">sandbox@nebulashell</span>:<span className="text-accent-cyan">/workspace</span>$ g++ -std=c++20 main.cpp -o main && ./main
                    </p>
                    <p className="text-ink-100">Build passed</p>
                  </div>
                  <div className="border-t border-ink-700 p-4 lg:border-l lg:border-t-0">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink-300">
                      <Cpu size={14} aria-hidden="true" />
                      Session health
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="mb-1 flex justify-between text-ink-500"><span>CPU</span><span>12%</span></div>
                        <div className="h-1.5 rounded bg-ink-800"><div className="h-1.5 w-[12%] rounded bg-accent-green" /></div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-ink-500"><span>Memory</span><span>256 MB</span></div>
                        <div className="h-1.5 rounded bg-ink-800"><div className="h-1.5 w-1/2 rounded bg-accent-cyan" /></div>
                      </div>
                      <div className="flex items-center gap-2 text-ink-300">
                        <CheckCircle2 size={14} className="text-accent-green" aria-hidden="true" />
                        Files synced to account
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-md border border-ink-700 bg-ink-900 p-5 shadow-xl lg:sticky lg:top-20">
              <form onSubmit={(event) => void submit(event)} className="space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lock size={16} aria-hidden="true" />
                    Sign in
                  </div>
                  <p className="text-xs text-ink-400">Use your NebulaShell account to continue.</p>
                </div>

                <label className="block space-y-1 text-xs text-ink-300">
                  <span>Username</span>
                  <input
                    className="w-full rounded border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-accent-cyan"
                    type="text"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={32}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </label>

                <label className="block space-y-1 text-xs text-ink-300">
                  <span>Password</span>
                  <input
                    className="w-full rounded border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-accent-cyan"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>

                {error ? <p className="text-xs text-accent-red">{error}</p> : null}

                <button type="submit" disabled={busy} className="primary-button h-9 w-full justify-center">
                  {busy ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-5 border-t border-ink-700 pt-4 text-xs text-ink-500">
                <p>Access is limited to existing accounts.</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-b border-ink-700 bg-ink-900 px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase text-accent-cyan">Built for repeated work</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink-100">A workspace that behaves like a product, not a disposable shell.</h2>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {capabilities.map(({ title, body, icon: Icon }) => (
                <article key={title} className="rounded-md border border-ink-700 bg-ink-950 p-5">
                  <Icon size={18} className="mb-4 text-accent-green" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-300">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase text-accent-cyan">Operating flow</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink-100">A cleaner path back into work.</h2>
                <p className="mt-3 text-sm leading-6 text-ink-300">The login page stays focused: no sign-up sprawl, no marketing detours, just the context a returning user needs.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {workflow.map((step, index) => (
                  <div key={step} className="rounded-md border border-ink-700 bg-ink-900 p-4">
                    <div className="mb-4 grid h-7 w-7 place-items-center rounded border border-ink-700 bg-ink-850 text-xs text-accent-cyan">{index + 1}</div>
                    <p className="text-sm font-medium text-ink-100">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
