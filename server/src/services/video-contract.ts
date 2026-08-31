import { z } from "zod";
export const videoInput = z.object({
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
}).strict().refine(v => v.scenes.reduce((s, c) => s + c.duration, 0) <= 90, "Maximum duration is 90 seconds");
export const videoRoot = () => process.env.SORAVYN_VIDEO_ROOT || new URL("../../../data/video/", import.meta.url).pathname;
export const videoImage = () => process.env.SORAVYN_VIDEO_IMAGE || "soravyn-video:0.6.91";
export function escapeHtml(value: string) {
 return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
export function composeVideo(input: z.input<typeof videoInput>, brand: { name: string; colors: string[] }) {
 const [width, height] = input.platform === "youtube" ? [1920,1080] : input.platform === "square" ? [1080,1080] : [1080,1920];
 const duration = input.scenes.reduce((s,c) => s+c.duration,0);
 const accent = /^#[a-fA-F0-9]{6}$/.test(brand.colors[0] || "") ? brand.colors[0] : "#9484FF";
 let offset=0;
 const scenes=input.scenes.map((s,i)=>{ const start=offset; offset+=s.duration; return { ...s, id:`scene-${i+1}`, start, end:offset }; });
 const html=`<!doctype html><html data-composition-id="soravyn" data-composition-duration="${duration}" data-width="${width}" data-height="${height}"><head><meta charset="utf-8"><style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:#0D0F14;color:#F5F5F7;font-family:Arial,sans-serif}#stage{position:relative;width:100%;height:100%}.scene{position:absolute;inset:0;padding:160px 130px 240px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;opacity:0}.media{position:absolute;right:10%;top:6%;width:28%;height:20%;object-fit:contain;border-radius:12px}.scene{isolation:isolate}.brand{font-size:28px;letter-spacing:6px;color:${accent}}h1{font-size:76px;line-height:1.1;margin:48px 0 36px;overflow-wrap:anywhere}p{font-size:38px;line-height:1.5;margin:0;overflow-wrap:anywhere}.line{width:100px;height:8px;background:${accent};margin-bottom:40px}</style><script src="gsap.min.js"></script></head><body><div id="stage">${scenes.map(s=>`<section class="scene" id="${s.id}">${s.imageAssetId?`<img class="media" src="media-${scenes.indexOf(s)}.png" alt="">`:""}<div class="brand">${escapeHtml(brand.name)}</div><h1>${escapeHtml(s.title)}</h1><div class="line"></div><p>${escapeHtml(s.text)}</p></section>`).join("")}</div><script>window.__timelines={};const tl=gsap.timeline({paused:true});${scenes.map(s=>`tl.set("#${s.id}",{opacity:1},${s.start});tl.from("#${s.id} h1",{y:35,opacity:0,duration:0.65,ease:"power3.out"},${s.start});tl.from("#${s.id} p",{y:20,opacity:0,duration:0.65,ease:"power2.out"},${s.start+.2});tl.to("#${s.id} .line",{width:250,duration:${s.duration},ease:"none"},${s.start});tl.set("#${s.id}",{opacity:0},${s.end});`).join("")}window.__timelines.soravyn=tl;</script></body></html>`;
 return { html, scenes, width, height, duration };
}
