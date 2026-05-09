import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/middleware.js";
import { fileSystemService } from "../filesystem/fileSystemService.js";
import { sessionStore, type TerminalSession } from "../sessions/sessionStore.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.use(requireAuth);

function requireOwnedSession(request: AuthedRequest, sessionId: unknown): TerminalSession {
  const parsedSessionId = z.string().min(1).parse(sessionId);
  const session = sessionStore.getOwned(parsedSessionId, request.user!.sub);

  if (!session || session.status !== "ready") {
    throw new Error("Session not found.");
  }

  sessionStore.touch(session.id);
  return session;
}

router.get("/files", async (request: AuthedRequest, response, next) => {
  try {
    const session = requireOwnedSession(request, request.query.sessionId);
    const entries = await fileSystemService.list(session.containerId, z.string().optional().parse(request.query.path));
    response.json({ entries });
  } catch (error) {
    next(error);
  }
});

router.get("/file", async (request: AuthedRequest, response, next) => {
  try {
    const session = requireOwnedSession(request, request.query.sessionId);
    const filePath = z.string().min(1).parse(request.query.path);
    const content = await fileSystemService.read(session.containerId, filePath);
    response.type("text/plain").send(content);
  } catch (error) {
    next(error);
  }
});

router.post("/file", async (request: AuthedRequest, response, next) => {
  try {
    const body = z.object({ sessionId: z.string().min(1), path: z.string().min(1), content: z.string() }).parse(request.body);
    const session = requireOwnedSession(request, body.sessionId);
    await fileSystemService.write(session.containerId, body.path, body.content);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post("/directory", async (request: AuthedRequest, response, next) => {
  try {
    const body = z.object({ sessionId: z.string().min(1), path: z.string().min(1) }).parse(request.body);
    const session = requireOwnedSession(request, body.sessionId);
    await fileSystemService.mkdir(session.containerId, body.path);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.delete("/file", async (request: AuthedRequest, response, next) => {
  try {
    const session = requireOwnedSession(request, request.query.sessionId);
    const filePath = z.string().min(1).parse(request.query.path);
    await fileSystemService.remove(session.containerId, filePath);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post("/upload", upload.single("file"), async (request: AuthedRequest, response, next) => {
  try {
    const session = requireOwnedSession(request, request.body.sessionId);
    const uploadPath = z.string().min(1).parse(request.body.path);

    if (!request.file) {
      throw new Error("Missing upload file.");
    }

    await fileSystemService.write(session.containerId, uploadPath, request.file.buffer);
    response.status(201).json({ path: uploadPath });
  } catch (error) {
    next(error);
  }
});

router.get("/download", async (request: AuthedRequest, response, next) => {
  try {
    const session = requireOwnedSession(request, request.query.sessionId);
    const filePath = z.string().min(1).parse(request.query.path);
    const content = await fileSystemService.read(session.containerId, filePath);
    response.attachment(fileSystemService.filename(filePath)).send(content);
  } catch (error) {
    next(error);
  }
});

export const fileRoutes = router;
