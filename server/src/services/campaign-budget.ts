import { and, eq, isNull, sql, inArray } from "drizzle-orm";
import {
  campaignBudgets,
  campaignReservations,
  campaigns,
  costEvents,
  issues,
  type Db,
} from "@soravyn/db";
import { conflict, notFound, unprocessable } from "../errors.js";

export async function campaignBudgetView(
  db: Db,
  companyId: string,
  campaignId: string
) {
  const [campaign] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(
      and(eq(campaigns.companyId, companyId), eq(campaigns.id, campaignId))
    );
  if (!campaign) throw notFound("Campaign not found");
  const [budget] = await db
    .select()
    .from(campaignBudgets)
    .where(
      and(
        eq(campaignBudgets.companyId, companyId),
        eq(campaignBudgets.campaignId, campaignId)
      )
    );
  const [usage] = await db
    .select({
      cents: sql<number>`coalesce(sum(${costEvents.costCents}),0)::int`,
    })
    .from(costEvents)
    .innerJoin(
      issues,
      and(eq(costEvents.issueId, issues.id), eq(issues.companyId, companyId))
    )
    .where(
      and(
        eq(costEvents.companyId, companyId),
        eq(issues.billingCode, `campaign:${campaignId}`)
      )
    );
  const reservations = await db
    .select()
    .from(campaignReservations)
    .where(
      and(
        eq(campaignReservations.companyId, companyId),
        eq(campaignReservations.campaignId, campaignId),
        isNull(campaignReservations.releasedAt)
      )
    );
  const costs = reservations.length
    ? await db
        .select({
          issueId: costEvents.issueId,
          cents: sql<number>`coalesce(sum(${costEvents.costCents}),0)::int`,
        })
        .from(costEvents)
        .where(
          and(
            eq(costEvents.companyId, companyId),
            inArray(
              costEvents.issueId,
              reservations.map((row) => row.taskId)
            )
          )
        )
        .groupBy(costEvents.issueId)
    : [];
  const remaining = reservations.map((row) => ({
    ...row,
    reportedCents: Number(
      costs.find((cost) => cost.issueId === row.taskId)?.cents || 0
    ),
    remainingCents: Math.max(
      0,
      row.amountCents -
        Number(costs.find((cost) => cost.issueId === row.taskId)?.cents || 0)
    ),
  }));
  const reservedCents = remaining.reduce((n, row) => n + row.remainingCents, 0);
  const reportedCents = Number(usage?.cents || 0);
  return {
    limitCents: budget?.limitCents ?? null,
    reportedCents,
    reservedCents,
    remainingCents: budget
      ? Math.max(0, budget.limitCents - reportedCents - reservedCents)
      : null,
    reservations: remaining,
    coverage:
      "Reported costs plus the unspent portion of each active authorization reservation. This is not a provider billing cap.",
  };
}
// Called inside the stage authorization transaction; lock the common campaign row to serialize all reservations and budget edits.
export async function reserveCampaignTask(
  db: Db,
  companyId: string,
  campaignId: string,
  taskId: string,
  amount?: number
) {
  await db
    .select()
    .from(campaigns)
    .where(
      and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId))
    )
    .for("update");
  const view = await campaignBudgetView(db, companyId, campaignId);
  if (view.limitCents === null) return;
  if (!Number.isSafeInteger(amount) || amount! <= 0)
    throw unprocessable(
      "A positive maximum authorization amount in cents is required for this campaign"
    );
  const [task] = await db
    .select()
    .from(issues)
    .where(
      and(
        eq(issues.id, taskId),
        eq(issues.companyId, companyId),
        eq(issues.billingCode, `campaign:${campaignId}`)
      )
    );
  if (!task || ["done", "cancelled"].includes(task.status))
    throw unprocessable(
      "Reservation requires an unfinished task in this campaign"
    );
  const [existing] = await db
    .select()
    .from(campaignReservations)
    .where(
      and(
        eq(campaignReservations.companyId, companyId),
        eq(campaignReservations.campaignId, campaignId),
        eq(campaignReservations.taskId, taskId)
      )
    );
  const [usage] = await db
    .select({
      cents: sql<number>`coalesce(sum(${costEvents.costCents}),0)::int`,
    })
    .from(costEvents)
    .where(
      and(eq(costEvents.companyId, companyId), eq(costEvents.issueId, taskId))
    );
  const spent = Number(usage.cents);
  const previousRemaining =
    existing && !existing.releasedAt
      ? Math.max(0, existing.amountCents - spent)
      : 0;
  if (amount! > view.remainingCents! + previousRemaining)
    throw conflict("Campaign authorization budget exceeded");
  const commitment = spent + amount!;
  if (commitment > 2147483647)
    throw unprocessable("Authorization amount is too large");
  await db
    .insert(campaignReservations)
    .values({ companyId, campaignId, taskId, amountCents: commitment })
    .onConflictDoUpdate({
      target: campaignReservations.taskId,
      set: { amountCents: commitment, releasedAt: null },
    });
}
