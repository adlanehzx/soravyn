import { z } from "zod";
import { sandboxPreparationCode, sandboxRenderCode, sandboxVoicePreviewCode } from "./services/render-sandbox.js";
import { artifactSet, artifactHash, describeArtifacts, verifyArtifacts, narrationFingerprint } from "./services/render-artifacts.js";
import { durableSteps } from "./services/production-steps.js";
import { generateCampaignPack } from "./services/campaign-creative.js";
import { loadConfig } from "./config.js";
import { resolveEmbeddedIdentity } from "./legacy-database-compat.js";
import { readFileSync } from "node:fs";
import { getStorageService } from "./storage/index.js";
import { generateVideoScript } from "./services/video-script.js";
import { createDb, companyGovernance, videoJobs, approvals, assets, campaigns, campaignDeliverables } from "@soravyn/db";
import { and, eq, lt, sql } from "drizzle-orm";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, rename, readFile, copyFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { composeVideo, parseVideoJobInput, captionSrt, videoRoot, videoImage } from "./services/video-contract.js";
import { syncVideoJobToCalendar } from "./services/storyboard-generator.js";
const execute=promisify(execFile);
const workerConfig=loadConfig();
let databasePort=workerConfig.embeddedPostgresPort;
if(!workerConfig.databaseUrl){try{const candidate=Number(readFileSync(join(workerConfig.embeddedPostgresDataDir,"postmaster.pid"),"utf8").split("\n")[3]);if(Number.isInteger(candidate)&&candidate>0&&candidate<65536)databasePort=candidate;}catch{/* The API must start embedded PostgreSQL before the worker. */}}
const url=workerConfig.databaseUrl||(await resolveEmbeddedIdentity(databasePort)).connectionUrl;
const db=createDb(url);const root=resolve(videoRoot());
const companyFilter=process.env.SORAVYN_VIDEO_COMPANY_ID;
if(companyFilter&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyFilter))throw new Error("Invalid worker company scope");
const scope=companyFilter?eq(videoJobs.companyId,companyFilter):undefined;
await mkdir(root,{recursive:true,mode:0o700});
async function writeHeartbeat(){const path=join(root,"worker-heartbeat.json");const tmp=path+"."+process.pid;await writeFile(tmp,JSON.stringify({at:new Date().toISOString()}),{mode:0o600});await rename(tmp,path);}
await writeHeartbeat();
const heartbeatTimer=setInterval(()=>{void writeHeartbeat().catch(()=>{});},10000);
let stopping=false;
process.on("SIGTERM",()=>{stopping=true;});process.on("SIGINT",()=>{stopping=true;});
async function once(){
 // Recover interrupted workers after a lease longer than the hard render timeout.
 await db.update(videoJobs).set({status:"failed",error:"Worker lease expired; retry limit reached",leaseToken:null,leaseUntil:null,updatedAt:new Date()}).where(and(scope,eq(videoJobs.status,"running"),lt(videoJobs.leaseUntil,new Date()),sql`${videoJobs.attempts} >= 2`));
 await db.update(videoJobs).set({status:"queued",leaseToken:null,leaseUntil:null,updatedAt:new Date()}).where(and(scope,eq(videoJobs.status,"running"),lt(videoJobs.leaseUntil,new Date()),sql`${videoJobs.attempts} < 2`));
 const job=await db.transaction(async tx=>{
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('soravyn:video-admission'))`);
  const active=await tx.select({companyId:videoJobs.companyId}).from(videoJobs).where(eq(videoJobs.status,"running"));
  const globalLimit=Number(process.env.SORAVYN_MAX_VIDEO_RUNS||2);
  if(active.length>=(Number.isInteger(globalLimit)&&globalLimit>=1&&globalLimit<=32?globalLimit:2))return null;
  const [candidate]=await tx.select().from(videoJobs).where(and(scope,eq(videoJobs.status,"queued"),sql`(select count(*) from studio_video_jobs as active_jobs where active_jobs.company_id=${videoJobs.companyId} and active_jobs.status='running') < coalesce((select max_video_runs from company_governance where company_id=${videoJobs.companyId}),1)`)).orderBy(videoJobs.createdAt).limit(1).for("update",{skipLocked:true});
  if(!candidate)return null;
  const [governance]=await tx.select().from(companyGovernance).where(eq(companyGovernance.companyId,candidate.companyId));
  if(active.filter(row=>row.companyId===candidate.companyId).length>=(governance?.maxVideoRuns||1))return null;
  const [claimed]=await tx.update(videoJobs).set({status:"running",leaseToken:randomUUID(),leaseUntil:new Date(Date.now()+20*60_000),attempts:candidate.attempts+1,updatedAt:new Date()}).where(eq(videoJobs.id,candidate.id)).returning();return claimed;
 });
 if(!job)return false;
 const attemptToken=job.leaseToken!;
 const condition=and(eq(videoJobs.id,job.id),eq(videoJobs.leaseToken,job.leaseToken!));
 const publishedFolder=join(root,job.companyId,job.id);
 const folder=join(publishedFolder,"attempts",job.leaseToken!);const container=`soravyn-${job.id}-${job.leaseToken!.slice(0,8)}`;
 let watchdogBusy=false;
 const watchdog=setInterval(async()=>{if(watchdogBusy)return;watchdogBusy=true;try{const [current]=await db.select({status:videoJobs.status,leaseToken:videoJobs.leaseToken}).from(videoJobs).where(eq(videoJobs.id,job.id));if(!current||current.status!=="running"||current.leaseToken!==job.leaseToken)await execute("docker",["rm","-f",container],{timeout:10000}).catch(()=>{});}catch{/* A database outage must not expose credentials in render logs. */}finally{watchdogBusy=false;}},2000);
 async function event(stage:string){const updated=await db.update(videoJobs).set({events:sql`${videoJobs.events} || ${JSON.stringify([{stage,at:new Date().toISOString()}])}::jsonb`,updatedAt:new Date()}).where(condition).returning({id:videoJobs.id});if(!updated.length)throw new Error("Video job lease lost");}
 try{
  await event("preflight");
  const runStep=durableSteps(db,job,event);
  if(job.input.kind==="campaign_pack"){
   const pack=await generateCampaignPack(job.input.context as Record<string,unknown>,String(job.input.platform),event,fetch,runStep);
   await event("campaign_pack_validated");
   await db.update(videoJobs).set({status:"script_ready",input:{...job.input,kind:"campaign_pack_ready",pack},leaseToken:null,leaseUntil:null,updatedAt:new Date()}).where(condition);
   return true;
  }
  if(job.input.kind==="script"){
   await event("script_generation");
   const script=await generateVideoScript(job.input.context as Record<string,unknown>,String(job.input.platform));
   await db.update(videoJobs).set({status:"script_ready",input:{...job.input,...script,kind:"script_draft"},leaseToken:null,leaseUntil:null,updatedAt:new Date(),events:sql`${videoJobs.events} || ${JSON.stringify([{stage:"script_ready",at:new Date().toISOString()}])}::jsonb`}).where(condition);
   process.stdout.write(`Video script ${job.id}: ready for human review\n`);return true;
  }
  const imageProbe=await execute("docker",["image","inspect","--format","{{.Id}}",videoImage()],{timeout:10_000,maxBuffer:8192});
  const imageId=imageProbe.stdout.trim();
  const input=parseVideoJobInput(job.input);
  if(job.input.kind==="voice_preview"){
   await mkdir(folder,{recursive:true,mode:0o700});await writeFile(join(folder,"render-input.json"),JSON.stringify(input));await event("voice_preview_generation");
   await execute("docker",["run","--rm","--name",container,"--network","none","--read-only","--cap-drop","ALL","--security-opt","no-new-privileges","--cpus","1","--memory","256m","--pids-limit","64","--tmpfs","/tmp:rw,nosuid,size=32m","--mount",`type=bind,src=${folder},dst=/work`,"--entrypoint","/usr/bin/timeout",videoImage(),"--kill-after=5s","30s","node","-e",sandboxVoicePreviewCode],{timeout:40000,maxBuffer:8192,env:{PATH:process.env.PATH,HOME:process.env.HOME}});
   await db.transaction(async tx=>{const [owner]=await tx.select({id:videoJobs.id}).from(videoJobs).where(and(condition,eq(videoJobs.status,"running"))).for("update");if(!owner)throw new Error("Production lease lost");const staging=join(publishedFolder,`.publish-${job.leaseToken}-narration.wav`);await copyFile(join(folder,"narration.wav"),staging);await rename(staging,join(publishedFolder,"narration.wav"));});
   await event("voice_preview_ready");await db.update(videoJobs).set({status:"audio_ready",leaseToken:null,leaseUntil:null,updatedAt:new Date()}).where(condition);return true;
  }
  const brand=job.input.brand as {name:string;colors:string[];fontFamily?:string;logoAssetId?:string;logoLicense?:string};
  const preview=job.input.kind==="scene_preview";
  const composition=composeVideo(input,brand,{preview});
  await mkdir(folder,{recursive:true,mode:0o700});
  const manifest=[];
  const media=[...input.scenes.map((scene,index)=>({...scene,filename:`media-${index}.source`})),...(brand.logoAssetId?[{imageAssetId:brand.logoAssetId,imageLicense:brand.logoLicense,filename:"logo.source"}]:[])];
  for(const [index,scene] of media.entries()){
   if(!scene.imageAssetId)continue;
   const [asset]=await db.select().from(assets).where(and(eq(assets.id,scene.imageAssetId),eq(assets.companyId,job.companyId)));
   if(!asset||asset.byteSize>10*1024*1024)throw new Error("Invalid client asset");
   const object=await getStorageService().getObject(job.companyId,asset.objectKey);const chunks:Buffer[]=[];let size=0;
   for await(const chunk of object.stream){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>10*1024*1024){object.stream.destroy();throw new Error("Image too large");}chunks.push(bytes);}
   const content=Buffer.concat(chunks);if(createHash("sha256").update(content).digest("hex")!==asset.sha256)throw new Error("Asset integrity check failed");
   await writeFile(join(folder,scene.filename),content);
   manifest.push({scene:index+1,assetId:asset.id,sha256:asset.sha256,license:scene.imageLicense,source:"client-upload",role:scene.filename==="logo.source"?"brand-logo":"scene-image"});
  }
  await writeFile(join(folder,"assets.manifest.json"),JSON.stringify(manifest,null,2));
  await event("composition");
  await writeFile(join(folder,"index.html"),composition.html);
  await writeFile(join(folder,"storyboard.json"),JSON.stringify(composition.scenes,null,2));
  // Normalize to the actual upstream brief contract. Narration is explicitly off.
  const brief={id:job.id,title:job.input.campaignName,platform:preview?{width:composition.width,height:composition.height,fps:24}:input.platform,story:"Product introduction",source:{type:"script",text:input.scenes.map(s=>`${s.title}. ${s.text}`).join("\n")},duration_s:composition.duration,narration:{mode:"none"}};
  await writeFile(join(folder,"brief.json"),JSON.stringify(brief,null,2));
  await execute(process.execPath,[new URL("../../vendor/llm-video-maker/skills/make-video/scripts/validate-brief.mjs",import.meta.url).pathname,join(folder,"brief.json")],{timeout:10000,maxBuffer:32768});
  const audioFingerprint=narrationFingerprint(input,imageId);
  let audioReusedFrom:string|null=null;
  const parentId=job.input.revisionOf||job.input.variantOf||job.input.previewOf;
  if(input.narration!=="none"&&typeof parentId==="string"){
   const [parent]=await db.select().from(videoJobs).where(and(eq(videoJobs.id,parentId),eq(videoJobs.companyId,job.companyId),eq(videoJobs.campaignId,job.campaignId),eq(videoJobs.status,"succeeded")));
   if(parent){try{
    const parentFolder=join(root,parent.companyId,parent.id);
    const sourceReport=JSON.parse(await readFile(join(parentFolder,"report.json"),"utf8"));
    const audio=z.object({fingerprint:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).parse(sourceReport.audio);
    if(audio.fingerprint===audioFingerprint&&await artifactHash(join(parentFolder,"narration.wav"))===audio.sha256){await copyFile(join(parentFolder,"narration.wav"),join(folder,"narration.wav"));audioReusedFrom=parent.id;await event("narration_source_reused");}
   }catch{/* Missing, incompatible or altered narration is synthesized again. */}}
  }
  await writeFile(join(folder,"render-input.json"),JSON.stringify({...input,preview,reuseNarration:!!audioReusedFrom}));
  await writeFile(join(folder,"captions.srt"),captionSrt(input));
  async function sandbox(code:string,seconds:number){await execute("docker",["run","--rm","--name",container,"--network","none","--read-only","--cap-drop","ALL","--security-opt","no-new-privileges","--cpus","2","--memory","2g","--pids-limit","256","--shm-size","512m","--tmpfs","/tmp:rw,nosuid,size=512m","--mount",`type=bind,src=${folder},dst=/work`,"--entrypoint","/usr/bin/timeout",videoImage(),"--kill-after=10s",`${seconds}s`,"node","-e",code],{timeout:(seconds+15)*1000,maxBuffer:1024*1024,env:{PATH:process.env.PATH,HOME:process.env.HOME}});}
  async function reuseArtifacts(output:z.infer<typeof artifactSet>){
   const source=output.attempt?join(publishedFolder,"attempts",output.attempt):publishedFolder;
   if(!await verifyArtifacts(source,output))return false;
   if(source!==folder)for(const file of output.files)await copyFile(join(source,file.name),join(folder,file.name));
   return true;
  }
  const prepared=await runStep("prepare_media_audio",{input,brand,imageId,version:3},artifactSet,async()=>{
   await sandbox(sandboxPreparationCode,180);
   const names=["gsap.min.js",...(brand.logoAssetId?["logo.png"]:[]),...input.scenes.flatMap((scene,i)=>scene.imageAssetId?[`media-${i}.png`]:[]),...(input.narration!=="none"?["narration.wav"]:[])];
   return {...await describeArtifacts(folder,names,job.leaseToken!),audioReusedFrom};
  },reuseArtifacts);
  if(prepared.audioReusedFrom)audioReusedFrom=prepared.audioReusedFrom;
  await runStep("render_frames",{input,brand,imageId,preview,version:3,prepared:prepared.files},artifactSet,async()=>{await sandbox(sandboxRenderCode,890);return describeArtifacts(folder,["output.mp4"],job.leaseToken!);},reuseArtifacts);
  await event("verification");
  const {stdout}=await execute("ffprobe",["-v","error","-show_streams","-show_format","-of","json",join(folder,"output.mp4")],{timeout:15_000,maxBuffer:128*1024});
  const report=JSON.parse(stdout);const video=report.streams.find((s:{codec_type:string})=>s.codec_type==="video");
  if(!Number.isFinite(Number(report.format.duration))||!video || video.width!==composition.width || video.height!==composition.height || Math.abs(Number(report.format.duration)-composition.duration)>Math.max(0.25,composition.duration*0.05))throw new Error("MP4 geometry/duration verification failed");
  if(input.narration!=="none"&&!report.streams.some((stream:{codec_type:string})=>stream.codec_type==="audio"))throw new Error("Narration audio track missing");
  const audio=input.narration!=="none"?{fingerprint:audioFingerprint,sha256:await artifactHash(join(folder,"narration.wav")),reusedFrom:audioReusedFrom,normalized:input.normalizeAudio,engine:"espeak-ng"}:null;
  await writeFile(join(folder,"report.json"),JSON.stringify({engine:"hyperframes@0.6.91",mode:preview?"scene-preview":"scripted-template",template:input.template,narration:input.narration,audio,verified:true,probe:report},null,2));
  async function publishFiles(names:string[]){
   await db.transaction(async tx=>{
    const [owner]=await tx.select({id:videoJobs.id}).from(videoJobs).where(and(condition,eq(videoJobs.status,"running"))).for("update");if(!owner)throw new Error("Production lease lost");
    for(const name of names){const staging=join(publishedFolder,`.publish-${attemptToken}-${name}`);await copyFile(join(folder,name),staging);await rename(staging,join(publishedFolder,name));}
   });
  }
  if(preview){
   await rename(join(folder,"output.mp4"),join(folder,"preview.mp4"));
   await publishFiles(["preview.mp4","report.json","captions.srt"]);
   await db.update(videoJobs).set({status:"preview_ready",leaseToken:null,leaseUntil:null,error:null,updatedAt:new Date(),events:sql`${videoJobs.events} || ${JSON.stringify([{stage:"scene_preview_ready",at:new Date().toISOString()}])}::jsonb`}).where(condition);return true;
  }
  await publishFiles(["output.mp4","brief.json","storyboard.json","report.json","index.html","captions.srt","assets.manifest.json",...(input.narration!=="none"?["narration.wav"]:[])]);
  await db.transaction(async tx=>{
   const [current]=await tx.select().from(videoJobs).where(condition).for("update");if(!current)throw new Error("Job lease lost");
   const [approval]=await tx.insert(approvals).values({companyId:job.companyId,type:"video_review",payload:{jobId:job.id,campaignId:job.campaignId},status:"pending"}).returning();
   if(typeof job.input.deliverableId==="string"){
    const [linked]=await tx.select().from(campaignDeliverables).where(and(eq(campaignDeliverables.id,job.input.deliverableId),eq(campaignDeliverables.companyId,job.companyId),eq(campaignDeliverables.videoJobId,job.id)));
    if(linked)await tx.update(campaigns).set({status:"review",updatedAt:new Date()}).where(and(eq(campaigns.id,job.campaignId),eq(campaigns.companyId,job.companyId),eq(campaigns.status,"production")));
   }
   await tx.update(videoJobs).set({status:"succeeded",approvalId:approval.id,leaseToken:null,leaseUntil:null,error:null,events:sql`${videoJobs.events} || ${JSON.stringify([{stage:"ready_for_review",at:new Date().toISOString()}])}::jsonb`,updatedAt:new Date()}).where(condition);
  });
  await syncVideoJobToCalendar(db, job.companyId, job.id, "ready_for_review").catch(()=>{});
  process.stdout.write(`Video job ${job.id}: succeeded\n`);
 }catch(error){
  // Never persist command stderr: third-party tools may include environment details.
  await execute("docker",["rm","-f",container],{timeout:10_000}).catch(()=>{});
  await db.update(videoJobs).set({status:"failed",error:String((error as {stderr?:string}).stderr||"").includes("Narration exceeds scene duration")?"Narration exceeds scene duration. Shorten the spoken text or increase the duration in a new production.":"Video production failed. Check worker prerequisites and retained intermediate artifacts.",leaseToken:null,leaseUntil:null,updatedAt:new Date()}).where(condition);
  process.stderr.write(`Video job ${job.id}: stopped or failed\n`);
 }finally{clearInterval(watchdog);}
 return true;
}
do { const worked=await once();if(process.argv.includes("--once"))break;if(!worked&&!stopping)await new Promise(r=>setTimeout(r,2000)); } while(!stopping);
clearInterval(heartbeatTimer);
process.exit(0);
