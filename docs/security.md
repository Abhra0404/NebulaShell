# Security Notes

The current implementation is suitable for local development and portfolio demonstration. A public deployment should add authentication, quotas, and stronger network controls.

## Already Applied

- One Docker container per terminal session
- Non-root `sandbox` user inside the base image
- No host directory bind mounts
- Container memory limit via `CONTAINER_MEMORY`
- CPU limit via `CONTAINER_CPUS`
- PID limit via `CONTAINER_PIDS_LIMIT`
- `--security-opt no-new-privileges`
- `--cap-drop ALL`
- Idle and max-lifetime session cleanup
- File API path normalization under `/workspace`

## Recommended Before Public Hosting

- Add authentication before allowing terminal creation
- Add per-user session quotas and rate limits
- Run Docker on a dedicated Linux host, not a shared application host
- Consider disabling container network access for untrusted public users
- Add structured audit logs for session creation and cleanup
- Put the server behind a reverse proxy with TLS and WebSocket support
- Run load tests for concurrent PTY and container churn
