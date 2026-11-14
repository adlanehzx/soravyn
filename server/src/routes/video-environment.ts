import { readFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { type Db } from "@soravyn/db";
import { sql } from "drizzle-orm";
import { localScriptConfig } from "../services/video-script.js";
import { videoImage, videoRoot } from "../services/video-contract.js";
import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assertBoard, assertCompanyAccess } from "./authz.js";

const execute = promisify(execFile);
async function probe(command: string, args: string[]) {
  try {
    const { stdout, stderr } = await execute(command, args, {
      timeout: 5000, maxBuffer: 32_768,
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
    });
    return { available: true, version: (stdout || stderr).split("\n")[0] };
  } catch {
    return { available: false, version: null };
  }
}

export function videoEnvironmentRoutes(db?:Db) {
  const router = Router();
  router.get("/companies/:companyId/video/environment", async (req, res) => {
    assertCompanyAccess(req, req.params.companyId as string);
    assertBoard(req);
    const [ffmpeg, ffprobe, chromium, docker] = await Promise.all([
      probe("ffmpeg", ["-version"]), probe("ffprobe", ["-version"]),
      probe("chromium", ["--version"]), probe("docker", ["info", "--format", "{{.ServerVersion}}"]),
    ]);
    const image = await probe("docker", ["image", "inspect", "--format", "{{.Id}}", videoImage()]);
    let worker={available:false,reason:"No recent worker heartbeat"};let storage={available:false};let database={available:false};let model:{available:boolean;version?:string;reason?:string}={available:false};
    try{const heartbeat=JSON.parse(await readFile(join(videoRoot(),"worker-heartbeat.json"),"utf8"));const age=Date.now()-Date.parse(heartbeat.at);worker={available:age>=0&&age<30000,reason:"Shared-storage heartbeat, valid for 30 seconds; not a render guarantee"};}catch{}
    try{await mkdir(videoRoot(),{recursive:true,mode:0o700});await access(videoRoot(),constants.W_OK);storage={available:true};}catch{}
    try{if(db){await db.execute(sql`select 1`);database={available:true};}}catch{}
    try{const config=localScriptConfig();if(config.model){const response=await fetch(new URL("/api/tags",config.endpoint),{signal:AbortSignal.timeout(3000)});if(response.ok){const body=await response.json() as {models?:{name:string}[]};model={available:!!body.models?.some(m=>m.name===config.model||m.name===config.model+":latest"),version:config.model};}}else model.reason="Configure SORAVYN_OLLAMA_MODEL on the API and worker";}catch{model.reason="Local model service unavailable";}
    res.json({worker,storage,database,model,
      node: { available: Number(process.versions.node.split(".")[0]) >= 22, version: process.versions.node },
      ffmpeg, ffprobe, chromium, sandbox: docker,
      hyperframes: { available: image.available, requiredVersion: "0.6.91", reason: image.available ? undefined : "Build the isolated rendering image with pnpm video:image" },
      narration: { available: image.available, reason: "eSpeak French/English in the video image; image presence does not verify its contents" },
      generationEnabled: worker.available && docker.available && image.available && storage.available && ffprobe.available,
      reason: "Readiness uses recent worker heartbeat, Docker image, storage and ffprobe; individual jobs can still fail",
    });
  });
  return router;
}
