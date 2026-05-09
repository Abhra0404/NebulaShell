import cookie from "cookie";
import type { NextFunction, Request, Response } from "express";
import type { Socket } from "socket.io";
import { serverConfig } from "../config.js";
import { verifyAuthToken, type AuthTokenPayload } from "./jwt.js";

export interface AuthedRequest extends Request {
  user?: AuthTokenPayload;
}

export function requireAuth(request: AuthedRequest, response: Response, next: NextFunction): void {
  const token = (request.cookies?.[serverConfig.cookieName] as string | undefined) ?? null;

  if (!token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    request.user = verifyAuthToken(token);
    next();
  } catch {
    response.status(401).json({ error: "Session expired. Please sign in again." });
  }
}

export function authenticateSocket(socket: Socket): AuthTokenPayload | null {
  const header = socket.handshake.headers.cookie;

  if (!header) {
    return null;
  }

  const parsed = cookie.parse(header);
  const token = parsed[serverConfig.cookieName];

  if (!token) {
    return null;
  }

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}
