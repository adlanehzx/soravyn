import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { marketingPlanRoutes } from "../routes/marketing-plan.js";
import {
  generateMarketingPlanInputSchema,
  marketingPlanInputSchema,
} from "@soravyn/shared";
import type { Db } from "@soravyn/db";
import { HttpError } from "../errors.js";

describe("Marketing Plan Route Isolation & Contracts", () => {
  it("rejects unauthorized cross-company access with 403", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      Object.assign(req, {
        actor: { type: "board", source: "session", companyIds: ["11111111-1111-4111-8111-111111111111"], actorId: "u1" },
      });
      next();
    });
    app.use(marketingPlanRoutes({} as Db));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
      res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message })
    );

    // Attempting to access another company's plans
    const res = await request(app).get("/companies/22222222-2222-4222-8222-222222222222/studio/plans");
    expect(res.status).toBe(403);
  });

  it("strictly validates generation payload rejecting extraneous fields", () => {
    expect(
      generateMarketingPlanInputSchema.safeParse({
        periodMonth: "2026-11",
        commercialGoal: "Atteindre 100 leads qualifiés",
        totalBudget: 5000,
        unauthorizedField: "hacked",
      }).success
    ).toBe(false);

    expect(
      generateMarketingPlanInputSchema.safeParse({
        periodMonth: "2026-11",
        commercialGoal: "Atteindre 100 leads qualifiés",
        totalBudget: 5000,
        currency: "EUR",
        primaryChannels: ["LinkedIn", "YouTube"],
      }).success
    ).toBe(true);
  });

  it("validates manual marketing plan creation payload", () => {
    expect(
      marketingPlanInputSchema.safeParse({
        title: "",
        periodMonth: "2026-11",
        commercialGoal: "Objectif valide",
      }).success
    ).toBe(false);

    expect(
      marketingPlanInputSchema.safeParse({
        title: "Plan Marketing Novembre 2026",
        periodMonth: "2026-11",
        commercialGoal: "Expansion SaaS B2B",
        totalBudget: 8000,
      }).success
    ).toBe(true);
  });
});
