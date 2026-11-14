import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stepFingerprint } from "../services/production-steps.js";
import { artifactSet, describeArtifacts, verifyArtifacts, narrationFingerprint } from "../services/render-artifacts.js";
import { composeVideo, videoInput } from "../services/video-contract.js";
const input=videoInput.parse({platform:"square",narration:"fr",scenes:[{title:"Titre",text:"Bonjour.",duration:6}]});
describe("Production reuse contracts",()=>{
 it("hashes equivalent object ordering identically but invalidates changed dependencies",()=>{expect(stepFingerprint({a:1,b:{x:2,y:3}})).toBe(stepFingerprint({b:{y:3,x:2},a:1}));expect(stepFingerprint({brief:"A"})).not.toBe(stepFingerprint({brief:"B"}));});
 it("ignores visual changes for audio but invalidates voice text timing engine and normalization changes",()=>{const fingerprint=narrationFingerprint(input,"image-a");expect(narrationFingerprint({...input,template:"launch",platform:"youtube",scenes:[{...input.scenes[0],speech:"Bonjour.",title:"Nouveau titre",text:"Nouveau visuel"}]},"image-a")).toBe(fingerprint);for(const changed of [{...input,voiceSpeed:180},{...input,normalizeAudio:true},{...input,scenes:[{...input.scenes[0],text:"Autre texte"}]},{...input,scenes:[{...input.scenes[0],duration:8}]}])expect(narrationFingerprint(changed,"image-a")).not.toBe(fingerprint);expect(narrationFingerprint(input,"image-b")).not.toBe(fingerprint);});
 it("rejects changed or missing checkpoint artifacts and traversal names",async()=>{const dir=await mkdtemp(join(tmpdir(),"soravyn-artifacts-"));try{await writeFile(join(dir,"narration.wav"),"verified fixture");const output=await describeArtifacts(dir,["narration.wav"]);expect(await verifyArtifacts(dir,output)).toBe(true);await writeFile(join(dir,"narration.wav"),"changed fixture");expect(await verifyArtifacts(dir,output)).toBe(false);expect(artifactSet.safeParse({files:[{name:"../outside",sha256:"a".repeat(64)}]}).success).toBe(false);}finally{await rm(dir,{recursive:true,force:true});}});
});
describe("Templates and preview composition",()=>{
 it("renders three distinct structures and escapes all untrusted text",()=>{const html=new Set<string>();for(const template of ["editorial","product","launch"] as const){const result=composeVideo({...input,template,scenes:[{...input.scenes[0],title:'<img src=x onerror="alert(1)">'}]},{name:"<Brand>",colors:["#9484FF"]});expect(result.html).toContain(`data-template="${template}"`);expect(result.html).toContain("&lt;img");expect(result.html).not.toContain('<img src=x');html.add(result.html);}expect(html.size).toBe(3);});
 it("uses even preview dimensions with a maximum of 640 pixels",()=>{for(const platform of ["youtube","square","tiktok"] as const){const result=composeVideo({...input,platform},{name:"Brand",colors:[]},{preview:true});expect(Math.max(result.width,result.height)).toBe(640);expect(result.width%2).toBe(0);expect(result.height%2).toBe(0);expect(Math.min(result.width,result.height)).toBeGreaterThanOrEqual(240);}});
 it("rejects executable template names and unbounded voice controls",()=>{expect(videoInput.safeParse({...input,template:"<script>"}).success).toBe(false);expect(videoInput.safeParse({...input,voiceGap:100}).success).toBe(false);});
});
