import { escapeHtml } from "./html-escape.js";
export type VideoTemplate = "editorial" | "product" | "launch";
export const templateCatalog = [
  {id:"editorial",name:"Éditorial",description:"Texte hiérarchisé, repère de chapitre et média discret."},
  {id:"product",name:"Produit",description:"Visuel principal et argumentaire dans des zones séparées."},
  {id:"launch",name:"Lancement",description:"Accroche centrée, grand titre et appel à l’action de la scène."},
] as const;
export function sceneLayout(scene:{title:string;text:string;imageAssetId?:string},index:number,total:number,brand:string,template:VideoTemplate){
  const image=scene.imageAssetId?`<img class="media" src="media-${index}.png" alt="">`:"";
  const copy=`<div class="scene-copy"><div class="brand">${escapeHtml(brand)}</div><h1>${escapeHtml(scene.title)}</h1><div class="line"></div><p>${escapeHtml(scene.text)}</p></div>`;
  const chapter=`<div class="chapter">${String(index+1).padStart(2,"0")} / ${String(total).padStart(2,"0")}</div>`;
  if(template==="product")return `<div class="product-visual">${image||`<div class="product-monogram">${escapeHtml(brand.slice(0,1))}</div>`}</div>${copy}${chapter}`;
  if(template==="launch")return `<div class="launch-rule"></div>${image}${copy}${chapter}`;
  return `${image}${copy}${chapter}`;
}
export function templateStyles(width:number,height:number,accent:string,template:VideoTemplate){
 const u=width/1080;const portrait=height>width;
 const common=`.scene{position:absolute;inset:0;padding:${height*.16}px ${width*.11}px ${height*.16}px;box-sizing:border-box;display:flex;align-items:center;opacity:0;isolation:isolate}.scene-copy{width:100%;height:100%;min-height:0;display:flex;flex-direction:column;justify-content:center;overflow:hidden}.brand{font-size:${26*u}px;letter-spacing:${4*u}px;color:${accent};flex-shrink:0}h1{font-size:${76*u}px;line-height:1.1;margin:${36*u}px 0 ${28*u}px;overflow-wrap:anywhere}p{font-size:${36*u}px;line-height:1.4;margin:0;overflow-wrap:anywhere}.line{width:${100*u}px;height:${6*u}px;background:${accent};margin-bottom:${30*u}px;flex-shrink:0}.media{position:absolute;right:8%;top:5%;width:25%;height:13%;object-fit:contain}.chapter{position:absolute;bottom:7%;left:11%;font-size:${22*u}px;letter-spacing:${3*u}px;color:#9297A5}.logo{position:absolute;left:11%;top:4%;width:16%;height:8%;object-fit:contain;z-index:3}.caption{position:absolute;bottom:3%;left:8%;right:8%;font-size:${36*u}px;text-align:center;opacity:0;background:#0D0F14;padding:${12*u}px;border-radius:${10*u}px;z-index:5}`;
 if(template==="product")return common+`.scene{padding:14% 8%;gap:${width*.05}px;flex-direction:${portrait?"column":"row"}}.product-visual{height:${portrait?"38%":"90%"};width:${portrait?"100%":"46%"};flex-shrink:0;background:#171A22;border:1px solid #303440;border-radius:${20*u}px;display:flex;align-items:center;justify-content:center;overflow:hidden}.product-visual .media{position:static;width:90%;height:90%;object-fit:contain}.product-monogram{font-size:${180*u}px;color:${accent}}.scene-copy{width:${portrait?"100%":"49%"};height:${portrait?"57%":"100%"}}h1{font-size:${62*u}px}p{font-size:${30*u}px}`;
 if(template==="launch")return common+`.scene{text-align:center;padding:16% 10%;justify-content:center}.scene-copy{align-items:center}h1{font-size:${94*u}px;letter-spacing:${-2*u}px}.brand{letter-spacing:${7*u}px}.line{margin-left:auto;margin-right:auto}.launch-rule{position:absolute;inset:11% 6%;border:1px solid #303440;border-top:4px solid ${accent};border-radius:${18*u}px;z-index:-1}.chapter{left:0;right:0;text-align:center}.media{top:5%;height:10%;width:18%;right:10%}`;
 return common;
}
