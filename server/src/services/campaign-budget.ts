import { and, eq, isNull, sql } from "drizzle-orm";
import { campaignBudgets, campaignReservations, campaigns, costEvents, issues, type Db } from "@soravyn/db";
import { conflict, notFound, unprocessable } from "../errors.js";

export async function campaignBudgetView(db: Db, companyId: string, campaignId: string) {
  const [campaign] = await db.select({id: campaigns.id}).from(campaigns).where(and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId)));
  if (!campaign) throw notFound("Campaign not found");
  const [budget] = await db.select().from(campaignBudgets).where(and(eq(campaignBudgets.companyId, companyId), eq(campaignBudgets.campaignId, campaignId)));
  const [usage] = await db.select({cents: sql<number>`coalesce(sum(${costEvents.costCents}),0)::int`}).from(costEvents).innerJoin(issues, and(eq(costEvents.issueId, issues.id), eq(issues.companyId, companyId))).where(and(eq(costEvents.companyId, companyId), eq(issues.billingCode, `campaign:${campaignId}`)));
  const reservations = await db.select().from(campaignReservations).where(and(eq(campaignReservations.companyId, companyId), eq(campaignReservations.campaignId, campaignId), isNull(campaignReservations.releasedAt)));
  const reservedCents = reservations.reduce((n, row) => n + row.amountCents, 0);
  const reportedCents = Number(usage?.cents || 0);
  return {limitCents: budget?.limitCents ?? null, reportedCents, reservedCents, remainingCents: budget ? Math.max(0, budget.limitCents - reportedCents - reservedCents) : null, reservations,
    coverage: "Reported costs plus outstanding authorization reservations. Reservations are conservative and may overlap reported costs until manually released. This is not a provider billing cap."};
}
// Called inside the stage authorization transaction; lock the common campaign row to serialize all reservations and budget edits.
export async function reserveCampaignTask(db: Db, companyId: string, campaignId: string, taskId: string, amount?: number) {
  await db.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId))).for("update");
  const view = await campaignBudgetView(db, companyId, campaignId);
  if (view.limitCents === null) return;
  if (!Number.isSafeInteger(amount) || amount! <= 0) throw unprocessable("A positive maximum authorization amount in cents is required for this campaign");
  if (amount! > view.remainingCents!) throw conflict("Campaign authorization budget exceeded");
  await db.insert(campaignReservations).values({companyId, campaignId, taskId, amountCents: amount!});
}
