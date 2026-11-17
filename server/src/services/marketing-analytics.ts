import { eq, and, desc, gte, sql } from "drizzle-orm";
import {
  contentPerformanceMetrics,
  strategicInsights,
  brandProfiles,
  brandPersonas,
  editorialCalendarItems,
  type Db,
} from "@soravyn/db";
import type {
  PerformanceMetricInput,
  ContentPerformanceMetric,
  AnalyticsOverview,
  StrategicInsight,
  FeedbackLoopResult,
} from "@soravyn/shared";

export async function recordPerformanceMetrics(
  db: any,
  companyId: string,
  inputs: PerformanceMetricInput[]
): Promise<ContentPerformanceMetric[]> {
  const rowsToInsert = inputs.map((input) => {
    const impressions = Math.max(input.impressions, 0);
    const views = Math.max(input.views || 0, 0);
    const clicks = Math.max(input.clicks || 0, 0);
    const likes = Math.max(input.likes || 0, 0);
    const shares = Math.max(input.shares || 0, 0);
    const comments = Math.max(input.comments || 0, 0);
    const conversions = Math.max(input.conversions || 0, 0);
    const spendCents = Math.max(input.spendCents || 0, 0);
    const revenueCents = Math.max(input.revenueCents || 0, 0);

    const interactions = likes + comments + shares + clicks;
    const engagementRate =
      impressions > 0 ? Number(((interactions / impressions) * 100).toFixed(2)) : 0;

    let roiPercent: number | null = null;
    if (spendCents > 0) {
      roiPercent = Number((((revenueCents - spendCents) / spendCents) * 100).toFixed(2));
    }

    return {
      companyId,
      calendarItemId: input.calendarItemId || null,
      externalPostId: input.externalPostId || null,
      channel: input.channel,
      impressions,
      views,
      clicks,
      likes,
      shares,
      comments,
      conversions,
      spendCents,
      revenueCents,
      engagementRate,
      roiPercent,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
    };
  });

  const inserted = await db
    .insert(contentPerformanceMetrics)
    .values(rowsToInsert)
    .returning();

  return inserted as ContentPerformanceMetric[];
}

export async function getAnalyticsOverview(
  db: any,
  companyId: string,
  timeframeDays = 30
): Promise<AnalyticsOverview> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - timeframeDays);

  const metrics = await db
    .select()
    .from(contentPerformanceMetrics)
    .where(
      and(
        eq(contentPerformanceMetrics.companyId, companyId),
        gte(contentPerformanceMetrics.recordedAt, cutoff)
      )
    )
    .orderBy(desc(contentPerformanceMetrics.recordedAt));

  if (!metrics || metrics.length === 0) {
    return {
      totalImpressions: 0,
      totalViews: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalSpendCents: 0,
      totalRevenueCents: 0,
      averageEngagementRate: 0,
      topPerformingChannel: "None",
      channelBreakdown: [],
    };
  }

  let totalImpressions = 0;
  let totalViews = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalSpendCents = 0;
  let totalRevenueCents = 0;
  let totalEngagementSum = 0;

  const channelMap = new Map<
    string,
    { impressions: number; clicks: number; engagementRates: number[] }
  >();

  for (const m of metrics) {
    totalImpressions += m.impressions;
    totalViews += m.views;
    totalClicks += m.clicks;
    totalConversions += m.conversions;
    totalSpendCents += m.spendCents;
    totalRevenueCents += m.revenueCents;
    totalEngagementSum += m.engagementRate;

    const current = channelMap.get(m.channel) || {
      impressions: 0,
      clicks: 0,
      engagementRates: [],
    };
    current.impressions += m.impressions;
    current.clicks += m.clicks;
    current.engagementRates.push(m.engagementRate);
    channelMap.set(m.channel, current);
  }

  const channelBreakdown = Array.from(channelMap.entries()).map(([channel, data]) => {
    const avgEng =
      data.engagementRates.length > 0
        ? Number(
            (
              data.engagementRates.reduce((a, b) => a + b, 0) /
              data.engagementRates.length
            ).toFixed(2)
          )
        : 0;

    return {
      channel,
      impressions: data.impressions,
      clicks: data.clicks,
      engagementRate: avgEng,
    };
  });

  // Sort channels by engagement
  channelBreakdown.sort((a, b) => b.engagementRate - a.engagementRate);
  const topPerformingChannel = channelBreakdown[0]?.channel || "None";
  const averageEngagementRate = Number(
    (totalEngagementSum / metrics.length).toFixed(2)
  );

  return {
    totalImpressions,
    totalViews,
    totalClicks,
    totalConversions,
    totalSpendCents,
    totalRevenueCents,
    averageEngagementRate,
    topPerformingChannel,
    channelBreakdown,
  };
}

export async function runBrandMemoryFeedbackLoop(
  db: any,
  companyId: string,
  options: { timeframeDays?: number; autoApplyToBrandMemory?: boolean } = {}
): Promise<FeedbackLoopResult> {
  const timeframeDays = options.timeframeDays || 30;
  const autoApply = options.autoApplyToBrandMemory !== false;

  const overview = await getAnalyticsOverview(db, companyId, timeframeDays);
  const insightsToInsert: any[] = [];

  // 1. Analyse par canal
  if (overview.channelBreakdown.length > 0) {
    const topChannel = overview.channelBreakdown[0];
    if (topChannel.engagementRate > 0) {
      insightsToInsert.push({
        companyId,
        category: "channel",
        title: `Surperformance confirmée sur ${topChannel.channel}`,
        observation: `Le canal ${topChannel.channel} délivre un taux d'engagement moyen de ${topChannel.engagementRate}%, dépassant la moyenne globale de ${overview.averageEngagementRate}%.`,
        recommendation: `Allouer 40% de la cadence de production vidéo et sociale vers ${topChannel.channel} pour maximiser la portée organique.`,
        confidenceScore: 0.92,
        impactLevel: "high",
        appliedToBrandMemory: autoApply,
      });
    }
  }

  // 2. Analyse d'efficience / ROI
  if (overview.totalSpendCents > 0 && overview.totalRevenueCents > overview.totalSpendCents) {
    const roi = Number(
      (
        ((overview.totalRevenueCents - overview.totalSpendCents) /
          overview.totalSpendCents) *
        100
      ).toFixed(1)
    );
    insightsToInsert.push({
      companyId,
      category: "angle",
      title: "Rentabilité positive sur les contenus à forte proposition de valeur",
      observation: `Les campagnes actives génèrent un ROI net de ${roi}%.`,
      recommendation: "Accélérer les variations créatives autour des objections traitées dans la Brand Memory pour augmenter le taux de conversion.",
      confidenceScore: 0.88,
      impactLevel: "high",
      appliedToBrandMemory: autoApply,
    });
  } else {
    insightsToInsert.push({
      companyId,
      category: "format",
      title: "Optimisation de l'accroche initiale (Hook)",
      observation: `Le taux de clic moyen s'établit à ${overview.totalClicks} clics pour ${overview.totalImpressions} impressions.`,
      recommendation: "Privilégier les formats courts 24 secondes avec scènes Hook de 5s axées sur le problème immédiat du persona.",
      confidenceScore: 0.85,
      impactLevel: "medium",
      appliedToBrandMemory: autoApply,
    });
  }

  // 3. Sauvegarde des insights
  const createdInsights = await db
    .insert(strategicInsights)
    .values(insightsToInsert)
    .returning();

  // 4. Boucle de rétroaction vers la Brand Memory
  let brandMemoryUpdated = false;
  if (autoApply && createdInsights.length > 0) {
    const [profile] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.companyId, companyId));

    if (profile) {
      const topChannelInsight = createdInsights.find((i: any) => i.category === "channel");
      const addedRule = topChannelInsight
        ? `\n[IA Feedback Loop ${new Date().toISOString().slice(0, 10)}] ${topChannelInsight.observation} -> ${topChannelInsight.recommendation}`
        : `\n[IA Feedback Loop ${new Date().toISOString().slice(0, 10)}] Optimisation continue activée.`;

      const updatedRules = (profile.editorialRules || "") + addedRule;

      await db
        .update(brandProfiles)
        .set({
          editorialRules: updatedRules,
          updatedAt: new Date(),
        })
        .where(eq(brandProfiles.id, profile.id));

      brandMemoryUpdated = true;
    }
  }

  return {
    insightsGenerated: createdInsights.length,
    brandMemoryUpdated,
    insights: createdInsights as StrategicInsight[],
  };
}

export async function listStrategicInsights(
  db: any,
  companyId: string,
  limit = 50
): Promise<StrategicInsight[]> {
  const rows = await db
    .select()
    .from(strategicInsights)
    .where(eq(strategicInsights.companyId, companyId))
    .orderBy(desc(strategicInsights.createdAt))
    .limit(limit);

  return rows as StrategicInsight[];
}
