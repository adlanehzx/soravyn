import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { videoEnvironmentRoutes } from "../routes/video-environment.js";
import { HttpError } from "../errors.js";

function appFor(actor: Record<string, unknown>) {
  const app = express();
  app.use((req, _res, next) => { Object.assign(req, { actor }); next(); });
  app.use(videoEnvironmentRoutes());
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error instanceof HttpError ? error.status : 500).json({ error: error.message });
  });
  return app;
}
describe("Video environment authorization", () => {
  it("denies anonymous access", async () => {
    expect((await request(appFor({ type: "none" })).get("/companies/client-a/video/environment")).status).toBe(401);
  });
  it("denies cross-company board access", async () => {
    expect((await request(appFor({ type: "board", companyIds: ["client-b"], source: "session" })).get("/companies/client-a/video/environment")).status).toBe(403);
  });
  it("denies agents even inside their company", async () => {
    expect((await request(appFor({ type: "agent", companyId: "client-a" })).get("/companies/client-a/video/environment")).status).toBe(403);
  });
});
