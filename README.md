# NebulaShell

A browser-based Linux workspace for running isolated terminal sessions, editing files, and returning to saved work without leaving the browser.

NebulaShell combines a React workspace UI, Socket.IO terminal streaming, an Express control plane, and Docker-backed Linux sandboxes. Each signed-in user gets persistent files under `/workspace` and terminal history that can be replayed across sessions.

## Highlights

- Authenticated browser workspace
- Docker-isolated Linux terminal sessions
- xterm.js terminal streaming over Socket.IO
- Monaco-powered file editing
- Upload, download, create, save, and delete file operations
- Per-user persisted workspace directories
- Terminal history replay by user and terminal name
- Basic CPU and memory visibility for active containers

## How It Works

```text
React client
  -> REST + Socket.IO
Express server
  -> auth, file APIs, session manager, PTY bridge
Docker host
  -> one sandbox container per active terminal
server/data
  -> users, workspaces, and terminal history
```

## Tech Stack

| Area | Tools |
| --- | --- |
| Client | React, TypeScript, Vite, Tailwind CSS |
| Terminal | xterm.js, Socket.IO |
| Editor | Monaco Editor |
| Server | Node.js, Express, Socket.IO |
| Sandbox | Docker, Ubuntu base image, PTY bridge |
| Persistence | Local `server/data` directory |
| Auth | bcrypt, httpOnly JWT cookie |

## Commands

```bash
npm install          # Install workspace dependencies
npm run docker:build # Build the sandbox image
npm run dev          # Start client and server
npm run typecheck    # Typecheck both workspaces
npm run build        # Build server and client
npm run start        # Start the built server
```

The client runs at `http://localhost:5173/` and the API server runs at `http://localhost:3001/`.

## First Local User

The landing page is login-only. Create a local user through the API before signing in:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"secret123"}'
```

## Project Structure

```text
client/               React app and browser workspace UI
server/               Express API, auth, sessions, PTY, Docker control
docker/base-image/    Ubuntu image used for terminal containers
docs/                 API, architecture, and security notes
```

## Persistent Data

Local runtime data is written to `server/data` and ignored by git.

```text
server/data/users.json
server/data/workspaces/<userId>/
server/data/history/<userId>/<terminalName>.log
```

## Sandbox Image

The base image includes Ubuntu, Bash, Git, Node.js, npm, Python 3, pip, C/C++ build tools, ripgrep, nano, less, and vim.

Example commands inside a NebulaShell terminal:

```bash
python3 app.py
g++ -std=c++20 main.cpp -o main && ./main
npm install
git status
```

## Configuration

Use `.env.example` as the reference for ports, Docker limits, auth settings, and persistence paths.

Important production changes:

- Replace the development `JWT_SECRET`.
- Serve over HTTPS.
- Set `AUTH_COOKIE_SECURE=true`.
- Add rate limits, quotas, backups, and operational monitoring before public deployment.

## Status

NebulaShell is currently designed for local use and small single-host deployments. Active PTYs, Docker containers, sessions, and workspace files are tied to the server that runs them.
