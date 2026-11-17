import { Router } from "express";
import { type Db } from "@soravyn/db";
import {
  createDistributionChannelSchema,
  updateDistributionChannelSchema,
  publishItemInputSchema,
} from "@soravyn/shared";
import { validate } from "../middleware/validate.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { logActivity } from "../services/activity-log.js";
import {
  listDistributionChannels,
  getDistributionChannelById,
  createDistributionChannel,
  updateDistributionChannel,
  deleteDistributionChannel,
  testDistributionChannel,
  dispatchCalendarItem,
  listDistributionLogs,
} from "../services/distribution.js";

export function distributionRoutes(db: Db) {
  const router = Router();
  const base = "/companies/:companyId/distribution";

  router.use(base, (req, _res, next) => {
    assertCompanyAccess(req, req.params.companyId as string);
    assertBoard(req);
    next();
  });

  // 1. Canaux de distribution
  router.get(`${base}/channels`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const channels = await listDistributionChannels(db, companyId);
    res.json({ channels });
  });

  router.get(`${base}/channels/:channelId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const channel = await getDistributionChannelById(
      db,
      companyId,
      req.params.channelId
    );
    res.json({ channel });
  });

  router.post(
    `${base}/channels`,
    validate(createDistributionChannelSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const channel = await createDistributionChannel(db, companyId, req.body);
      const actor = getActorInfo(req);

      logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "created",
        entityType: "issue",
        entityId: channel.id,
        details: {
          channelType: channel.channelType,
          name: channel.name,
        },
      });

      res.status(201).json({ channel });
    }
  );

  router.patch(
    `${base}/channels/:channelId`,
    validate(updateDistributionChannelSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const channelId = req.params.channelId as string;
      const channel = await updateDistributionChannel(
        db,
        companyId,
        channelId,
        req.body
      );
      res.json({ channel });
    }
  );

  router.delete(`${base}/channels/:channelId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const channelId = req.params.channelId as string;
    const result = await deleteDistributionChannel(
      db,
      companyId,
      channelId
    );
    res.json(result);
  });

  router.post(`${base}/channels/:channelId/test`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const channelId = req.params.channelId as string;
    const result = await testDistributionChannel(
      db,
      companyId,
      channelId
    );
    res.json(result);
  });

  // 2. Publication & Dispatch de contenu éditorial
  router.post(
    `${base}/calendar/:itemId/publish`,
    validate(publishItemInputSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const itemId = req.params.itemId as string;
      const actor = getActorInfo(req);
      const result = await dispatchCalendarItem(
        db,
        companyId,
        itemId,
        req.body,
        actor.actorId
      );

      logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "updated",
        entityType: "issue",
        entityId: result.calendarItemId,
        details: {
          status: result.status,
          channelType: result.channelType,
          externalPostUrl: result.externalPostUrl,
        },
      });

      res.json({ result });
    }
  );

  // 3. Logs et audit trail
  router.get(`${base}/logs`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const calendarItemId = req.query.calendarItemId as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const logs = await listDistributionLogs(db, companyId, {
      calendarItemId,
      limit,
    });
    res.json({ logs });
  });

  return router;
}
