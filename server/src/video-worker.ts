import { loadConfig } from "./config.js";
import { resolveEmbeddedIdentity } from "./legacy-database-compat.js";
import { readFileSync } from "node:fs";
import { getStorageService } from "./storage/index.js";
import { generateVideoScript } from "./services/video-script.js";
import { createDb, videoJobs, approvals, assets, campaigns, campaignDeliverables } from "@soravyn/db";
import { and, eq, lt, sql } from "drizzle-orm";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { composeVideo, videoInput, videoRoot, videoImage } from "./services/video-contract.js";
const execute=promisify(execFile);
const workerConfig=loadConfig();
let databasePort=workerConfig.embeddedPostgresPort;
if(!workerConfig.databaseUrl){try{const candidate=Number(readFileSync(join(workerConfig.embeddedPostgresDataDir,"postmaster.pid"),"utf8").split("\n")[3]);if(Number.isInteger(candidate)&&candidate>0&&candidate<65536)databasePort=candidate;}catch{/* The API must start embedded PostgreSQL before the worker. */}}
const url=workerConfig.databaseUrl||(await resolveEmbeddedIdentity(databasePort)).connectionUrl;
const db=createDb(url);const root=resolve(videoRoot());
const dockerCode=`const fs=require('fs');const cp=require('child_process');
function run(cmd,args,input){const r=cp.spawnSync(cmd,args,{input,encoding:'utf8',maxBuffer:4*1024*1024});if(r.status!==0)throw new Error(cmd+' failed');return r.stdout;}
fs.copyFileSync('/opt/video/node_modules/gsap/dist/gsap.min.js','/work/gsap.min.js');
const v=JSON.parse(fs.readFileSync('/work/render-input.json','utf8'));
for(let i=0;i<v.scenes.length;i++){if(v.scenes[i].imageAssetId){const sharp=require('/opt/video/node_modules/sharp');run(process.execPath,['-e',"require('/opt/video/node_modules/sharp')('/work/media-"+i+".source',{limitInputPixels:40000000}).rotate().resize(1920,1920,{fit:'inside',withoutEnlargement:true}).png().toFile('/work/media-"+i+".png').catch(()=>process.exit(1))"]);}}
if(v.narration!=='none'){
 const parts=[];
 for(let i=0;i<v.scenes.length;i++){const s=v.scenes[i];run('espeak-ng',['-v',v.narration,'-s','145','-w','/work/speech-'+i+'.wav','--stdin'],s.speech||s.text);
 const probe=JSON.parse(run('ffprobe',['-v','error','-show_format','-of','json','/work/speech-'+i+'.wav']));if(Number(probe.format.duration)>s.duration)throw new Error('Narration exceeds scene duration');
 run('ffmpeg',['-y','-v','error','-i','/work/speech-'+i+'.wav','-af','apad','-t',String(s.duration),'-ar','48000','-ac','1','/work/voice-'+i+'.wav']);parts.push("file '/work/voice-"+i+".wav'");}
 fs.writeFileSync('/work/voice-list.txt',parts.join(String.fromCharCode(10)));
 run('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i','/work/voice-list.txt','-c','copy','/work/narration.wav']);
}
run(process.execPath,['/opt/video/node_modules/hyperframes/dist/cli.js','render','/work','--quality','draft','--fps','24','--workers','1','--output','/work/output.mp4']);
if(v.narration!=='none'){fs.renameSync('/work/output.mp4','/work/silent.mp4');run('ffmpeg',['-y','-v','error','-i','/work/silent.mp4','-i','/work/narration.wav','-c:v','copy','-c:a','aac','-shortest','-movflags','+faststart','/work/output.mp4']);}
`;
let stopping=false;
process.on("SIGTERM",()=>{stopping=true;});process.on("SIGINT",()=>{stopping=true;});
async function once(){
 // Recover interrupted workers after a lease longer than the hard render timeout.
 await db.update(videoJobs).set({status:"failed",error:"Worker lease expired; retry limit reached",leaseToken:null,leaseUntil:null,updatedAt:new Date()}).where(and(eq(videoJobs.status,"running"),lt(videoJobs.leaseUntil,new Date()),sql`${videoJobs.attempts} >= 2`));
 await db.update(videoJobs).set({status:"queued",leaseToken:null,leaseUntil:null,updatedAt:new Date()}).where(and(eq(videoJobs.status,"running"),lt(videoJobs.leaseUntil,new Date()),sql`${videoJobs.attempts} < 2`));
 const job=await db.transaction(async tx=>{
  const [candidate]=await tx.select().from(videoJobs).where(eq(videoJobs.status,"queued")).orderBy(videoJobs.createdAt).limit(1).for("update",{skipLocked:true});
  if(!candidate)return null;
  const [claimed]=await tx.update(videoJobs).set({status:"running",leaseToken:randomUUID(),leaseUntil:new Date(Date.now()+20*60_000),attempts:candidate.attempts+1,updatedAt:new Date()}).where(eq(videoJobs.id,candidate.id)).returning();return claimed;
 });
 if(!job)return false;
 const condition=and(eq(videoJobs.id,job.id),eq(videoJobs.leaseToken,job.leaseToken!));
 const folder=join(root,job.companyId,job.id);const container=`soravyn-${job.id}-${job.leaseToken!.slice(0,8)}`;
 let watchdogBusy=false;
 const watchdog=setInterval(async()=>{if(watchdogBusy)return;watchdogBusy=true;try{const [current]=await db.select({status:videoJobs.status,leaseToken:videoJobs.leaseToken}).from(videoJobs).where(eq(videoJobs.id,job.id));if(!current||current.status!=="running"||current.leaseToken!==job.leaseToken)await execute("docker",["rm","-f",container],{timeout:10000}).catch(()=>{});}catch{/* A database outage must not expose credentials in render logs. */}finally{watchdogBusy=false;}},2000);
 async function event(stage:string){const updated=await db.update(videoJobs).set({events:sql`${videoJobs.events} || ${JSON.stringify([{stage,at:new Date().toISOString()}])}::jsonb`,updatedAt:new Date()}).where(condition).returning({id:videoJobs.id});if(!updated.length)throw new Error("Video job lease lost");}
 try{
  await event("preflight");
  if(job.input.kind==="script"){
   await event("script_generation");
   const script=await generateVideoScript(job.input.context as Record<string,unknown>,String(job.input.platform));
   await db.update(videoJobs).set({status:"script_ready",input:{...job.input,...script,kind:"script_draft"},leaseToken:null,leaseUntil:null,updatedAt:new Date(),events:sql`${videoJobs.events} || ${JSON.stringify([{stage:"script_ready",at:new Date().toISOString()}])}::jsonb`}).where(condition);
   process.stdout.write(`Video script ${job.id}: ready for human review\n`);return true;
  }
  await execute("docker",["image","inspect",videoImage()],{timeout:10_000,maxBuffer:8192});
  const input=videoInput.parse({platform:job.input.platform,scenes:job.input.scenes,narration:job.input.narration});
  const brand=job.input.brand as {name:string;colors:string[]};
  const composition=composeVideo(input,brand);
  await mkdir(folder,{recursive:true,mode:0o700});
  const manifest=[];
  for(const [index,scene] of input.scenes.entries()){
   if(!scene.imageAssetId)continue;
   const [asset]=await db.select().from(assets).where(and(eq(assets.id,scene.imageAssetId),eq(assets.companyId,job.companyId)));
   if(!asset||asset.byteSize>10*1024*1024)throw new Error("Invalid client asset");
   const object=await getStorageService().getObject(job.companyId,asset.objectKey);const chunks:Buffer[]=[];let size=0;
   for await(const chunk of object.stream){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>10*1024*1024){object.stream.destroy();throw new Error("Image too large");}chunks.push(bytes);}
   const content=Buffer.concat(chunks);if(createHash("sha256").update(content).digest("hex")!==asset.sha256)throw new Error("Asset integrity check failed");
   await writeFile(join(folder,`media-${index}.source`),content);
   manifest.push({scene:index+1,assetId:asset.id,sha256:asset.sha256,license:scene.imageLicense,source:"client-upload"});
  }
  await writeFile(join(folder,"assets.manifest.json"),JSON.stringify(manifest,null,2));
  await event("composition");
  await writeFile(join(folder,"index.html"),composition.html);
  await writeFile(join(folder,"storyboard.json"),JSON.stringify(composition.scenes,null,2));
  // Normalize to the actual upstream brief contract. Narration is explicitly off.
  const brief={id:job.id,title:job.input.campaignName,platform:input.platform,story:"Product introduction",source:{type:"script",text:input.scenes.map(s=>`${s.title}. ${s.text}`).join("\n")},duration_s:composition.duration,narration:{mode:"none"}};
  await writeFile(join(folder,"brief.json"),JSON.stringify(brief,null,2));
  await execute(process.execPath,[new URL("../../vendor/llm-video-maker/skills/make-video/scripts/validate-brief.mjs",import.meta.url).pathname,join(folder,"brief.json")],{timeout:10000,maxBuffer:32768});
  await writeFile(join(folder,"render-input.json"),JSON.stringify(input));
  const stamp=(seconds:number)=>{const ms=Math.round(seconds*1000);return `${String(Math.floor(ms/3600000)).padStart(2,"0")}:${String(Math.floor(ms/60000)%60).padStart(2,"0")}:${String(Math.floor(ms/1000)%60).padStart(2,"0")},${String(ms%1000).padStart(3,"0")}`;};
  await writeFile(join(folder,"captions.srt"),composition.scenes.map((scene,index)=>`${index+1}\n${stamp(scene.start)} --> ${stamp(scene.end)}\n${(scene.speech||scene.text).replace(/[\r\n]+/g," ")}\n`).join("\n"));
  await event(input.narration!=="none"?"narration_and_render":"render");
  await execute("docker",["run","--rm","--name",container,"--network","none","--read-only","--cap-drop","ALL","--security-opt","no-new-privileges","--cpus","2","--memory","2g","--pids-limit","256","--shm-size","512m","--tmpfs","/tmp:rw,nosuid,size=512m","--mount",`type=bind,src=${folder},dst=/work`,"--entrypoint","/usr/bin/timeout",videoImage(),"--kill-after=10s","890s","node","-e",dockerCode],{timeout:15*60_000,maxBuffer:1024*1024,env:{PATH:process.env.PATH,HOME:process.env.HOME}});
  await event("verification");
  const {stdout}=await execute("ffprobe",["-v","error","-show_streams","-show_format","-of","json",join(folder,"output.mp4")],{timeout:15_000,maxBuffer:128*1024});
  const report=JSON.parse(stdout);const video=report.streams.find((s:{codec_type:string})=>s.codec_type==="video");
  if(!Number.isFinite(Number(report.format.duration))||!video || video.width!==composition.width || video.height!==composition.height || Math.abs(Number(report.format.duration)-composition.duration)>Math.max(0.25,composition.duration*0.05))throw new Error("MP4 geometry/duration verification failed");
  if(input.narration!=="none"&&!report.streams.some((stream:{codec_type:string})=>stream.codec_type==="audio"))throw new Error("Narration audio track missing");
  await writeFile(join(folder,"report.json"),JSON.stringify({engine:"hyperframes@0.6.91",mode:"scripted-template",narration:input.narration,verified:true,probe:report},null,2));
  await db.transaction(async tx=>{
   const [current]=await tx.select().from(videoJobs).where(condition).for("update");if(!current)throw new Error("Job lease lost");
   const [approval]=await tx.insert(approvals).values({companyId:job.companyId,type:"video_review",payload:{jobId:job.id,campaignId:job.campaignId},status:"pending"}).returning();
   if(typeof job.input.deliverableId==="string"){
    const [linked]=await tx.select().from(campaignDeliverables).where(and(eq(campaignDeliverables.id,job.input.deliverableId),eq(campaignDeliverables.companyId,job.companyId),eq(campaignDeliverables.videoJobId,job.id)));
    if(linked)await tx.update(campaigns).set({status:"review",updatedAt:new Date()}).where(and(eq(campaigns.id,job.campaignId),eq(campaigns.companyId,job.companyId),eq(campaigns.status,"production")));
   }
   await tx.update(videoJobs).set({status:"succeeded",approvalId:approval.id,leaseToken:null,leaseUntil:null,error:null,events:sql`${videoJobs.events} || ${JSON.stringify([{stage:"ready_for_review",at:new Date().toISOString()}])}::jsonb`,updatedAt:new Date()}).where(condition);
  });
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
process.exit(0);
