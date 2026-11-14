import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { stepFingerprint } from "./production-steps.js";
import { videoInput } from "./video-contract.js";
export const artifactSet = z.object({attempt:z.string().uuid().optional(),files:z.array(z.object({name:z.string().regex(/^(?:gsap\.min\.js|logo\.png|media-\d+\.png|narration\.wav|output\.mp4)$/),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).min(1).max(20),audioReusedFrom:z.string().uuid().nullable().optional()}).strict();
export async function artifactHash(path:string){
 const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256*1024*1024)throw new Error("Invalid render artifact");
 const hash=createHash("sha256");let bytes=0;for await(const chunk of createReadStream(path)){bytes+=chunk.length;if(bytes>256*1024*1024)throw new Error("Render artifact too large");hash.update(chunk);}return hash.digest("hex");
}
export async function describeArtifacts(folder:string,names:string[],attempt?:string){return artifactSet.parse({attempt,files:await Promise.all(names.map(async name=>({name,sha256:await artifactHash(join(folder,name))})))});}
export async function verifyArtifacts(folder:string,output:z.infer<typeof artifactSet>){try{for(const file of output.files){if(await artifactHash(join(folder,file.name))!==file.sha256)return false;}return output.files.length>0;}catch{return false;}}
export function narrationFingerprint(input:z.output<typeof videoInput>,imageId:string){
 return stepFingerprint({version:"espeak-pcm-v2",imageId,narration:input.narration,speed:input.voiceSpeed,pitch:input.voicePitch,gap:input.voiceGap,normalize:input.normalizeAudio,pronunciations:input.pronunciations,scenes:input.scenes.map(scene=>({speech:scene.speech||scene.text,duration:scene.duration}))});
}
