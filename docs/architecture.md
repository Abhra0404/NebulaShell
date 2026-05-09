# Architecture

NebulaShell uses a browser client plus a Node.js server. The browser never executes shell commands directly; it only renders terminal output and forwards keystrokes over Socket.IO.

```text
React client + xterm
        |
        | Socket.IO events
        v
Express HTTP server
        |
        +-- Terminal gateway
        +-- Session store
        +-- PTY manager
        +-- Docker manager
        +-- File system routes
        |
        v
Docker container per session
        |
        v
/bin/bash in /workspace
```

## Runtime Flow

1. The client emits `terminal:create` with terminal dimensions.
2. The server creates a session record.
3. The Docker manager starts a sandbox container from `nebulashell-base:latest`.
4. The PTY manager spawns a host shell that executes `docker exec -it --workdir /workspace <container> /bin/bash` through the Node PTY bridge.
5. PTY output is emitted to the browser as `terminal:output`.
6. Browser keystrokes are emitted as `terminal:input` and written to the PTY.
7. Resize events are forwarded to both node-pty and the session store.
8. Closing a tab kills the PTY and removes the Docker container.

## Reconnects

The client stores known session IDs in `localStorage`. On Socket.IO reconnect, it emits `terminal:reconnect` for each stored session. The server keeps PTY processes alive while the socket is disconnected until idle cleanup closes them.
