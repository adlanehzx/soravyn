import { describe, expect, it, vi } from "vitest";
import { createReviewToken, reviewTokenMatches, validateNotePosition } from "../services/client-review.js";
import { applyPronunciations, captionSrt, composeVideo, videoInput } from "../services/video-contract.js";
import { generateCampaignPack, generateLocalJson, marketingCopyInput } from "../services/campaign-creative.js";
import { campaignStrategySchema, authorizeCampaignTaskSchema } from "@soravyn/shared";

const scene={title:"Votre marque",text:"Bonjour",duration:6};
describe("Client review capabilities and timed feedback",()=>{
 it("stores only a non-reversible token hash and rejects altered tokens",()=>{const {token,tokenHash}=createReviewToken();expect(token).not.toBe(tokenHash);expect(reviewTokenMatches(token,tokenHash)).toBe(true);expect(reviewTokenMatches(token+"x",tokenHash)).toBe(false);expect(reviewTokenMatches(createReviewToken().token,tokenHash)).toBe(false);});
 it("rejects a timecode outside its scene and unknown scenes",()=>{expect(()=>validateNotePosition({scenes:[scene,scene]},1,5999)).toThrow();expect(()=>validateNotePosition({scenes:[scene]},0,6000)).toThrow();expect(()=>validateNotePosition({scenes:[scene]},1,0)).toThrow();expect(()=>validateNotePosition({scenes:[scene,scene]},1,6000)).not.toThrow();});
});
describe("Voice and explicit captions",()=>{
 it("rejects overlapping cues and cues beyond the render",()=>{for(const captionCues of [[{startMs:0,endMs:7000,text:"long"}],[{startMs:0,endMs:1000,text:"a"},{startMs:500,endMs:1100,text:"b"}]])expect(videoInput.safeParse({platform:"square",scenes:[scene],captionCues}).success).toBe(false);});
 it("uses actual supplied timing for both rendered captions and SRT",()=>{const input=videoInput.parse({platform:"square",scenes:[scene],captionCues:[{startMs:100,endMs:900,text:"<Bonjour>"}]});expect(captionSrt(input)).toContain("00:00:00,100 --> 00:00:00,900");const html=composeVideo(input,{name:"Marque",colors:[],fontFamily:"mono"}).html;expect(html).toContain("&lt;Bonjour&gt;");expect(html).toContain('opacity:1},0.1)');expect(html).toContain("font-family:monospace");});
 it("restricts voice options and uses literal pronunciation replacements",()=>{expect(videoInput.safeParse({platform:"square",scenes:[scene],voiceSpeed:500}).success).toBe(false);expect(applyPronunciations("SORA+ SORA+",[{from:"SORA+",to:"Sora"}])).toBe("Sora Sora");});
});
describe("Local creative generation contracts",()=>{
 it("rejects unknown fields and cross-client provenance in copy",()=>{expect(marketingCopyInput.safeParse({channel:"email",title:"hello",body:"body",companyId:"other"}).success).toBe(false);expect(authorizeCampaignTaskSchema.safeParse({confirmConfiguredModelCosts:true,maximumCostCents:-1}).success).toBe(false);});
 it("executes four validated generations with observable stages",async()=>{
  vi.stubEnv("SORAVYN_OLLAMA_MODEL","test-local");
  try{const strategy={summary:"Une stratégie complète",positioning:"Qualité",keyMessages:["Simplicité"],channels:["website"]};const video={platform:"square",scenes:[scene]};const responses=[strategy,video,video,{items:[{channel:"email",title:"Découvrez",body:"Découvrez notre offre."}]}];let n=0;const fetcher=vi.fn(async()=>new Response(JSON.stringify({response:JSON.stringify(responses[n++])}))) as unknown as typeof fetch;const stages:string[]=[];const pack=await generateCampaignPack({brand:{name:"Client A"}},"square",async stage=>{stages.push(stage);},fetcher);expect(pack.copy).toHaveLength(1);expect(stages).toEqual(["strategy_generation","script_generation","storyboard_generation","marketing_copy_generation"]);expect(fetcher).toHaveBeenCalledTimes(4);}finally{vi.unstubAllEnvs();}
 });
 it("rejects invalid model output rather than persisting it",async()=>{vi.stubEnv("SORAVYN_OLLAMA_MODEL","test-local");try{const fetcher=vi.fn(async()=>new Response(JSON.stringify({response:'{"shell":"run"}'}))) as unknown as typeof fetch;await expect(generateLocalJson(campaignStrategySchema,"strategy",{},fetcher)).rejects.toThrow();}finally{vi.unstubAllEnvs();}});
});
