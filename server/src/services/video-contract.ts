import { z } from "zod";
export const videoInput = z.object({
 voiceSpeed: z.number().int().min(100).max(220).default(145),
 voicePitch: z.number().int().min(0).max(99).default(50),
 pronunciations: z.array(z.object({from:z.string().trim().min(1).max(80),to:z.string().trim().min(1).max(120)}).strict()).max(20).default([]),
 captionCues: z.array(z.object({startMs:z.number().int().min(0).max(90000),endMs:z.number().int().min(1).max(90000),text:z.string().trim().min(1).max(200)}).strict()).max(300).optional(),
 narration: z.enum(["none", "fr", "en"]).default("none"),
 platform: z.enum(["tiktok", "reels", "shorts", "youtube", "square"]),
 scenes: z.array(z.object({
   title: z.string().trim().min(1).max(90),
   text: z.string().trim().min(1).max(260),
   imageAssetId: z.string().uuid().optional(),
   imageLicense: z.string().trim().min(1).max(1000).optional(),
   speech: z.string().trim().min(1).max(260).optional(),
   duration: z.number().int().min(2).max(15),
 }).strict().refine(s=>!s.imageAssetId||!!s.imageLicense,"An image license or ownership note is required")).min(1).max(12),
}).strict().refine(v => v.scenes.reduce((s, c) => s + c.duration, 0) <= 90, "Maximum duration is 90 seconds").superRefine((v,ctx)=>{
 let end=0;const total=v.scenes.reduce((n,s)=>n+s.duration*1000,0);
 if(total<5000)ctx.addIssue({code:z.ZodIssueCode.custom,message:"Minimum render duration is 5 seconds (video engine brief contract)"});
 for(const cue of v.captionCues||[]){if(cue.startMs<end||cue.endMs<=cue.startMs||cue.endMs>total)ctx.addIssue({code:z.ZodIssueCode.custom,message:"Caption cues must be ordered, non-overlapping and inside the video duration"});end=cue.endMs;}
});
export function parseVideoJobInput(input:Record<string,unknown>){return videoInput.parse(Object.fromEntries(Object.entries(input).filter(([key])=>["platform","scenes","narration","voiceSpeed","voicePitch","pronunciations","captionCues"].includes(key))));}
export function applyPronunciations(text:string,rules:{from:string;to:string}[]=[]){return rules.reduce((s,rule)=>s.split(rule.from).join(rule.to),text);}
export function captionSrt(input:z.output<typeof videoInput>){
 const stamp=(ms:number)=>`${String(Math.floor(ms/3600000)).padStart(2,"0")}:${String(Math.floor(ms/60000)%60).padStart(2,"0")}:${String(Math.floor(ms/1000)%60).padStart(2,"0")},${String(ms%1000).padStart(3,"0")}`;
 let offset=0;const cues=input.captionCues||input.scenes.map(scene=>{const startMs=offset;offset+=scene.duration*1000;return {startMs,endMs:offset,text:scene.speech||scene.text};});
 return cues.map((cue,i)=>`${i+1}\n${stamp(cue.startMs)} --> ${stamp(cue.endMs)}\n${cue.text.replace(/[\r\n]+/g," ")}\n`).join("\n");
}
export const videoRoot = () => process.env.SORAVYN_VIDEO_ROOT || new URL("../../../data/video/", import.meta.url).pathname;
export const videoImage = () => process.env.SORAVYN_VIDEO_IMAGE || "soravyn-video:0.6.91";
export function escapeHtml(value: string) {
 return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
export function composeVideo(input: z.input<typeof videoInput>, brand: { name: string; colors: string[]; fontFamily?:string; logoAssetId?:string|null }) {
 const [width, height] = input.platform === "youtube" ? [1920,1080] : input.platform === "square" ? [1080,1080] : [1080,1920];
 const font = ({sans:"Arial,sans-serif",serif:"Georgia,serif",mono:"monospace"} as Record<string,string>)[brand.fontFamily||"sans"] || "Arial,sans-serif";
 const duration = input.scenes.reduce((s,c) => s+c.duration,0);
 const accent = /^#[a-fA-F0-9]{6}$/.test(brand.colors[0] || "") ? brand.colors[0] : "#9484FF";
 let offset=0;
 const scenes=input.scenes.map((s,i)=>{ const start=offset; offset+=s.duration; return { ...s, id:`scene-${i+1}`, start, end:offset }; });
 const html=`<!doctype html><html data-composition-id="soravyn" data-composition-duration="${duration}" data-width="${width}" data-height="${height}"><head><meta charset="utf-8"><style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:#0D0F14;color:#F5F5F7;font-family:${font}}#stage{position:relative;width:100%;height:100%}.scene{position:absolute;inset:0;padding:160px 130px 240px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;opacity:0}.media{position:absolute;right:10%;top:6%;width:28%;height:20%;object-fit:contain;border-radius:12px}.scene{isolation:isolate}.logo{position:absolute;left:10%;top:6%;width:18%;height:10%;object-fit:contain}.caption{position:absolute;bottom:5%;left:8%;right:8%;font-size:42px;text-align:center;opacity:0;background:#0D0F14;padding:16px;border-radius:12px}.brand{font-size:28px;letter-spacing:6px;color:${accent}}h1{font-size:76px;line-height:1.1;margin:48px 0 36px;overflow-wrap:anywhere}p{font-size:38px;line-height:1.5;margin:0;overflow-wrap:anywhere}.line{width:100px;height:8px;background:${accent};margin-bottom:40px}</style><script src="gsap.min.js"></script></head><body><div id="stage">${brand.logoAssetId?'<img class="logo" src="logo.png" alt="">':""}${scenes.map(s=>`<section class="scene" id="${s.id}">${s.imageAssetId?`<img class="media" src="media-${scenes.indexOf(s)}.png" alt="">`:""}<div class="brand">${escapeHtml(brand.name)}</div><h1>${escapeHtml(s.title)}</h1><div class="line"></div><p>${escapeHtml(s.text)}</p></section>`).join("")}${(input.captionCues||[]).map((cue,i)=>`<div class="caption" id="caption-${i}">${escapeHtml(cue.text)}</div>`).join("")}</div><script>window.__timelines={};const tl=gsap.timeline({paused:true});${scenes.map(s=>`tl.set("#${s.id}",{opacity:1},${s.start});tl.from("#${s.id} h1",{y:35,opacity:0,duration:0.65,ease:"power3.out"},${s.start});tl.from("#${s.id} p",{y:20,opacity:0,duration:0.65,ease:"power2.out"},${s.start+.2});tl.to("#${s.id} .line",{width:250,duration:${s.duration},ease:"none"},${s.start});tl.set("#${s.id}",{opacity:0},${s.end});`).join("")}${(input.captionCues||[]).map((cue,i)=>`tl.set("#caption-${i}",{opacity:1},${cue.startMs/1000});tl.set("#caption-${i}",{opacity:0},${cue.endMs/1000});`).join("")}window.__timelines.soravyn=tl;</script></body></html>`;
 return { html, scenes, width, height, duration };
}
