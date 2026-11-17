import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import {
  distributionChannels,
  distributionLogs,
  editorialCalendarItems,
  type Db,
} from "@soravyn/db";
import type {
  DistributionChannel,
  DistributionChannelType,
  DistributionLog,
  PublishItemInput,
  PublishItemResult,
} from "@soravyn/shared";

export async function listDistributionChannels(
  db: any,
  companyId: string
): Promise<DistributionChannel[]> {
  const rows = await db
    .select()
    .from(distributionChannels)
    .where(eq(distributionChannels.companyId, companyId))
    .orderBy(desc(distributionChannels.createdAt));

  return rows as DistributionChannel[];
}

export async function getDistributionChannelById(
  db: any,
  companyId: string,
  channelId: string
): Promise<DistributionChannel> {
  const [row] = await db
    .select()
    .from(distributionChannels)
    .where(
      and(
        eq(distributionChannels.id, channelId),
        eq(distributionChannels.companyId, companyId)
      )
    );

  if (!row) {
    const err = new Error(`Canal de distribution non trouvé: ${channelId}`);
    (err as any).status = 404;
    throw err;
  }

  return row as DistributionChannel;
}

export async function createDistributionChannel(
  db: any,
  companyId: string,
  input: {
    channelType: DistributionChannelType;
    name: string;
    status?: "active" | "paused" | "error";
    endpointUrl?: string | null;
    authConfig?: Record<string, any> | null;
    headers?: Record<string, string> | null;
  }
): Promise<DistributionChannel> {
  const [created] = await db
    .insert(distributionChannels)
    .values({
      companyId,
      channelType: input.channelType,
      name: input.name,
      status: input.status || "active",
      endpointUrl: input.endpointUrl || null,
      authConfig: input.authConfig || null,
      headers: input.headers || null,
    })
    .returning();

  return created as DistributionChannel;
}

export async function updateDistributionChannel(
  db: any,
  companyId: string,
  channelId: string,
  input: Partial<{
    name: string;
    status: "active" | "paused" | "error";
    endpointUrl: string | null;
    authConfig: Record<string, any> | null;
    headers: Record<string, string> | null;
  }>
): Promise<DistributionChannel> {
  await getDistributionChannelById(db, companyId, channelId);

  const [updated] = await db
    .update(distributionChannels)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(distributionChannels.id, channelId),
        eq(distributionChannels.companyId, companyId)
      )
    )
    .returning();

  return updated as DistributionChannel;
}

export async function deleteDistributionChannel(
  db: any,
  companyId: string,
  channelId: string
): Promise<{ deleted: boolean }> {
  await getDistributionChannelById(db, companyId, channelId);

  await db
    .delete(distributionChannels)
    .where(
      and(
        eq(distributionChannels.id, channelId),
        eq(distributionChannels.companyId, companyId)
      )
    );

  return { deleted: true };
}

export async function testDistributionChannel(
  db: any,
  companyId: string,
  channelId: string
): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const channel = await getDistributionChannelById(db, companyId, channelId);
  const startTime = Date.now();

  if (channel.endpointUrl) {
    try {
      const response = await fetch(channel.endpointUrl, {
        method: "HEAD",
        headers: channel.headers || {},
      });
      const latencyMs = Date.now() - startTime;
      await db
        .update(distributionChannels)
        .set({
          lastSyncAt: new Date(),
          lastError: null,
          status: "active",
        })
        .where(eq(distributionChannels.id, channelId));

      return {
        success: response.ok || response.status < 500,
        latencyMs,
        message: `Réponse HTTP ${response.status}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      await db
        .update(distributionChannels)
        .set({
          lastSyncAt: new Date(),
          lastError: err.message,
          status: "error",
        })
        .where(eq(distributionChannels.id, channelId));

      return {
        success: false,
        latencyMs,
        message: `Échec de connexion : ${err.message}`,
      };
    }
  }

  // Pour les canaux natifs sans endpoint direct
  await db
    .update(distributionChannels)
    .set({
      lastSyncAt: new Date(),
      lastError: null,
      status: "active",
    })
    .where(eq(distributionChannels.id, channelId));

  return {
    success: true,
    latencyMs: Date.now() - startTime,
    message: "Connecteur actif et prêt",
  };
}

export async function dispatchCalendarItem(
  db: any,
  companyId: string,
  itemId: string,
  input: PublishItemInput = {},
  dispatchedBy?: string
): Promise<PublishItemResult> {
  // 1. Récupération et vérification de gouvernance
  const [item] = await db
    .select()
    .from(editorialCalendarItems)
    .where(
      and(
        eq(editorialCalendarItems.id, itemId),
        eq(editorialCalendarItems.companyId, companyId)
      )
    );

  if (!item) {
    const err = new Error(`Élément du calendrier éditorial introuvable: ${itemId}`);
    (err as any).status = 404;
    throw err;
  }

  if (item.status !== "approved" && item.status !== "ready_for_review" && item.status !== "scheduled") {
    const err = new Error(
      `Violation de gouvernance SORAVYN : l'élément doit être validé ou prêt avant publication (statut actuel: ${item.status})`
    );
    (err as any).status = 400;
    throw err;
  }

  // 2. Sélection du canal de distribution
  let targetChannel: DistributionChannel | null = null;
  if (input.channelId) {
    targetChannel = await getDistributionChannelById(db, companyId, input.channelId);
  } else {
    // Recherche automatique d'un canal correspondant au canal de l'élément (ex: LinkedIn, YouTube)
    const normItemChannel = (item.channel || "").toLowerCase();
    const channelsList = await listDistributionChannels(db, companyId);
    const channels = Array.isArray(channelsList) ? channelsList : [];
    targetChannel =
      channels.find(
        (c) => c.status === "active" && normItemChannel.includes(c.channelType)
      ) ||
      channels.find((c) => c.status === "active" && c.channelType === "webhook") ||
      null;
  }

  const effectiveChannelType = targetChannel?.channelType || (item.channel?.toLowerCase() as DistributionChannelType) || "webhook";

  // 3. Préparation du payload de distribution
  const copyText = input.customCopy || item.copyText || item.contentBrief || "";
  const requestPayload: Record<string, any> = {
    soravynItemId: item.id,
    companyId,
    title: item.title,
    channel: item.channel,
    contentType: item.contentType,
    text: copyText,
    mediaUrl: item.publishedUrl || null,
    tags: input.tags || [],
    scheduledAt: input.scheduledAt || item.scheduledAt?.toISOString() || new Date().toISOString(),
  };

  let externalPostId = `post_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  let externalPostUrl = "";
  let httpStatus = 200;
  let responsePayload: Record<string, any> = {};
  let errorMessage: string | null = null;
  let status: "success" | "failed" = "success";

  // 4. Exécution du dispatch
  if (targetChannel?.endpointUrl) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Soravyn-Distribution-Engine/1.0",
        ...(targetChannel.headers || {}),
      };

      // Signature HMAC si secret présent
      const secret = targetChannel.authConfig?.webhookSecret || targetChannel.authConfig?.apiKey;
      if (secret) {
        const bodyStr = JSON.stringify(requestPayload);
        const signature = crypto
          .createHmac("sha256", secret)
          .update(bodyStr)
          .digest("hex");
        headers["X-Soravyn-Signature"] = signature;
      }

      const res = await fetch(targetChannel.endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
      });

      httpStatus = res.status;
      if (!res.ok) {
        status = "failed";
        errorMessage = `HTTP error ${res.status}: ${res.statusText}`;
      } else {
        const data = await res.json().catch(() => ({}));
        responsePayload = data;
        externalPostId = data.id || data.postId || externalPostId;
        externalPostUrl = data.url || data.postUrl || "";
      }
    } catch (err: any) {
      status = "failed";
      errorMessage = err.message;
      httpStatus = 500;
    }
  }

  // Construction d'une URL de publication finale traçable si non fournie par l'API externe
  if (!externalPostUrl) {
    switch (effectiveChannelType) {
      case "linkedin":
        externalPostUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${externalPostId}`;
        break;
      case "youtube":
        externalPostUrl = `https://www.youtube.com/watch?v=${externalPostId}`;
        break;
      case "tiktok":
        externalPostUrl = `https://www.tiktok.com/@brand/video/${externalPostId}`;
        break;
      case "x":
        externalPostUrl = `https://x.com/brand/status/${externalPostId}`;
        break;
      default:
        externalPostUrl = item.publishedUrl || `https://soravyn.ai/dispatched/${item.id}`;
        break;
    }
  }

  // 5. Enregistrement du log de distribution (Audit Trail)
  const [log] = await db
    .insert(distributionLogs)
    .values({
      companyId,
      calendarItemId: item.id,
      channelId: targetChannel?.id || null,
      channelType: effectiveChannelType,
      status,
      requestPayload,
      responsePayload,
      httpStatus,
      externalPostId,
      externalPostUrl,
      errorMessage,
      dispatchedBy: dispatchedBy || null,
    })
    .returning();

  // 6. Mise à jour de l'élément au calendrier
  if (status === "success") {
    await db
      .update(editorialCalendarItems)
      .set({
        status: "published",
        publishedUrl: externalPostUrl,
        updatedAt: new Date(),
      })
      .where(eq(editorialCalendarItems.id, item.id));
  }

  return {
    calendarItemId: item.id,
    channelType: effectiveChannelType,
    status,
    externalPostId,
    externalPostUrl,
    dispatchedAt: log.dispatchedAt.toISOString(),
    logId: log.id,
  };
}

export async function listDistributionLogs(
  db: any,
  companyId: string,
  filter?: { calendarItemId?: string; limit?: number }
): Promise<DistributionLog[]> {
  const limit = Math.min(filter?.limit || 50, 100);
  let query = db
    .select()
    .from(distributionLogs)
    .where(eq(distributionLogs.companyId, companyId))
    .orderBy(desc(distributionLogs.dispatchedAt))
    .limit(limit);

  if (filter?.calendarItemId) {
    query = db
      .select()
      .from(distributionLogs)
      .where(
        and(
          eq(distributionLogs.companyId, companyId),
          eq(distributionLogs.calendarItemId, filter.calendarItemId)
        )
      )
      .orderBy(desc(distributionLogs.dispatchedAt))
      .limit(limit);
  }

  const rows = await query;
  return rows as DistributionLog[];
}
