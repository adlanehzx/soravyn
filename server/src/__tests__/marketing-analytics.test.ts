import { describe, it, expect } from "vitest";
import {
  recordPerformanceMetrics,
  getAnalyticsOverview,
  runBrandMemoryFeedbackLoop,
} from "../services/marketing-analytics.js";

describe("Marketing Analytics & Feedback Loop Service Unit Tests", () => {
  it("calculates accurate engagement rate and net ROI during metric recording", async () => {
    let insertedRows: any[] = [];
    const mockDb = {
      insert: () => ({
        values: (rows: any[]) => ({
          returning: async () => {
            insertedRows = rows.map((r, i) => ({ ...r, id: `metric-${i}` }));
            return insertedRows;
          },
        }),
      }),
    };

    const metrics = await recordPerformanceMetrics(mockDb as any, "comp-1", [
      {
        channel: "LinkedIn",
        impressions: 1000,
        clicks: 50,
        likes: 20,
        comments: 10,
        shares: 5,
        spendCents: 10000, // 100€
        revenueCents: 25000, // 250€ -> 150% ROI
      },
    ]);

    expect(metrics.length).toBe(1);
    expect(metrics[0].impressions).toBe(1000);
    // Interactions: 50 + 20 + 10 + 5 = 85 -> 8.5%
    expect(metrics[0].engagementRate).toBe(8.5);
    expect(metrics[0].roiPercent).toBe(150);
  });

  it("computes consolidated overview and ranks top performing channel", async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: async () => [
              {
                impressions: 2000,
                views: 1800,
                clicks: 120,
                conversions: 15,
                spendCents: 5000,
                revenueCents: 15000,
                engagementRate: 9.5,
                channel: "TikTok",
              },
              {
                impressions: 1000,
                views: 500,
                clicks: 30,
                conversions: 2,
                spendCents: 5000,
                revenueCents: 6000,
                engagementRate: 3.2,
                channel: "LinkedIn",
              },
            ],
          }),
        }),
      }),
    };

    const overview = await getAnalyticsOverview(mockDb as any, "comp-1", 30);

    expect(overview.totalImpressions).toBe(3000);
    expect(overview.totalClicks).toBe(150);
    expect(overview.topPerformingChannel).toBe("TikTok");
    expect(overview.channelBreakdown.length).toBe(2);
    expect(overview.channelBreakdown[0].channel).toBe("TikTok");
    expect(overview.channelBreakdown[0].engagementRate).toBe(9.5);
  });

  it("executes feedback loop and injects strategic insights into Brand Memory", async () => {
    let updatedRules = "";
    const mockDb = {
      select: () => ({
        from: (table: any) => ({
          where: () => ({
            orderBy: async () => [
              {
                impressions: 5000,
                views: 4500,
                clicks: 300,
                conversions: 25,
                spendCents: 10000,
                revenueCents: 30000,
                engagementRate: 11.2,
                channel: "TikTok",
              },
            ],
            then: (resolve: any) =>
              resolve([
                {
                  id: "profile-1",
                  companyId: "comp-1",
                  editorialRules: "Ton audacieux et direct.",
                },
              ]),
          }),
        }),
      }),
      insert: () => ({
        values: (rows: any[]) => ({
          returning: async () =>
            rows.map((r, i) => ({ ...r, id: `insight-${i}`, createdAt: new Date() })),
        }),
      }),
      update: () => ({
        set: (vals: any) => {
          updatedRules = vals.editorialRules;
          return {
            where: async () => {},
          };
        },
      }),
    };

    const loopResult = await runBrandMemoryFeedbackLoop(mockDb as any, "comp-1", {
      timeframeDays: 30,
      autoApplyToBrandMemory: true,
    });

    expect(loopResult.insightsGenerated).toBeGreaterThan(0);
    expect(loopResult.brandMemoryUpdated).toBe(true);
    expect(loopResult.insights[0].title).toBe("Surperformance confirmée sur TikTok");
    expect(updatedRules).toContain("Le canal TikTok délivre un taux d'engagement");
  });
});
