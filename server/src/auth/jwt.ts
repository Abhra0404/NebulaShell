import jwt from "jsonwebtoken";
import { serverConfig } from "../config.js";

export interface AuthTokenPayload {
  sub: string;
  username: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, serverConfig.jwtSecret, { expiresIn: serverConfig.jwtTtlSeconds });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, serverConfig.jwtSecret);

  if (typeof decoded === "string" || typeof decoded.sub !== "string" || typeof decoded.username !== "string") {
    throw new Error("Invalid auth token.");
  }

  return { sub: decoded.sub, username: decoded.username };
}
