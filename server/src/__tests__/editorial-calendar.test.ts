import { describe, it, expect } from "vitest";
import {
  createEditorialCalendarItemSchema,
  updateEditorialCalendarItemSchema,
  generateCalendarFromPlanSchema,
  editorialCalendarFilterSchema,
} from "@soravyn/shared";

describe("Editorial Calendar Contracts & Validation", () => {
  it("validates editorial calendar item creation schema", () => {
    const valid = createEditorialCalendarItemSchema.safeParse({
      title: "Vidéo Teaser : Automatisez votre studio créatif",
      contentType: "video",
      channel: "YouTube",
      scheduledAt: "2026-11-18T14:00:00.000Z",
      status: "scheduled",
      contentBrief: "Accroche : Vos vidéos publicitaires en 15 min chrono.",
      copyText: "Découvrez notre nouveau moteur autonome SORAVYN.",
      targetAudience: "CMO et créateurs",
    });
    expect(valid.success).toBe(true);

    // Invalid ISO datetime rejected
    const invalidDate = createEditorialCalendarItemSchema.safeParse({
      title: "Date invalide",
      contentType: "video",
      channel: "YouTube",
      scheduledAt: "not-a-date",
    });
    expect(invalidDate.success).toBe(false);

    // Empty title rejected
    const emptyTitle = createEditorialCalendarItemSchema.safeParse({
      title: "",
      contentType: "social_post",
      channel: "LinkedIn",
      scheduledAt: "2026-11-18T14:00:00.000Z",
    });
    expect(emptyTitle.success).toBe(false);

    // Invalid content type rejected
    const invalidType = createEditorialCalendarItemSchema.safeParse({
      title: "Format inconnu",
      contentType: "billboard_unknown",
      channel: "Outdoor",
      scheduledAt: "2026-11-18T14:00:00.000Z",
    });
    expect(invalidType.success).toBe(false);
  });

  it("validates editorial item update schema", () => {
    const validUpdate = updateEditorialCalendarItemSchema.safeParse({
      status: "approved",
      publishedUrl: "https://youtube.com/watch?v=soravyn123",
      scheduledAt: "2026-11-20T18:00:00.000Z",
    });
    expect(validUpdate.success).toBe(true);

    const invalidStatus = updateEditorialCalendarItemSchema.safeParse({
      status: "unknown_status",
    });
    expect(invalidStatus.success).toBe(false);
  });

  it("validates plan auto-generation schema", () => {
    const valid = generateCalendarFromPlanSchema.safeParse({
      planId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      startDate: "2026-11-02",
    });
    expect(valid.success).toBe(true);

    // Invalid UUID rejected
    const invalidUuid = generateCalendarFromPlanSchema.safeParse({
      planId: "not-a-uuid",
    });
    expect(invalidUuid.success).toBe(false);
  });

  it("validates editorial filter schema", () => {
    const validFilter = editorialCalendarFilterSchema.safeParse({
      periodMonth: "2026-11",
      contentType: "video",
      channel: "LinkedIn",
      status: "scheduled",
    });
    expect(validFilter.success).toBe(true);

    const invalidMonth = editorialCalendarFilterSchema.safeParse({
      periodMonth: "2026-11-15", // month only YYYY-MM
    });
    expect(invalidMonth.success).toBe(false);
  });
});
