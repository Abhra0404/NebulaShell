import { Router, type Response } from "express";
import { z } from "zod";
import { serverConfig } from "../config.js";
import { signAuthToken } from "../auth/jwt.js";
import { requireAuth, type AuthedRequest } from "../auth/middleware.js";
import { toPublic, userStore } from "../auth/userStore.js";
import { ensureUserHistoryDir, ensureUserWorkspace } from "../persistence/userPaths.js";

const credentialsSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256)
});

const router = Router();

function setAuthCookie(response: Response, token: string): void {
  response.cookie(serverConfig.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: serverConfig.cookieSecure,
    maxAge: serverConfig.jwtTtlSeconds * 1000,
    path: "/"
  });
}

router.post("/auth/register", async (request, response, next) => {
  try {
    const body = credentialsSchema.parse(request.body);
    const user = await userStore.register(body.username, body.password);
    await ensureUserWorkspace(user.id);
    await ensureUserHistoryDir(user.id);
    const token = signAuthToken({ sub: user.id, username: user.username });
    setAuthCookie(response, token);
    response.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (request, response, next) => {
  try {
    const body = credentialsSchema.parse(request.body);
    const user = await userStore.verify(body.username, body.password);
    await ensureUserWorkspace(user.id);
    await ensureUserHistoryDir(user.id);
    const token = signAuthToken({ sub: user.id, username: user.username });
    setAuthCookie(response, token);
    response.json({ user: toPublic(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", (_request, response) => {
  response.clearCookie(serverConfig.cookieName, { path: "/" });
  response.status(204).end();
});

router.get("/auth/me", requireAuth, async (request: AuthedRequest, response, next) => {
  try {
    const user = await userStore.findById(request.user!.sub);

    if (!user) {
      response.status(401).json({ error: "User not found." });
      return;
    }

    response.json({ user: toPublic(user) });
  } catch (error) {
    next(error);
  }
});

export const authRoutes = router;
