import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { marketingAnalyticsRoutes } from "../routes/marketing-analytics.js";
import {
  batchMetricsInputSchema,
  triggerFeedbackLoopInputSchema,
} from "@soravyn/shared";
import type { Db } from "@soravyn/db";
import { HttpError } from "../errors.js";

describe("Marketing Analytics Routes Isolation & Schema Verification", () => {
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
    app.use(marketingAnalyticsRoutes({} as Db));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
      res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message })
    );

    // Attempting to access company 2222's analytics
    const res = await request(app).get("/companies/22222222-2222-4222-8222-222222222222/studio/analytics/overview");
    expect(res.status).toBe(403);
  });

  it("validates batch metrics ingestion payload with strict schema", () => {
    expect(
      batchMetricsInputSchema.safeParse({
        metrics: [
          {
            channel: "LinkedIn",
            impressions: 500,
            views: 450,
            clicks: 30,
            likes: 15,
            shares: 2,
            comments: 4,
          },
        ],
      }).success
    ).toBe(true);

    expect(
      batchMetricsInputSchema.safeParse({
        metrics: [], // min 1 required
      }).success
    ).toBe(false);
  });

  it("validates feedback loop trigger payload schema", () => {
    expect(
      triggerFeedbackLoopInputSchema.safeParse({
        timeframeDays: 14,
        autoApplyToBrandMemory: true,
      }).success
    ).toBe(true);

    expect(
      triggerFeedbackLoopInputSchema.safeParse({
        timeframeDays: -5, // positive required
      }).success
    ).toBe(false);
  });
});
