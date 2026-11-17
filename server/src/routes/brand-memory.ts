import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  brandProducts,
  brandPersonas,
  brandObjections,
  brandSources,
  type Db,
} from "@soravyn/db";
import {
  brandProductInputSchema,
  brandPersonaInputSchema,
  brandObjectionInputSchema,
  brandSourceInputSchema,
  prepareBriefInputSchema,
} from "@soravyn/shared";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { validate } from "../middleware/validate.js";
import { logActivity } from "../services/activity-log.js";
import { notFound, unprocessable } from "../errors.js";
import {
  getBrandMemoryContext,
  evaluateAndPrepareBrief,
} from "../services/brand-memory.js";

export function brandMemoryRoutes(db: Db) {
  const router = Router();
  const base = "/companies/:companyId/studio/brand";

  router.use(base, (req, _res, next) => {
    const companyId = z.string().uuid().parse(req.params.companyId);
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    next();
  });

  // Consolidated Brand Memory Context
  router.get(`${base}/memory`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const context = await getBrandMemoryContext(db, companyId);
    res.json(context);
  });

  // Brief Preparation & Gap Analysis
  router.post(`${base}/prepare-brief`, validate(prepareBriefInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const context = await getBrandMemoryContext(db, companyId);
    const result = evaluateAndPrepareBrief(context, req.body);
    res.json(result);
  });

  // --- Products & Offers CRUD ---
  router.get(`${base}/products`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const items = await db
      .select()
      .from(brandProducts)
      .where(eq(brandProducts.companyId, companyId))
      .orderBy(desc(brandProducts.createdAt));
    res.json(items);
  });

  router.post(`${base}/products`, validate(brandProductInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const [item] = await db
      .insert(brandProducts)
      .values({ ...req.body, companyId })
      .returning();
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_product.created",
      entityType: "brand_product",
      entityId: item.id,
    });
    res.status(201).json(item);
  });

  router.put(`${base}/products/:productId`, validate(brandProductInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const productId = z.string().uuid().parse(req.params.productId);
    const [item] = await db
      .update(brandProducts)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(brandProducts.id, productId), eq(brandProducts.companyId, companyId)))
      .returning();
    if (!item) throw notFound("Brand product not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_product.updated",
      entityType: "brand_product",
      entityId: item.id,
    });
    res.json(item);
  });

  router.delete(`${base}/products/:productId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const productId = z.string().uuid().parse(req.params.productId);
    const [item] = await db
      .delete(brandProducts)
      .where(and(eq(brandProducts.id, productId), eq(brandProducts.companyId, companyId)))
      .returning();
    if (!item) throw notFound("Brand product not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_product.deleted",
      entityType: "brand_product",
      entityId: item.id,
    });
    res.json({ success: true, id: item.id });
  });

  // --- Personas CRUD ---
  router.get(`${base}/personas`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const items = await db
      .select()
      .from(brandPersonas)
      .where(eq(brandPersonas.companyId, companyId))
      .orderBy(desc(brandPersonas.createdAt));
    res.json(items);
  });

  router.post(`${base}/personas`, validate(brandPersonaInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const [item] = await db
      .insert(brandPersonas)
      .values({ ...req.body, companyId })
      .returning();
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_persona.created",
      entityType: "brand_persona",
      entityId: item.id,
    });
    res.status(201).json(item);
  });

  router.put(`${base}/personas/:personaId`, validate(brandPersonaInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const personaId = z.string().uuid().parse(req.params.personaId);
    const [item] = await db
      .update(brandPersonas)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(brandPersonas.id, personaId), eq(brandPersonas.companyId, companyId)))
      .returning();
    if (!item) throw notFound("Brand persona not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_persona.updated",
      entityType: "brand_persona",
      entityId: item.id,
    });
    res.json(item);
  });

  router.delete(`${base}/personas/:personaId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const personaId = z.string().uuid().parse(req.params.personaId);
    const [item] = await db
      .delete(brandPersonas)
      .where(and(eq(brandPersonas.id, personaId), eq(brandPersonas.companyId, companyId)))
      .returning();
    if (!item) throw notFound("Brand persona not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_persona.deleted",
      entityType: "brand_persona",
      entityId: item.id,
    });
    res.json({ success: true, id: item.id });
  });

  // --- Objections CRUD ---
  router.get(`${base}/objections`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const items = await db
      .select()
      .from(brandObjections)
      .where(eq(brandObjections.companyId, companyId))
      .orderBy(desc(brandObjections.createdAt));
    res.json(items);
  });

  router.post(`${base}/objections`, validate(brandObjectionInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    if (req.body.productId) {
      const [product] = await db
        .select()
        .from(brandProducts)
        .where(and(eq(brandProducts.id, req.body.productId), eq(brandProducts.companyId, companyId)));
      if (!product) throw unprocessable("Linked product not found in this client");
    }
    const [item] = await db
      .insert(brandObjections)
      .values({ ...req.body, companyId })
      .returning();
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_objection.created",
      entityType: "brand_objection",
      entityId: item.id,
    });
    res.status(201).json(item);
  });

  router.put(`${base}/objections/:objectionId`, validate(brandObjectionInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const objectionId = z.string().uuid().parse(req.params.objectionId);
    if (req.body.productId) {
      const [product] = await db
        .select()
        .from(brandProducts)
        .where(and(eq(brandProducts.id, req.body.productId), eq(brandProducts.companyId, companyId)));
      if (!product) throw unprocessable("Linked product not found in this client");
    }
    const [item] = await db
      .update(brandObjections)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(brandObjections.id, objectionId), eq(brandObjections.companyId, companyId)))
      .returning();
    if (!item) throw notFound("Brand objection not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_objection.updated",
      entityType: "brand_objection",
      entityId: item.id,
    });
    res.json(item);
  });

  router.delete(`${base}/objections/:objectionId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const objectionId = z.string().uuid().parse(req.params.objectionId);
    const [item] = await db
      .delete(brandObjections)
      .where(and(eq(brandObjections.id, objectionId), eq(brandObjections.companyId, companyId)))
      .returning();
    if (!item) throw notFound("Brand objection not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_objection.deleted",
      entityType: "brand_objection",
      entityId: item.id,
    });
    res.json({ success: true, id: item.id });
  });

  // --- Sources & Documents CRUD ---
  router.get(`${base}/sources`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const items = await db
      .select()
      .from(brandSources)
      .where(eq(brandSources.companyId, companyId))
      .orderBy(desc(brandSources.createdAt));
    res.json(items);
  });

  router.post(`${base}/sources`, validate(brandSourceInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const [item] = await db
      .insert(brandSources)
      .values({ ...req.body, companyId })
      .returning();
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_source.created",
      entityType: "brand_source",
      entityId: item.id,
    });
    res.status(201).json(item);
  });

  router.put(`${base}/sources/:sourceId`, validate(brandSourceInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const sourceId = z.string().uuid().parse(req.params.sourceId);
    const [item] = await db
      .update(brandSources)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(brandSources.id, sourceId), eq(brandSources.companyId, companyId)))
      .returning();
    if (!item) throw notFound("Brand source not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_source.updated",
      entityType: "brand_source",
      entityId: item.id,
    });
    res.json(item);
  });

  router.delete(`${base}/sources/:sourceId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const sourceId = z.string().uuid().parse(req.params.sourceId);
    const [item] = await db
      .delete(brandSources)
      .where(and(eq(brandSources.id, sourceId), eq(brandSources.companyId, companyId)))
      .returning();
    if (!item) throw notFound("Brand source not found");
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      ...actor,
      action: "brand_source.deleted",
      entityType: "brand_source",
      entityId: item.id,
    });
    res.json({ success: true, id: item.id });
  });

  return router;
}
