import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../auth/middleware.js";
import { dockerManager } from "../docker/dockerManager.js";
import { historyStore } from "../persistence/historyStore.js";
import { sessionStore } from "../sessions/sessionStore.js";

export const sessionRoutes = Router();
sessionRoutes.use(requireAuth);

sessionRoutes.get("/sessions", async (request: AuthedRequest, response, next) => {
  try {
    const sessions = await Promise.all(
      sessionStore.listForUser(request.user!.sub).map(async (session) => ({
        id: session.id,
        name: session.terminalName,
        containerId: session.containerId,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        status: session.status,
        stats: await dockerManager.getStats(session.containerId)
      }))
    );

    response.json({ sessions });
  } catch (error) {
    next(error);
  }
});

sessionRoutes.get("/terminals", async (request: AuthedRequest, response, next) => {
  try {
    const terminals = await historyStore.list(request.user!.sub);
    response.json({ terminals });
  } catch (error) {
    next(error);
  }
});
