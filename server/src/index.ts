import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import http from "node:http";
import { serverConfig } from "./config.js";
import { authRoutes } from "./routes/authRoutes.js";
import { fileRoutes } from "./routes/fileRoutes.js";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { ptyManager } from "./pty/ptyManager.js";
import { sessionStore } from "./sessions/sessionStore.js";
import { ensureDataRoot } from "./persistence/userPaths.js";
import { registerTerminalGateway } from "./websocket/terminalGateway.js";

await ensureDataRoot();

const app = express();
const httpServer = http.createServer(app);

app.use(cors({ origin: serverConfig.clientOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.get("/health", (_request, response) => response.json({ ok: true }));
app.use("/api", authRoutes);
app.use("/api", fileRoutes);
app.use("/api", sessionRoutes);
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  response.status(400).json({ error: message });
});

registerTerminalGateway(httpServer);

const cleanupTimer = setInterval(() => {
  void sessionStore.closeExpired().then((closedSessionIds) => {
    closedSessionIds.forEach((sessionId) => ptyManager.close(sessionId));
  });
}, serverConfig.cleanupIntervalMs);

async function shutdown(signal: string): Promise<void> {
  clearInterval(cleanupTimer);
  ptyManager.closeAll();
  await sessionStore.closeAll();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
  console.log(`Received ${signal}; cleaned up active terminal containers.`);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

httpServer.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${serverConfig.port} is already in use. Stop the existing NebulaShell server or set PORT to a different value.`);
    process.exit(1);
  }

  throw error;
});

httpServer.listen(serverConfig.port, () => {
  console.log(`NebulaShell server listening on http://localhost:${serverConfig.port}`);
});
