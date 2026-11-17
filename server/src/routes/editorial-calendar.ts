import { Router } from "express";
import type { Request, Response } from "express";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import {
  createEditorialCalendarItemSchema,
  updateEditorialCalendarItemSchema,
  generateCalendarFromPlanSchema,
  editorialCalendarFilterSchema,
} from "@soravyn/shared";
import {
  listEditorialCalendarItems,
  getEditorialCalendarItemById,
  createEditorialCalendarItem,
  updateEditorialCalendarItem,
  deleteEditorialCalendarItem,
  generateCalendarFromPlan,
  getEditorialCalendarStats,
} from "../services/editorial-calendar.js";

export function createEditorialCalendarRouter(db: any): Router {
  const router = Router({ mergeParams: true });

  // List calendar items
  router.get("/", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const filterResult = editorialCalendarFilterSchema.safeParse(req.query);
      const filter = filterResult.success ? filterResult.data : undefined;

      const items = await listEditorialCalendarItems(db, companyId, filter);
      res.json({ items });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list editorial calendar items" });
    }
  });

  // Calendar stats
  router.get("/stats", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const periodMonth = typeof req.query.periodMonth === "string" ? req.query.periodMonth : undefined;
      const stats = await getEditorialCalendarStats(db, companyId, periodMonth);
      res.json({ stats });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to get editorial calendar stats" });
    }
  });

  // Get single calendar item
  router.get("/:itemId", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const item = await getEditorialCalendarItemById(db, companyId, req.params.itemId as string);
      res.json({ item });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to fetch calendar item" });
    }
  });

  // Create new calendar item
  router.post("/", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);

      const parsed = createEditorialCalendarItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid calendar item payload", details: parsed.error.issues });
      }

      const item = await createEditorialCalendarItem(
        db,
        companyId,
        parsed.data,
        actor.actorType === "user" ? actor.actorId : undefined
      );
      res.status(201).json({ item });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to create calendar item" });
    }
  });

  // Update calendar item
  router.put("/:itemId", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const parsed = updateEditorialCalendarItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid calendar item update", details: parsed.error.issues });
      }

      const item = await updateEditorialCalendarItem(db, companyId, req.params.itemId as string, parsed.data);
      res.json({ item });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update calendar item" });
    }
  });

  // Delete calendar item
  router.delete("/:itemId", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const result = await deleteEditorialCalendarItem(db, companyId, req.params.itemId as string);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to delete calendar item" });
    }
  });

  // Generate calendar from marketing plan
  router.post("/generate-from-plan", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);

      const parsed = generateCalendarFromPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid plan generation payload", details: parsed.error.issues });
      }

      const result = await generateCalendarFromPlan(
        db,
        companyId,
        parsed.data,
        actor.actorType === "user" ? actor.actorId : undefined
      );
      res.status(201).json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to generate calendar from plan" });
    }
  });

  return router;
}

export function editorialCalendarRoutes(db: any): Router {
  const router = Router();
  router.use("/companies/:companyId/studio/calendar", createEditorialCalendarRouter(db));
  return router;
}
