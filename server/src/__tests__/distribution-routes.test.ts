import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { distributionRoutes } from "../routes/distribution.js";
import {
  createDistributionChannelSchema,
  publishItemInputSchema,
} from "@soravyn/shared";
import type { Db } from "@soravyn/db";
import { HttpError } from "../errors.js";

describe("Distribution Route Isolation & Schema Verification", () => {
  it("rejects unauthorized cross-company access with 403", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      Object.assign(req, {
        actor: {
          type: "board",
          source: "session",
          companyIds: ["11111111-1111-4111-8111-111111111111"],
          actorId: "user-1",
        },
      });
      next();
    });
    app.use(distributionRoutes({} as Db));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
      res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message })
    );

    // Attempting to access company 2222's distribution channels
    const res = await request(app).get("/companies/22222222-2222-4222-8222-222222222222/distribution/channels");
    expect(res.status).toBe(403);
  });

  it("validates channel creation payload with strict enum protection", () => {
    expect(
      createDistributionChannelSchema.safeParse({
        channelType: "linkedin",
        name: "Page Entreprise Soravyn",
        status: "active",
      }).success
    ).toBe(true);

    expect(
      createDistributionChannelSchema.safeParse({
        channelType: "unsupported_network",
        name: "Invalid Channel",
      }).success
    ).toBe(false);
  });

  it("validates publish item payload schema", () => {
    expect(
      publishItemInputSchema.safeParse({
        channelId: "550e8400-e29b-41d4-a716-446655440000",
        customCopy: "Texte adapté pour LinkedIn",
        tags: ["AI", "Marketing", "SaaS"],
      }).success
    ).toBe(true);

    expect(
      publishItemInputSchema.safeParse({
        channelId: "not-a-valid-uuid",
      }).success
    ).toBe(false);
  });
});
