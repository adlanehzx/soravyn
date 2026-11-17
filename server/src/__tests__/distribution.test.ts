import { describe, it, expect } from "vitest";
import { dispatchCalendarItem } from "../services/distribution.js";

describe("Distribution Engine Unit Tests", () => {
  it("rejects dispatch for items that violate governance (e.g. status: 'draft')", async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: async () => [
            {
              id: "item-1",
              companyId: "comp-1",
              status: "draft",
              title: "Unapproved post",
              channel: "LinkedIn",
            },
          ],
        }),
      }),
    };

    await expect(
      dispatchCalendarItem(mockDb as any, "comp-1", "item-1")
    ).rejects.toThrow("Violation de gouvernance SORAVYN");
  });

  it("successfully dispatches an approved item and updates status to published", async () => {
    let updatedStatus = "";
    let insertedLog: any = null;

    const mockDb = {
      select: () => ({
        from: (table: any) => ({
          where: () => ({
            orderBy: async () => [],
            then: (resolve: any) =>
              resolve([
                {
                  id: "item-2",
                  companyId: "comp-1",
                  status: "approved",
                  title: "Lancement Soravyn Studio",
                  channel: "LinkedIn",
                  copyText: "Découvrez l'IA Marketing Autonome !",
                  contentType: "social_post",
                  scheduledAt: new Date(),
                },
              ]),
          }),
        }),
      }),
      insert: () => ({
        values: (vals: any) => ({
          returning: async () => {
            insertedLog = { ...vals, id: "log-1", dispatchedAt: new Date() };
            return [insertedLog];
          },
        }),
      }),
      update: () => ({
        set: (vals: any) => {
          updatedStatus = vals.status;
          return {
            where: async () => {},
          };
        },
      }),
    };

    const result = await dispatchCalendarItem(mockDb as any, "comp-1", "item-2");

    expect(result.status).toBe("success");
    expect(result.channelType).toBe("linkedin");
    expect(result.externalPostUrl).toContain("linkedin.com/feed/update");
    expect(updatedStatus).toBe("published");
    expect(insertedLog).toBeDefined();
    expect(insertedLog.calendarItemId).toBe("item-2");
  });

  it("computes proper external URLs for TikTok and YouTube", async () => {
    const mockDb = (channel: string) => ({
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: async () => [],
            then: (resolve: any) =>
              resolve([
                {
                  id: "item-video",
                  companyId: "comp-1",
                  status: "approved",
                  title: "Démo Vidéo",
                  channel,
                  contentType: "video",
                  scheduledAt: new Date(),
                },
              ]),
          }),
        }),
      }),
      insert: () => ({
        values: (vals: any) => ({
          returning: async () => [{ ...vals, id: "log-v", dispatchedAt: new Date() }],
        }),
      }),
      update: () => ({
        set: () => ({
          where: async () => {},
        }),
      }),
    });

    const ytResult = await dispatchCalendarItem(mockDb("YouTube") as any, "comp-1", "item-video");
    expect(ytResult.externalPostUrl).toContain("youtube.com/watch?v=");

    const tiktokResult = await dispatchCalendarItem(mockDb("TikTok") as any, "comp-1", "item-video");
    expect(tiktokResult.externalPostUrl).toContain("tiktok.com/@brand/video/");
  });
});
