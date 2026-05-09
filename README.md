# NebulaShell

NebulaShell is a browser-based Linux workspace with authenticated access, Docker-isolated terminal sessions, persistent user files, terminal history replay, and an in-browser file explorer/editor.

The app is built as a local-first SaaS-style development sandbox: users sign in, open terminal tabs, run commands inside containers, edit files under `/workspace`, and come back later without losing their work.

## Features

- Login-only SaaS landing page for existing accounts
- React + TypeScript workspace UI
- xterm.js browser terminal with Socket.IO streaming
- Monaco-powered file editor
- Docker-backed Linux terminal sessions
- One isolated container per active terminal session
- Per-user persistent `/workspace` bind mount
- Per-user terminal history replay
- File list/read/write/delete/upload/download APIs
- Container CPU and memory stats in the UI
- Lucide-style server favicon

## Architecture

```text
Browser client
React + xterm + Monaco
        |
        | REST + Socket.IO
        v
Node.js server
Express + Socket.IO + PTY manager
        |
        | docker run / docker exec
        v
Docker container
Ubuntu sandbox shell
        |
        | bind mount
        v
server/data/workspaces/<userId>
```

## Requirements

- Node.js 20+
- npm 10+
- Docker installed and running
- macOS, Linux, or another host that can run Docker containers

## Quick Start

Install dependencies, build the sandbox image, and start the client/server stack:

```bash
npm install
npm run docker:build
npm run dev
```

Open:

```text
http://localhost:5173/
```

The backend listens on:

```text
http://localhost:3001/
```

## Create The First User

The UI is login-only. Create an account through the local API, then sign in from the browser:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"secret123"}'
```

Then use `demo` / `secret123` on the landing page.

## Useful Commands

```bash
npm run dev          # Start server and client
npm run typecheck    # Typecheck server and client
npm run build        # Build server and client
npm run docker:build # Build the terminal sandbox image
npm run start        # Start built server
```

## Project Layout

```text
client/               React, Vite, Tailwind, xterm, Monaco
server/               Express, Socket.IO, PTY, Docker lifecycle, auth
docker/base-image/    Ubuntu sandbox image used by terminal sessions
docs/                 Architecture, API, and security notes
plan.md               Local product and engineering plan
```

## Persistence Model

Runtime data is stored under `server/data` by default.

```text
server/data/users.json                    Local user records
server/data/workspaces/<userId>/          Files mounted as /workspace
server/data/history/<userId>/<name>.log   Terminal output history
```

`server/data` is ignored by git.

## Docker Sandbox

The base image includes Ubuntu, Bash, Git, Node.js, npm, Python 3, pip, C/C++ build tools, ripgrep, nano, less, and vim.

Example commands inside a terminal session:

```bash
python3 app.py
g++ -std=c++20 main.cpp -o main && ./main
npm install
git status
```

Each container runs as the non-root `sandbox` user and works in `/workspace`.

## Environment

Copy `.env.example` if you need to customize local settings:

```bash
cp .env.example .env
```

Important variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port, default `3001`. |
| `CLIENT_ORIGIN` | Allowed client origin for CORS and Socket.IO. |
| `CONTAINER_CLI` | Docker command/path. |
| `NEBULASHELL_IMAGE` | Docker image used for terminal containers. |
| `CONTAINER_MEMORY` | Per-container memory limit. |
| `CONTAINER_CPUS` | Per-container CPU limit. |
| `CONTAINER_PIDS_LIMIT` | Per-container PID limit. |
| `DATA_ROOT` | Runtime persistence directory. |
| `JWT_SECRET` | Secret for local auth cookies. Change before sharing the server. |
| `AUTH_COOKIE_SECURE` | Set to `true` behind HTTPS. |
| `HISTORY_MAX_BYTES` | Max saved terminal output per terminal name. |
| `VITE_API_PROXY_TARGET` | Vite dev proxy target. |

## macOS Docker Notes

On macOS, Docker Desktop's CLI may fail when spawned directly by PTY libraries. NebulaShell avoids this by spawning `HOST_SHELL` and running `exec docker ...` inside it.

If terminal creation shows `posix_spawnp failed`:

```bash
command -v docker
```

Then set `CONTAINER_CLI` to that absolute path and ensure `HOST_SHELL` points to an executable shell such as `/bin/sh`.

## Security Notes

Implemented locally:

- httpOnly JWT auth cookie
- bcrypt password hashing
- authenticated REST and Socket.IO access
- per-user session ownership checks
- non-root containers
- container CPU, memory, and PID limits
- dropped Linux capabilities and `no-new-privileges`
- `/workspace` path escape prevention

Before production:

- Set a strong `JWT_SECRET`
- Serve over HTTPS
- Set `AUTH_COOKIE_SECURE=true`
- Add rate limiting
- Add user quotas for terminals, memory, CPU, disk, and lifetime
- Move users/session metadata from JSON/in-memory storage to a database
- Add Redis or another coordination layer before horizontal scaling

## Scaling Status

NebulaShell is ready for local use and small single-host deployments. It is not horizontally scalable yet because active sessions, PTYs, Docker containers, and workspaces are tied to one server.

For SaaS-scale deployment, the next steps are:

- Replace local user JSON with Supabase Auth or Postgres-backed auth
- Store session metadata in Postgres
- Add Redis for Socket.IO coordination
- Use shared workspace storage such as EFS/NFS or object-storage-backed sync
- Move container execution to worker nodes, Docker Swarm, or Kubernetes
- Add quotas, audit logs, backups, and observability

## Troubleshooting

### `Cannot connect to Docker daemon`

Start Docker Desktop or the Docker service, then retry terminal creation.

### `Docker image nebulashell-base:latest is not available`

Build the image:

```bash
npm run docker:build
```

### Browser file API says `Failed to fetch`

Make sure both server and client are running through the root command:

```bash
npm run dev
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3001`.

### Existing containers do not include Dockerfile changes

Rebuild the image and open a new terminal session:

```bash
npm run docker:build
```

## Resume Description

Built NebulaShell, a browser-based Linux workspace using React, TypeScript, Node.js, Socket.IO, PTY integration, and Docker. The application supports authenticated users, isolated multi-session terminals, persistent workspaces, terminal history replay, browser-based file management, and container resource monitoring.
