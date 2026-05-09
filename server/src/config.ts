import path from "node:path";
import { resolveDockerCommand } from "./docker/dockerBinary.js";

const dataRootDefault = path.resolve(process.cwd(), "data");

export const serverConfig = {
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  dockerCommand: resolveDockerCommand(process.env.CONTAINER_CLI ?? "docker"),
  dockerImage: process.env.NEBULASHELL_IMAGE ?? "nebulashell-base:latest",
  sessionIdleTimeoutMs: Number(process.env.SESSION_IDLE_TIMEOUT_MS ?? 30 * 60 * 1000),
  sessionMaxLifetimeMs: Number(process.env.SESSION_MAX_LIFETIME_MS ?? 4 * 60 * 60 * 1000),
  cleanupIntervalMs: Number(process.env.CLEANUP_INTERVAL_MS ?? 60 * 1000),
  containerMemory: process.env.CONTAINER_MEMORY ?? "512m",
  containerCpu: process.env.CONTAINER_CPUS ?? "1.0",
  containerPidsLimit: process.env.CONTAINER_PIDS_LIMIT ?? "256",
  workspaceDir: process.env.CONTAINER_WORKDIR ?? "/workspace",
  hostShell: process.env.HOST_SHELL ?? "/bin/sh",
  shell: process.env.CONTAINER_SHELL ?? "/bin/bash",
  dataRoot: process.env.DATA_ROOT ? path.resolve(process.env.DATA_ROOT) : dataRootDefault,
  jwtSecret: process.env.JWT_SECRET ?? "nebulashell-dev-secret-change-me",
  jwtTtlSeconds: Number(process.env.JWT_TTL_SECONDS ?? 7 * 24 * 60 * 60),
  cookieName: process.env.AUTH_COOKIE_NAME ?? "nebulashell.token",
  cookieSecure: (process.env.AUTH_COOKIE_SECURE ?? "false").toLowerCase() === "true",
  historyMaxBytes: Number(process.env.HISTORY_MAX_BYTES ?? 256 * 1024)
};