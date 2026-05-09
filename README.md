# NebulaShell

NebulaShell is a Docker-backed browser Linux terminal emulator. It follows the architecture in [plan.md](plan.md): React and xterm in the browser, Socket.IO for realtime terminal streams, Express on the backend, a Node PTY bridge for shell control, and one isolated Docker container per terminal session.

## Implemented Scope

- Browser terminal UI with xterm and ANSI support
- Realtime Socket.IO events for create, input, output, resize, close, and reconnect
- Express API server with health, file, upload, download, and session monitoring endpoints
- PTY bridge into `docker exec -it <container> /bin/bash`
- Docker manager that creates one sandboxed container per terminal session
- Non-root base image with Ubuntu, Bash, Node.js, Python, Git, editors, and `/workspace`
- Multi-tab terminal sessions with local reconnect persistence
- Browser file explorer, Monaco file editor, upload/download, create/delete
- Container CPU/RAM stats surfaced in the UI
- Idle and max-lifetime cleanup for active containers

## Requirements

- Node.js 20+
- npm 10+
- Docker installed and running

## Run Locally

```bash
npm install
npm run docker:build
npm run dev
```

Open `http://localhost:5173/`.

The server listens on `http://localhost:3001/` by default.

## Build

```bash
npm run build
```

## Project Layout

```text
client/               React + TypeScript + xterm + Monaco
server/               Express + Socket.IO + node-pty + Docker lifecycle
docker/base-image/    Ubuntu sandbox image used for terminal sessions
docs/                 Architecture, API, and security notes
plan.md               Source implementation plan
```

## Environment

Copy [.env.example](.env.example) and tune limits/origins as needed. The default image name is `nebulashell-base:latest`.

On macOS, Docker Desktop's CLI may fail when spawned directly by PTY libraries. NebulaShell avoids that by spawning `HOST_SHELL` and running `exec docker ...` inside it. If terminal creation still shows `posix_spawnp failed`, confirm `HOST_SHELL` points to an executable shell such as `/bin/sh` and set `CONTAINER_CLI` to the absolute Docker path from `command -v docker`.
