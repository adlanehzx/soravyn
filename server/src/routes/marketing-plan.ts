import { Router } from "express";
import { z } from "zod";
import type { Db } from "@soravyn/db";
import {
  generateMarketingPlanInputSchema,
  marketingPlanInputSchema,
  marketingPlanUpdateSchema,
  marketingPlanThemeInputSchema,
  marketingPlanProposalInputSchema,
  submitPlanValidationInputSchema,
} from "@soravyn/shared";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { validate } from "../middleware/validate.js";
import {
  listMarketingPlans,
  getMarketingPlanById,
  generateMarketingPlan,
  createMarketingPlan,
  updateMarketingPlan,
  deleteMarketingPlan,
  addOrUpdateTheme,
  deleteTheme,
  addOrUpdateProposal,
  deleteProposal,
  submitPlanForValidation,
  resolvePlanApproval,
  convertProposalToCampaign,
} from "../services/marketing-plan.js";

const resolveApprovalInputSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  decisionNote: z.string().trim().max(2000).optional(),
}).strict();

export function marketingPlanRoutes(db: Db) {
  const router = Router();
  const base = "/companies/:companyId/studio/plans";

  router.use(base, (req, _res, next) => {
    const companyId = z.string().uuid().parse(req.params.companyId);
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    next();
  });

  // List marketing plans
  router.get(base, async (req, res) => {
    const companyId = req.params.companyId as string;
    const list = await listMarketingPlans(db, companyId);
    res.json(list);
  });

  // Automated plan generation
  router.post(`${base}/generate`, validate(generateMarketingPlanInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const actor = getActorInfo(req);
    const plan = await generateMarketingPlan(db, companyId, req.body, actor.actorId);
    res.status(201).json(plan);
  });

  // Create manual draft plan
  router.post(base, validate(marketingPlanInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const actor = getActorInfo(req);
    const plan = await createMarketingPlan(db, companyId, req.body, actor.actorId);
    res.status(201).json(plan);
  });

  // Get plan by ID
  router.get(`${base}/:planId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const plan = await getMarketingPlanById(db, companyId, planId);
    res.json(plan);
  });

  // Update plan
  router.put(`${base}/:planId`, validate(marketingPlanUpdateSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const updated = await updateMarketingPlan(db, companyId, planId, req.body);
    res.json(updated);
  });

  // Delete plan
  router.delete(`${base}/:planId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    await deleteMarketingPlan(db, companyId, planId);
    res.status(204).end();
  });

  // Themes
  router.post(`${base}/:planId/themes`, validate(marketingPlanThemeInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const theme = await addOrUpdateTheme(db, companyId, planId, req.body);
    res.status(201).json(theme);
  });

  router.put(`${base}/:planId/themes/:themeId`, validate(marketingPlanThemeInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const themeId = z.string().uuid().parse(req.params.themeId);
    const theme = await addOrUpdateTheme(db, companyId, planId, req.body, themeId);
    res.json(theme);
  });

  router.delete(`${base}/:planId/themes/:themeId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const themeId = z.string().uuid().parse(req.params.themeId);
    await deleteTheme(db, companyId, planId, themeId);
    res.status(204).end();
  });

  // Proposals
  router.post(`${base}/:planId/proposals`, validate(marketingPlanProposalInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const proposal = await addOrUpdateProposal(db, companyId, planId, req.body);
    res.status(201).json(proposal);
  });

  router.put(`${base}/:planId/proposals/:proposalId`, validate(marketingPlanProposalInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const proposalId = z.string().uuid().parse(req.params.proposalId);
    const proposal = await addOrUpdateProposal(db, companyId, planId, req.body, proposalId);
    res.json(proposal);
  });

  router.delete(`${base}/:planId/proposals/:proposalId`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const proposalId = z.string().uuid().parse(req.params.proposalId);
    await deleteProposal(db, companyId, planId, proposalId);
    res.status(204).end();
  });

  // Governance validation submission
  router.post(`${base}/:planId/submit-validation`, validate(submitPlanValidationInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const actor = getActorInfo(req);
    const plan = await submitPlanForValidation(db, companyId, planId, actor.actorId, req.body.notes);
    res.json(plan);
  });

  // Resolve plan approval (Approve / Reject)
  router.post(`${base}/:planId/resolve-approval`, validate(resolveApprovalInputSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const actor = getActorInfo(req);
    const plan = await resolvePlanApproval(db, companyId, planId, req.body.decision, actor.actorId, req.body.decisionNote);
    res.json(plan);
  });

  // Convert proposal to live Campaign Studio campaign
  router.post(`${base}/:planId/proposals/:proposalId/convert`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const planId = z.string().uuid().parse(req.params.planId);
    const proposalId = z.string().uuid().parse(req.params.proposalId);
    const actor = getActorInfo(req);
    const result = await convertProposalToCampaign(db, companyId, planId, proposalId, actor.actorId);
    res.status(201).json(result);
  });

  return router;
}
