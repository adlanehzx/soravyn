import { Router, type Request } from "express";
import type { Db } from "@soravyn/db";
import {
  batchMetricsInputSchema,
  triggerFeedbackLoopInputSchema,
} from "@soravyn/shared";
import {
  recordPerformanceMetrics,
  getAnalyticsOverview,
  runBrandMemoryFeedbackLoop,
  listStrategicInsights,
} from "../services/marketing-analytics.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { validate } from "../middleware/validate.js";
import { logActivity } from "../services/activity-log.js";

export function marketingAnalyticsRoutes(db: Db): Router {
  const router = Router();
  const base = "/companies/:companyId/studio/analytics";

  // Isolation Guard
  router.use(base, (req, res, next) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      assertBoard(req);
    }
    next();
  });

  // 1. Ingestion de métriques de performance en batch
  router.post(
    `${base}/metrics`,
    validate(batchMetricsInputSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const actor = getActorInfo(req);
      const metrics = await recordPerformanceMetrics(
        db,
        companyId,
        req.body.metrics
      );

      logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "created",
        entityType: "issue",
        entityId: companyId,
      });

      res.status(201).json({ count: metrics.length, metrics });
    }
  );

  // 2. Tableau de bord analytique consolidé
  router.get(`${base}/overview`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const timeframeDays = req.query.timeframeDays
      ? parseInt(req.query.timeframeDays as string, 10)
      : 30;

    const overview = await getAnalyticsOverview(db, companyId, timeframeDays);
    res.json({ overview });
  });

  // 3. Déclenchement de la boucle d'apprentissage & feedback vers Brand Memory
  router.post(
    `${base}/feedback-loop`,
    validate(triggerFeedbackLoopInputSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const actor = getActorInfo(req);
      const result = await runBrandMemoryFeedbackLoop(db, companyId, req.body);

      logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "updated",
        entityType: "issue",
        entityId: companyId,
      });

      res.json({ result });
    }
  );

  // 4. Liste des recommandations et insights stratégiques
  router.get(`${base}/insights`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const insights = await listStrategicInsights(db, companyId, limit);
    res.json({ insights });
  });

  return router;
}
