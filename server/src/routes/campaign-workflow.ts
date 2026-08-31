import { heartbeatService } from "../services/heartbeat.js";
import { campaignDeliveryService } from "../services/campaign-delivery.js";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "@soravyn/db";
import { WORKFLOW_STAGES, startCampaignWorkflowSchema, submitCampaignDeliverableSchema, authorizeCampaignTaskSchema, scheduleCampaignVideoSchema, recordCampaignDeliverySchema, campaignMeasurementSchema } from "@soravyn/shared";
import { campaignWorkflowService } from "../services/campaign-workflow.js";
import { validate } from "../middleware/validate.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
export function campaignWorkflowRoutes(db:Db){
 const router=Router();const base="/companies/:companyId/studio/campaigns/:campaignId/workflow";const svc=campaignWorkflowService(db);
 router.use(base,(req,_res,next)=>{z.string().uuid().parse(req.params.companyId);z.string().uuid().parse(req.params.campaignId);assertCompanyAccess(req,req.params.companyId as string);next();});
 const actor=(req:Parameters<typeof getActorInfo>[0])=>{const a=getActorInfo(req);return {type:a.actorType,id:a.actorId,runId:a.runId};};
 router.get(base,async(req,res)=>res.json(await svc.get(req.params.companyId as string,req.params.campaignId as string)));
 router.post(base,validate(startCampaignWorkflowSchema),async(req,res)=>{assertBoard(req);res.status(201).json(await svc.start(req.params.companyId as string,req.params.campaignId as string,req.body,actor(req)));});
 router.post(`${base}/:kind/authorize`,validate(authorizeCampaignTaskSchema),async(req,res)=>{
  assertBoard(req);const stage=await svc.authorize(req.params.companyId as string,req.params.campaignId as string,z.enum(WORKFLOW_STAGES).parse(req.params.kind),actor(req));
  try{const run=await heartbeatService(db).wakeup(stage.agentId,{source:"assignment",triggerDetail:"system",reason:"campaign_stage_authorized",payload:{issueId:stage.taskId},requestedByActorType:"user",requestedByActorId:req.actor.userId,contextSnapshot:{issueId:stage.taskId,source:"campaign.workflow.authorize"}});res.json({...stage,wakeRequested:!!run,runId:run?.id||null,...(!run?{warning:"Task authorized; agent wake policy deferred or disabled the execution. Check AI Workforce."}:{})});}
  catch{res.json({...stage,wakeRequested:false,warning:"Task is authorized; the runtime could not be started. Check the agent configuration and retry from AI Workforce."});}
 });
 router.post(`${base}/:kind/deliverables`,validate(submitCampaignDeliverableSchema),async(req,res)=>res.status(201).json(await svc.submit(req.params.companyId as string,req.params.campaignId as string,z.enum(WORKFLOW_STAGES).parse(req.params.kind),req.body.content,actor(req))));
 router.post(`${base}/render`,async(req,res)=>{assertBoard(req);res.status(201).json(await svc.render(req.params.companyId as string,req.params.campaignId as string,actor(req)));});
 router.get(`${base}/schedule`,async(req,res)=>res.json(await campaignDeliveryService(db).list(req.params.companyId as string,req.params.campaignId as string)));
 router.post(`${base}/schedule`,validate(scheduleCampaignVideoSchema),async(req,res)=>{assertBoard(req);res.status(201).json(await campaignDeliveryService(db).schedule(req.params.companyId as string,req.params.campaignId as string,req.body,req.actor.userId!));});
 router.post(`${base}/schedule/:slotId/delivered`,validate(recordCampaignDeliverySchema),async(req,res)=>{assertBoard(req);res.json(await campaignDeliveryService(db).delivered(req.params.companyId as string,req.params.campaignId as string,z.string().uuid().parse(req.params.slotId),req.body.externalUrl,req.actor.userId!));});
 router.post(`${base}/schedule/:slotId/cancel`,validate(z.object({}).strict()),async(req,res)=>{assertBoard(req);res.json(await campaignDeliveryService(db).cancel(req.params.companyId as string,req.params.campaignId as string,z.string().uuid().parse(req.params.slotId),req.actor.userId!));});
 router.post(`${base}/measurements`,validate(campaignMeasurementSchema),async(req,res)=>{assertBoard(req);res.status(201).json(await campaignDeliveryService(db).measure(req.params.companyId as string,req.params.campaignId as string,req.body,req.actor.userId!));});
 router.get(`${base}/report`,async(req,res)=>{const report=await svc.report(req.params.companyId as string,req.params.campaignId as string);res.setHeader("Content-Disposition",'attachment; filename="campaign-report.json"');res.json(report);});
 return router;
}
