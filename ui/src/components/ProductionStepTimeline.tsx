import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
type Step={id:string;stage:string;status:string;attempts:number;errorCode:string|null;startedAt:string|null;finishedAt:string|null;output:Record<string,unknown>|null};
const names:Record<string,string>={strategy:"Stratégie",script:"Script",storyboard:"Storyboard",copy:"Textes marketing",prepare_media_audio:"Préparation des médias et de la narration",render_frames:"Rendu des images et assemblage"};
export function ProductionStepTimeline({companyId,campaignId,jobId,status,creativePack=false}:{companyId:string;campaignId:string;jobId:string;status:string;creativePack?:boolean}){
 const [open,setOpen]=useState(false);const [from,setFrom]=useState("storyboard");const cache=useQueryClient();const base=`/companies/${companyId}/video/jobs/${jobId}`;
 const steps=useQuery({queryKey:["production-steps",companyId,jobId],queryFn:()=>api.get<Step[]>(`${base}/steps`),enabled:open,refetchInterval:open&&["queued","running"].includes(status)?2000:false});
 const refresh=()=>Promise.all([cache.invalidateQueries({queryKey:["production-steps",companyId,jobId]}),cache.invalidateQueries({queryKey:["creative-packs",companyId,campaignId]}),cache.invalidateQueries({queryKey:["video-jobs",companyId]})]);
 const retry=useMutation({mutationFn:()=>api.post(`${base}/retry`,{}),onSuccess:refresh});
 const restart=useMutation({mutationFn:()=>api.post(`${base}/restart-from`,{stage:from}),onSuccess:refresh});
 const cancel=useMutation({mutationFn:()=>api.post(`${base}/cancel`,{}),onSuccess:refresh});
 const error=steps.error||retry.error||restart.error||cancel.error;
 return <details className="space-y-3 rounded border border-border p-3" onToggle={e=>setOpen(e.currentTarget.open)}><summary className="cursor-pointer text-sm">Étapes sauvegardées et reprise</summary>
 {error&&<p role="alert" className="text-destructive">{error.message}</p>}{steps.isLoading&&<p role="status">Chargement des étapes…</p>}
 <p className="text-xs text-muted-foreground">Les résultats validés sont réutilisés si leurs entrées restent compatibles. Un résultat absent, altéré ou incompatible est recalculé. Les étapes ne sont pas des validations humaines.</p>
 {steps.data?.map(step=><section className="space-y-2 border-t border-border pt-2" key={step.id}><p className="text-sm font-medium">{names[step.stage]||step.stage} · {step.status}</p><p className="text-xs text-muted-foreground">{step.attempts===0?"Résultat hérité d’une production précédente":`${step.attempts} tentative(s)`}{step.finishedAt?` · terminé le ${new Date(step.finishedAt).toLocaleString()}`:""}</p>{step.errorCode&&<p className="text-sm text-destructive">{step.errorCode==="invalid_output"?"Le résultat ne respecte pas le contrat attendu.":"L’étape n’a pas pu être exécutée."}</p>}{step.output&&creativePack&&<details><summary className="cursor-pointer text-xs">Consulter le résultat conservé</summary><StepOutput content={step.output}/></details>}</section>)}
 {steps.data?.length===0&&<p className="text-sm text-muted-foreground">Aucune étape sauvegardée pour cette production. Les anciennes productions ne sont pas rétroactivement découpées.</p>}
 {["failed","cancelled"].includes(status)&&<Button type="button" variant="outline" disabled={retry.isPending} onClick={()=>retry.mutate()}>Reprendre les étapes manquantes</Button>}
 {creativePack&&["queued","running"].includes(status)&&<Button type="button" variant="outline" disabled={cancel.isPending} onClick={()=>cancel.mutate()}>Annuler le pack</Button>}
 {creativePack&&["failed","cancelled","script_ready"].includes(status)&&<div className="space-y-2"><label className="block text-sm">Nouvelle version à partir de<select className="w-full rounded border border-border bg-background p-2" value={from} onChange={e=>setFrom(e.target.value)}>{["strategy","script","storyboard","copy"].map(stage=><option key={stage} value={stage}>{names[stage]}</option>)}</select></label><p className="text-xs text-muted-foreground">La production source reste conservée. Les étapes précédentes compatibles sont réutilisées ; l’étape choisie et les suivantes sont générées à nouveau avec le modèle local configuré.</p><Button type="button" variant="outline" disabled={restart.isPending} onClick={()=>restart.mutate()}>Créer cette reprise ciblée</Button>{restart.isSuccess&&<p role="status">Nouvelle production mise en file.</p>}</div>}
 </details>;
}
function StepOutput({content}:{content:Record<string,unknown>}){
 return <div className="space-y-2 whitespace-pre-wrap text-sm">{typeof content.summary==="string"&&<><p>{content.summary}</p><p>{String(content.positioning||"")}</p></>}{Array.isArray(content.scenes)&&content.scenes.map((scene:{title:string;text:string;duration:number},i)=><p key={i}><strong>{scene.title}</strong><br/>{scene.text} · {scene.duration} s</p>)}{Array.isArray(content.items)&&content.items.map((item:{title:string;body:string},i)=><p key={i}><strong>{item.title}</strong><br/>{item.body}</p>)}</div>;
}
