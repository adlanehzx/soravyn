import { templateCatalog } from "../services/video-templates.js";
import { localScriptConfig } from "../services/video-script.js";
import { Router } from "express";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { assets, brandProfiles, campaigns, videoJobs, approvals, campaignWorkflows, campaignDeliverables, type Db } from "@soravyn/db";
import { z } from "zod";
import { join } from "node:path";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { validate } from "../middleware/validate.js";
import { conflict, notFound, unprocessable } from "../errors.js";
import { videoInput, parseVideoJobInput, videoRoot } from "../services/video-contract.js";
import { logActivity } from "../services/activity-log.js";
export function videoJobRoutes(db: Db) {
 const router=Router(); const base="/companies/:companyId/video";
 router.use(base, (req,_res,next)=>{ z.string().uuid().parse(req.params.companyId);assertCompanyAccess(req, req.params.companyId as string);assertBoard(req);next(); });
 router.get(`${base}/templates`,(_req,res)=>res.json(templateCatalog));
 router.get(`${base}/media`,async(req,res)=>{
  const rows=await db.select({id:assets.id,name:assets.originalFilename,contentType:assets.contentType,byteSize:assets.byteSize}).from(assets).where(and(eq(assets.companyId,req.params.companyId as string),inArray(assets.contentType,["image/png","image/jpeg","image/jpg","image/webp"]))).orderBy(desc(assets.createdAt)).limit(100);res.json(rows);
 });
 router.get(`${base}/jobs`,async(req,res)=>{
  const rows=await db.select({job:videoJobs,reviewStatus:approvals.status}).from(videoJobs).leftJoin(approvals,and(eq(videoJobs.approvalId,approvals.id),eq(videoJobs.companyId,approvals.companyId))).where(eq(videoJobs.companyId,req.params.companyId as string)).orderBy(desc(videoJobs.createdAt)).limit(100);
  res.json(rows.map(r=>({...r.job,reviewStatus:r.reviewStatus})));
 });
 router.get(`${base}/jobs/:id`,async(req,res)=>{
  const [job]=await db.select().from(videoJobs).where(and(eq(videoJobs.id,z.string().uuid().parse(req.params.id)),eq(videoJobs.companyId,req.params.companyId as string)));if(!job)throw notFound("Production not found");res.json(job);
 });
 router.get(`${base}/script-provider`,(_req,res)=>{const config=localScriptConfig();res.json({provider:"ollama-local",configured:!!config.model,model:config.model});});
 router.post(`${base}/campaigns/:campaignId/script`,validate(z.object({platform:z.enum(["tiktok","reels","shorts","youtube","square"])}).strict()),async(req,res)=>{
  const config=localScriptConfig();if(!config.model)throw unprocessable("Local script model is not configured");
  const companyId=req.params.companyId as string;const campaignId=z.string().uuid().parse(req.params.campaignId);
  const [campaign]=await db.select().from(campaigns).where(and(eq(campaigns.id,campaignId),eq(campaigns.companyId,companyId)));if(!campaign)throw notFound("Campaign not found");
  const [brand]=await db.select().from(brandProfiles).where(eq(brandProfiles.companyId,companyId));if(!brand)throw unprocessable("Configure the client brand first");
  const [job]=await db.insert(videoJobs).values({companyId,campaignId,input:{kind:"script",platform:req.body.platform,campaignName:campaign.name,brand:{name:brand.name,colors:brand.colors},context:{campaign:{name:campaign.name,brief:campaign.brief,objectives:campaign.objectives,audience:campaign.audience},brand:{name:brand.name,description:brand.description,tone:brand.tone,languages:brand.languages}}},events:[{stage:"script_queued",at:new Date().toISOString()}]}).returning();
  await logActivity(db,{companyId,...getActorInfo(req),action:"video.script_queued",entityType:"video_job",entityId:job.id});res.status(201).json(job);
 });
 router.post(`${base}/campaigns/:campaignId/previews`,validate(z.object({input:videoInput,sceneIndex:z.number().int().min(0).max(11)}).strict()),async(req,res)=>{
  const companyId=req.params.companyId as string;const campaignId=z.string().uuid().parse(req.params.campaignId);
  const [campaign]=await db.select().from(campaigns).where(and(eq(campaigns.id,campaignId),eq(campaigns.companyId,companyId)));if(!campaign)throw notFound("Campaign not found");
  const [brand]=await db.select().from(brandProfiles).where(eq(brandProfiles.companyId,companyId));if(!brand)throw unprocessable("Configure the client brand first");
  const [workflow]=await db.select().from(campaignWorkflows).where(and(eq(campaignWorkflows.companyId,companyId),eq(campaignWorkflows.campaignId,campaignId)));
  const input=videoInput.parse(req.body.input);const scene=input.scenes[req.body.sceneIndex];if(!scene)throw unprocessable("Scene does not exist");
  if(scene.imageAssetId){const [asset]=await db.select().from(assets).where(and(eq(assets.id,scene.imageAssetId),eq(assets.companyId,companyId)));if(!asset||asset.byteSize>10*1024*1024||!["image/png","image/jpeg","image/webp"].includes(asset.contentType))throw unprocessable("Scene image must belong to this client");}
  const start=input.scenes.slice(0,req.body.sceneIndex).reduce((n,s)=>n+s.duration*1000,0);const end=start+scene.duration*1000;
  const captionCues=input.captionCues?.filter(cue=>cue.startMs<end&&cue.endMs>start).map(cue=>({...cue,startMs:Math.max(0,cue.startMs-start),endMs:Math.min(end,cue.endMs)-start}));
  const clip=videoInput.parse({...input,scenes:[{...scene,duration:Math.max(5,scene.duration)}],captionCues});
  const [job]=await db.insert(videoJobs).values({companyId,campaignId,input:{...clip,kind:"scene_preview",previewSceneIndex:req.body.sceneIndex,brand:workflow?.brandSnapshot||brand,campaignName:campaign.name},events:[{stage:"scene_preview_queued",at:new Date().toISOString()}]}).returning();
  await logActivity(db,{companyId,...getActorInfo(req),action:"video.scene_preview_queued",entityType:"video_job",entityId:job.id});res.status(201).json(job);
 });
 router.post(`${base}/campaigns/:campaignId/jobs`,validate(videoInput),async(req,res)=>{
  const companyId=req.params.companyId as string;const campaignId=z.string().uuid().parse(req.params.campaignId);
  const [campaign]=await db.select().from(campaigns).where(and(eq(campaigns.id,campaignId),eq(campaigns.companyId,companyId)));
  if(!campaign)throw notFound("Campaign not found");
  const [brand]=await db.select().from(brandProfiles).where(eq(brandProfiles.companyId,companyId));
  if(!brand)throw unprocessable("Configure the client's brand before rendering");
  const [workflow]=await db.select().from(campaignWorkflows).where(and(eq(campaignWorkflows.campaignId,campaignId),eq(campaignWorkflows.companyId,companyId)));
  if(workflow)throw conflict("Render this workflow through its approved storyboard");
  for(const scene of req.body.scenes){if(scene.imageAssetId){const [asset]=await db.select().from(assets).where(and(eq(assets.id,scene.imageAssetId),eq(assets.companyId,companyId)));if(!asset||!["image/png","image/jpeg","image/jpg","image/webp"].includes(asset.contentType)||asset.byteSize>10*1024*1024)throw unprocessable("Image must belong to this client and be PNG/JPEG/WebP under 10 MB");}}
  const [job]=await db.insert(videoJobs).values({companyId,campaignId,input:{...req.body,brand:{name:brand.name,colors:brand.colors,fontFamily:brand.fontFamily,logoAssetId:brand.logoAssetId,logoLicense:brand.logoLicense},campaignName:campaign.name},events:[{stage:"queued",at:new Date().toISOString()}]}).returning();
  await logActivity(db,{companyId,...getActorInfo(req),action:"video.queued",entityType:"video_job",entityId:job.id});res.status(201).json(job);
 });
 router.post(`${base}/jobs/:id/revisions`,validate(z.object({sceneIndex:z.number().int().min(0).max(11),title:z.string().trim().min(1).max(90),text:z.string().trim().min(1).max(260),note:z.string().trim().min(1).max(2000)}).strict()),async(req,res)=>{
  const companyId=req.params.companyId as string;const id=z.string().uuid().parse(req.params.id);
  const [parent]=await db.select().from(videoJobs).where(and(eq(videoJobs.id,id),eq(videoJobs.companyId,companyId)));
  if(!parent||parent.status!=="succeeded")throw notFound("A completed source video is required");
  const parsed=parseVideoJobInput(parent.input);
  if(!parsed.scenes[req.body.sceneIndex])throw unprocessable("Scene does not exist");
  const scenes=parsed.scenes.map((scene,index)=>index===req.body.sceneIndex?{...scene,speech:scene.speech||scene.text,title:req.body.title,text:req.body.text}:scene);
  const job=await db.transaction(async tx=>{
   if(typeof parent.input.deliverableId==="string"){
    await tx.select().from(campaignWorkflows).where(and(eq(campaignWorkflows.campaignId,parent.campaignId),eq(campaignWorkflows.companyId,companyId))).for("update");
    const [current]=await tx.select().from(campaignDeliverables).where(and(eq(campaignDeliverables.id,parent.input.deliverableId),eq(campaignDeliverables.companyId,companyId),eq(campaignDeliverables.videoJobId,parent.id)));
    if(!current)throw conflict("Revise the current video version, not an obsolete workflow render");
   }
   const [created]=await tx.insert(videoJobs).values({companyId,campaignId:parent.campaignId,input:{...parent.input,scenes,revisionOf:id,revisionNote:req.body.note},events:[{stage:"revision_queued",at:new Date().toISOString()}]}).returning();
   if(typeof parent.input.deliverableId==="string"){
    await tx.update(campaignDeliverables).set({videoJobId:created.id}).where(and(eq(campaignDeliverables.id,parent.input.deliverableId),eq(campaignDeliverables.companyId,companyId)));
    await tx.update(campaigns).set({status:"production",updatedAt:new Date()}).where(and(eq(campaigns.id,parent.campaignId),eq(campaigns.companyId,companyId)));
   }
   return created;
  });
  await logActivity(db,{companyId,...getActorInfo(req),action:"video.revision_queued",entityType:"video_job",entityId:job.id,details:{parentJobId:id,sceneIndex:req.body.sceneIndex}});
  res.status(201).json(job);
 });
 router.post(`${base}/jobs/:id/cancel`,async(req,res)=>{
  const companyId=req.params.companyId as string;const id=z.string().uuid().parse(req.params.id);
  const [job]=await db.update(videoJobs).set({status:"cancelled",leaseToken:null,leaseUntil:null,updatedAt:new Date(),events:sql`${videoJobs.events} || ${JSON.stringify([{stage:"cancelled",at:new Date().toISOString()}])}::jsonb`}).where(and(eq(videoJobs.id,id),eq(videoJobs.companyId,companyId),inArray(videoJobs.status,["queued","running"]))).returning();
  if(!job)throw conflict("Only queued or running jobs belonging to this client can be cancelled");
  await logActivity(db,{companyId,...getActorInfo(req),action:"video.cancelled",entityType:"video_job",entityId:id});res.json(job);
 });
 router.post(`${base}/jobs/:id/retry`,async(req,res)=>{
  const companyId=req.params.companyId as string;const id=z.string().uuid().parse(req.params.id);
  const [job]=await db.update(videoJobs).set({status:"queued",error:null,attempts:0,events:sql`${videoJobs.events} || ${JSON.stringify([{stage:"retry_queued",at:new Date().toISOString()}])}::jsonb`,updatedAt:new Date()}).where(and(eq(videoJobs.id,id),eq(videoJobs.companyId,companyId),inArray(videoJobs.status,["failed","cancelled"]))).returning();
  if(!job)throw conflict("Only failed or cancelled jobs belonging to this client can be retried");
  await logActivity(db,{companyId,...getActorInfo(req),action:"video.retry_requested",entityType:"video_job",entityId:id});res.json(job);
 });
 router.get(`${base}/jobs/:id/files/:file`,async(req,res)=>{
  const companyId=req.params.companyId as string;const id=z.string().uuid().parse(req.params.id);
  const file=z.enum(["preview.mp4","output.mp4","brief.json","storyboard.json","report.json","index.html","captions.srt","narration.wav","assets.manifest.json"]).parse(req.params.file);
  const [job]=await db.select().from(videoJobs).where(and(eq(videoJobs.id,id),eq(videoJobs.companyId,companyId)));
  if(!job || (job.status!=="succeeded" && !(job.status==="audio_ready" && file==="narration.wav") && !(job.status==="preview_ready" && ["preview.mp4","report.json","captions.srt"].includes(file))))throw notFound("Artifact not available");
  // HTML is downloaded, never executed within the authenticated application origin.
  res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Content-Security-Policy","sandbox; default-src 'none'");
  res.download(join(videoRoot(),companyId,id,file),file,{dotfiles:"allow"});
 });
 return router;
}
