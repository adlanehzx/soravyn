import { eq, and, gte, lte, asc, desc } from "drizzle-orm";
import {
  editorialCalendarItems,
  marketingPlans,
  marketingPlanThemes,
  marketingPlanProposals,
} from "@soravyn/db";
import type {
  EditorialCalendarItem,
  EditorialCalendarItemInput,
  EditorialCalendarItemUpdate,
  GenerateCalendarFromPlanInput,
  EditorialCalendarFilter,
  EditorialCalendarStats,
  EditorialContentType,
  EditorialStatus,
} from "@soravyn/shared";

function detectContentType(format?: string, channel?: string): EditorialContentType {
  const f = (format || "").toLowerCase();
  const c = (channel || "").toLowerCase();

  if (f.includes("video") || f.includes("short") || f.includes("reel") || c === "youtube" || c === "tiktok") {
    return "video";
  }
  if (f.includes("email") || f.includes("newsletter") || c === "newsletter" || c === "email") {
    return "email";
  }
  if (f.includes("article") || f.includes("blog") || c === "blog") {
    return "article";
  }
  return "social_post";
}

export async function listEditorialCalendarItems(
  db: any,
  companyId: string,
  filter?: EditorialCalendarFilter
): Promise<EditorialCalendarItem[]> {
  const conditions = [eq(editorialCalendarItems.companyId, companyId)];

  if (filter?.periodMonth) {
    const [year, month] = filter.periodMonth.split("-").map(Number);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    conditions.push(gte(editorialCalendarItems.scheduledAt, startOfMonth));
    conditions.push(lte(editorialCalendarItems.scheduledAt, endOfMonth));
  } else {
    if (filter?.startDate) {
      conditions.push(gte(editorialCalendarItems.scheduledAt, new Date(filter.startDate)));
    }
    if (filter?.endDate) {
      conditions.push(lte(editorialCalendarItems.scheduledAt, new Date(filter.endDate)));
    }
  }

  if (filter?.contentType) {
    conditions.push(eq(editorialCalendarItems.contentType, filter.contentType));
  }
  if (filter?.channel) {
    conditions.push(eq(editorialCalendarItems.channel, filter.channel));
  }
  if (filter?.status) {
    conditions.push(eq(editorialCalendarItems.status, filter.status));
  }
  if (filter?.planId) {
    conditions.push(eq(editorialCalendarItems.planId, filter.planId));
  }

  const rows = await db
    .select()
    .from(editorialCalendarItems)
    .where(and(...conditions))
    .orderBy(asc(editorialCalendarItems.scheduledAt));

  return rows as EditorialCalendarItem[];
}

export async function getEditorialCalendarItemById(
  db: any,
  companyId: string,
  itemId: string
): Promise<EditorialCalendarItem> {
  const [row] = await db
    .select()
    .from(editorialCalendarItems)
    .where(and(eq(editorialCalendarItems.id, itemId), eq(editorialCalendarItems.companyId, companyId)));

  if (!row) {
    const err = new Error("Editorial calendar item not found");
    (err as any).status = 404;
    throw err;
  }

  return row as EditorialCalendarItem;
}

export async function createEditorialCalendarItem(
  db: any,
  companyId: string,
  input: EditorialCalendarItemInput,
  userId?: string
): Promise<EditorialCalendarItem> {
  const [created] = await db
    .insert(editorialCalendarItems)
    .values({
      companyId,
      title: input.title,
      contentType: input.contentType,
      channel: input.channel,
      scheduledAt: new Date(input.scheduledAt),
      status: input.status || "draft",
      contentBrief: input.contentBrief ?? null,
      copyText: input.copyText ?? null,
      targetAudience: input.targetAudience ?? null,
      planId: input.planId ?? null,
      themeId: input.themeId ?? null,
      proposalId: input.proposalId ?? null,
      campaignId: input.campaignId ?? null,
      assignedAgentId: input.assignedAgentId ?? null,
      assignedUserId: input.assignedUserId || userId || null,
      publishedUrl: input.publishedUrl ?? null,
    })
    .returning();

  return created as EditorialCalendarItem;
}

export async function updateEditorialCalendarItem(
  db: any,
  companyId: string,
  itemId: string,
  update: EditorialCalendarItemUpdate
): Promise<EditorialCalendarItem> {
  await getEditorialCalendarItemById(db, companyId, itemId);

  const values: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (update.title !== undefined) values.title = update.title;
  if (update.contentType !== undefined) values.contentType = update.contentType;
  if (update.channel !== undefined) values.channel = update.channel;
  if (update.scheduledAt !== undefined) values.scheduledAt = new Date(update.scheduledAt);
  if (update.status !== undefined) values.status = update.status;
  if (update.contentBrief !== undefined) values.contentBrief = update.contentBrief;
  if (update.copyText !== undefined) values.copyText = update.copyText;
  if (update.targetAudience !== undefined) values.targetAudience = update.targetAudience;
  if (update.assignedAgentId !== undefined) values.assignedAgentId = update.assignedAgentId;
  if (update.assignedUserId !== undefined) values.assignedUserId = update.assignedUserId;
  if (update.publishedUrl !== undefined) values.publishedUrl = update.publishedUrl;

  const [updated] = await db
    .update(editorialCalendarItems)
    .set(values)
    .where(and(eq(editorialCalendarItems.id, itemId), eq(editorialCalendarItems.companyId, companyId)))
    .returning();

  return updated as EditorialCalendarItem;
}

export async function deleteEditorialCalendarItem(
  db: any,
  companyId: string,
  itemId: string
): Promise<{ success: true }> {
  await getEditorialCalendarItemById(db, companyId, itemId);

  await db
    .delete(editorialCalendarItems)
    .where(and(eq(editorialCalendarItems.id, itemId), eq(editorialCalendarItems.companyId, companyId)));

  return { success: true };
}

export async function generateCalendarFromPlan(
  db: any,
  companyId: string,
  input: GenerateCalendarFromPlanInput,
  userId?: string
): Promise<{ createdCount: number; items: EditorialCalendarItem[] }> {
  // 1. Fetch marketing plan with themes and proposals
  const [plan] = await db
    .select()
    .from(marketingPlans)
    .where(and(eq(marketingPlans.id, input.planId), eq(marketingPlans.companyId, companyId)));

  if (!plan) {
    const err = new Error("Marketing plan not found");
    (err as any).status = 404;
    throw err;
  }

  const themes = await db
    .select()
    .from(marketingPlanThemes)
    .where(eq(marketingPlanThemes.planId, plan.id))
    .orderBy(asc(marketingPlanThemes.orderIndex));

  const proposals = await db
    .select()
    .from(marketingPlanProposals)
    .where(eq(marketingPlanProposals.planId, plan.id));

  // Determine base date
  const [yearStr, monthStr] = plan.periodMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  let baseDate = new Date(Date.UTC(year, month - 1, 1, 9, 0, 0));
  if (input.startDate) {
    baseDate = new Date(input.startDate);
  }

  const createdItems: EditorialCalendarItem[] = [];

  // Group proposals by theme
  const proposalsByTheme = new Map<string, typeof proposals>();
  for (const proposal of proposals) {
    const current = proposalsByTheme.get(proposal.themeId) || [];
    current.push(proposal);
    proposalsByTheme.set(proposal.themeId, current);
  }

  for (let themeIdx = 0; themeIdx < themes.length; themeIdx++) {
    const theme = themes[themeIdx];
    const themeProposals = proposalsByTheme.get(theme.id) || [];
    const weekOffsetDays = themeIdx * 7;

    for (let propIdx = 0; propIdx < themeProposals.length; propIdx++) {
      const proposal = themeProposals[propIdx];
      const contentType = detectContentType(proposal.format, proposal.channel);

      // Distribute within the week:
      // Item 0 -> Day 1 (Tuesday: baseDate + weekOffset + 1)
      // Item 1 -> Day 3 (Thursday: baseDate + weekOffset + 3)
      // Additional items spread out
      const dayInWeek = (propIdx % 5) * 2; // 0, 2, 4
      const scheduledDate = new Date(baseDate.getTime());
      scheduledDate.setUTCDate(baseDate.getUTCDate() + weekOffsetDays + dayInWeek);

      // Preferred post times
      if (contentType === "video") {
        scheduledDate.setUTCHours(17, 0, 0, 0); // 17:00 UTC
      } else if (contentType === "email") {
        scheduledDate.setUTCHours(8, 30, 0, 0); // 08:30 UTC
      } else {
        scheduledDate.setUTCHours(10, 0, 0, 0); // 10:00 UTC
      }

      const contentBrief = [
        `Objectif : ${theme.title}`,
        proposal.angle ? `Angle : ${proposal.angle}` : null,
        proposal.hook ? `Accroche : ${proposal.hook}` : null,
        proposal.callToAction ? `Appel à l'action : ${proposal.callToAction}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const [created] = await db
        .insert(editorialCalendarItems)
        .values({
          companyId,
          planId: plan.id,
          themeId: theme.id,
          proposalId: proposal.id,
          campaignId: proposal.campaignId ?? null,
          title: proposal.title,
          contentType,
          channel: proposal.channel,
          scheduledAt: scheduledDate,
          status: "scheduled",
          contentBrief,
          copyText: proposal.hook ? `${proposal.hook}\n\n[Contenu à rédiger]\n\n${proposal.callToAction || ""}` : null,
          targetAudience: proposal.targetAudience ?? plan.targetAudience ?? null,
          assignedUserId: userId || null,
        })
        .returning();

      createdItems.push(created as EditorialCalendarItem);
    }
  }

  return {
    createdCount: createdItems.length,
    items: createdItems,
  };
}

export async function getEditorialCalendarStats(
  db: any,
  companyId: string,
  periodMonth?: string
): Promise<EditorialCalendarStats> {
  const items = await listEditorialCalendarItems(db, companyId, { periodMonth });

  const stats: EditorialCalendarStats = {
    totalItems: items.length,
    byStatus: {
      draft: 0,
      scheduled: 0,
      in_production: 0,
      ready_for_review: 0,
      approved: 0,
      published: 0,
      cancelled: 0,
    },
    byType: {
      video: 0,
      social_post: 0,
      email: 0,
      article: 0,
    },
    byChannel: {},
  };

  for (const item of items) {
    if (stats.byStatus[item.status] !== undefined) {
      stats.byStatus[item.status]++;
    }
    if (stats.byType[item.contentType] !== undefined) {
      stats.byType[item.contentType]++;
    }
    stats.byChannel[item.channel] = (stats.byChannel[item.channel] || 0) + 1;
  }

  return stats;
}
