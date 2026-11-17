import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { brandMemoryRoutes } from "../routes/brand-memory.js";
import {
  brandProductInputSchema,
  brandPersonaInputSchema,
  brandObjectionInputSchema,
  brandSourceInputSchema,
  prepareBriefInputSchema,
} from "@soravyn/shared";
import type { Db } from "@soravyn/db";
import { HttpError } from "../errors.js";

describe("Brand Memory Route Boundaries & Validation", () => {
  it("rejects unauthorized company access before querying memory database", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      Object.assign(req, {
        actor: { type: "board", source: "session", companyIds: ["11111111-1111-4111-8111-111111111111"] },
      });
      next();
    });
    app.use(brandMemoryRoutes({} as Db));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
      res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message })
    );

    const res = await request(app).get("/companies/22222222-2222-4222-8222-222222222222/studio/brand/memory");
    expect(res.status).toBe(403);
  });

  it("validates strict schema for brand products (rejects unknown fields)", () => {
    expect(
      brandProductInputSchema.safeParse({
        name: "Produit Test",
        pricing: "29€",
        unauthorizedField: "hacked",
      }).success
    ).toBe(false);

    expect(
      brandProductInputSchema.safeParse({
        name: "Produit Test",
        pricing: "29€",
        currency: "EUR",
        keyFeatures: ["Fonctionnalité 1"],
      }).success
    ).toBe(true);
  });

  it("validates brand persona schema", () => {
    expect(brandPersonaInputSchema.safeParse({ name: "" }).success).toBe(false);
    expect(
      brandPersonaInputSchema.safeParse({
        name: "Directrice Marketing",
        role: "CMO",
        painPoints: ["Budget limité"],
        goals: ["ROI mesurable"],
      }).success
    ).toBe(true);
  });

  it("validates brand objections and enforces valid categories", () => {
    expect(
      brandObjectionInputSchema.safeParse({
        objection: "Trop cher",
        category: "invalid_category",
        recommendedResponse: "ROI en 2 mois",
      }).success
    ).toBe(false);

    expect(
      brandObjectionInputSchema.safeParse({
        objection: "Trop cher",
        category: "pricing",
        recommendedResponse: "ROI en 2 mois",
        verifiableProof: "Mesuré sur 40 clients",
      }).success
    ).toBe(true);
  });

  it("validates brand sources with allowed document kinds", () => {
    expect(
      brandSourceInputSchema.safeParse({
        title: "Livre Blanc 2026",
        kind: "invalid_kind",
        content: "Données de marché...",
      }).success
    ).toBe(false);

    expect(
      brandSourceInputSchema.safeParse({
        title: "Livre Blanc 2026",
        kind: "document",
        content: "Données de marché...",
        verified: "verified",
      }).success
    ).toBe(true);
  });

  it("validates brief preparation input requires non-empty name and brief", () => {
    expect(
      prepareBriefInputSchema.safeParse({
        name: "",
        objectives: "Vendre",
        brief: "Brief",
      }).success
    ).toBe(false);

    expect(
      prepareBriefInputSchema.safeParse({
        name: "Campagne Printemps",
        objectives: "Notoriété",
        brief: "Présenter la nouvelle gamme aux professionnels.",
      }).success
    ).toBe(true);
  });
});
