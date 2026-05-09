# NebulaShell

NebulaShell is a browser-based Linux workspace with login, Docker-isolated terminal sessions, persistent `/workspace` files, terminal history replay, and a browser file editor.

## Features

- React + TypeScript + Tailwind UI
- xterm.js terminal streamed over Socket.IO
- Express backend with Docker and PTY management
- One sandboxed Docker container per active terminal
- Per-user persisted files and terminal history
- Monaco file editor with upload/download support
- Basic container CPU/memory monitoring

## Quick Start

Requirements: Node.js 20+, npm 10+, and Docker running.

```bash
npm install
npm run docker:build
npm run dev
```

Open `http://localhost:5173/`. The API server runs on `http://localhost:3001/`.

## Create A User

The UI is login-only, so create the first local user through the API:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"secret123"}'
```

Then sign in with `demo` / `secret123`.

## Commands

```bash
npm run dev          # Start server and client
npm run typecheck    # Typecheck both workspaces
npm run build        # Build server and client
npm run docker:build # Build the sandbox image
npm run start        # Start the built server
```

## Project Layout

```text
client/               React, Vite, xterm, Monaco
server/               Express, Socket.IO, PTY, Docker, auth
docker/base-image/    Ubuntu sandbox image
docs/                 API, architecture, and security notes
```

## Persistence

Runtime data is stored under `server/data` and ignored by git:

```text
server/data/users.json
server/data/workspaces/<userId>/
server/data/history/<userId>/<terminalName>.log
```

## Environment

Copy `.env.example` to `.env` if you need custom ports, Docker limits, auth settings, or persistence paths.

Important production settings:

- Set a strong `JWT_SECRET`.
- Serve over HTTPS.
- Set `AUTH_COOKIE_SECURE=true` behind HTTPS.
- Add rate limits and user quotas before public deployment.

## Scaling

NebulaShell is ready for local use and small single-host deployments. It is not horizontally scalable yet because active PTYs, Docker containers, sessions, and workspace files are tied to one server.

For SaaS-scale deployment, move users/session metadata to Postgres or Supabase, add Redis for Socket.IO coordination, use shared workspace storage, and run containers through worker nodes or an orchestrator.
