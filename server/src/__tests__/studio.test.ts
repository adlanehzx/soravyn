import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { studioRoutes, brandInput, campaignInput, transitions } from "../routes/studio.js";
import type { Db } from "@soravyn/db";
import { HttpError } from "../errors.js";

describe("Studio client boundaries", () => {
  it("rejects another client's member before querying storage", async () => {
    const app = express();
    app.use((req, _res, next) => { Object.assign(req, { actor: { type: "board", source: "session", companyIds: ["11111111-1111-4111-8111-111111111111"] } }); next(); });
    app.use(studioRoutes({} as Db));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message }));
    const res = await request(app).get("/companies/22222222-2222-4222-8222-222222222222/studio/brand");
    expect(res.status).toBe(403);
  });
  it("does not accept company ownership in brand input", () => {
    expect(brandInput.safeParse({ name: "Client", companyId: "other" }).success).toBe(false);
  });
  it("requires a meaningful campaign brief", () => {
    expect(campaignInput.safeParse({ name: "Launch", objectives: "Sales", brief: " " }).success).toBe(false);
  });
  it("cannot skip production and review from a brief", () => {
    expect(transitions.brief).toEqual(["strategy"]);
    expect(transitions.delivery).toEqual([]);
  });
});
