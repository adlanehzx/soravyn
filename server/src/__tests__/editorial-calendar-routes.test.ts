import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { editorialCalendarRoutes } from "../routes/editorial-calendar.js";
import {
  createEditorialCalendarItemSchema,
  updateEditorialCalendarItemSchema,
} from "@soravyn/shared";
import type { Db } from "@soravyn/db";
import { HttpError } from "../errors.js";

describe("Editorial Calendar Route Isolation & Security", () => {
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
    app.use(editorialCalendarRoutes({} as Db));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
      res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message })
    );

    // Attempting to access company 2222's editorial calendar
    const res = await request(app).get("/companies/22222222-2222-4222-8222-222222222222/studio/calendar");
    expect(res.status).toBe(403);
  });

  it("validates editorial item creation payload with strict channel and type requirements", () => {
    expect(
      createEditorialCalendarItemSchema.safeParse({
        title: "Vidéo Hook : 3 erreurs à éviter",
        contentType: "video",
        channel: "LinkedIn",
        scheduledAt: "2026-11-24T09:00:00.000Z",
      }).success
    ).toBe(true);

    expect(
      createEditorialCalendarItemSchema.safeParse({
        title: "Titre sans canal",
        contentType: "video",
        channel: "",
        scheduledAt: "2026-11-24T09:00:00.000Z",
      }).success
    ).toBe(false);
  });

  it("validates editorial item update payload with status enum protection", () => {
    expect(
      updateEditorialCalendarItemSchema.safeParse({
        status: "published",
        publishedUrl: "https://linkedin.com/feed/update/urn:li:activity:123456",
      }).success
    ).toBe(true);

    expect(
      updateEditorialCalendarItemSchema.safeParse({
        status: "invalid_status",
      }).success
    ).toBe(false);
  });
});
