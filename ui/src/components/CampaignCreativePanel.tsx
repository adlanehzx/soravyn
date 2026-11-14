import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
type Pack = {id:string;status:string;error:string|null;events:{stage:string;at:string}[];input:{pack?:{strategy:Record<string,unknown>;script:Record<string,unknown>;storyboard:Record<string,unknown>;copy:{channel:string;title:string;body:string}[]}}};
type Copy = {id:string;channel:string;title:string;body:string;status:string;decisionNote:string|null};
const field="w-full min-w-0 rounded-md border border-border bg-background p-2 text-sm";
export function CampaignCreativePanel({companyId,campaignId}:{companyId:string;campaignId:string}) {
 const [open,setOpen]=useState(false); const cache=useQueryClient(); const base=`/companies/${companyId}/studio/campaigns/${campaignId}`;
 const packs=useQuery({queryKey:["creative-packs",companyId,campaignId],queryFn:()=>api.get<Pack[]>(`${base}/creative-packs`),enabled:open,refetchInterval:open?5000:false});
 const copy=useQuery({queryKey:["campaign-copy",companyId,campaignId],queryFn:()=>api.get<Copy[]>(`${base}/copy`),enabled:open});
 const provider=useQuery({queryKey:["script-provider",companyId],queryFn:()=>api.get<{configured:boolean;model:string|null}>(`/companies/${companyId}/video/script-provider`),enabled:open});
 const [platform,setPlatform]=useState("tiktok");const [channel,setChannel]=useState("instagram");const [title,setTitle]=useState("");const [body,setBody]=useState("");const [revisionOf,setRevisionOf]=useState<string>();
 const refresh=()=>Promise.all([cache.invalidateQueries({queryKey:["creative-packs",companyId,campaignId]}),cache.invalidateQueries({queryKey:["campaign-copy",companyId,campaignId]}),cache.invalidateQueries({queryKey:["campaign-workflow",companyId,campaignId]})]);
 const generate=useMutation({mutationFn:()=>api.post(`${base}/creative-packs`,{platform}),onSuccess:refresh});
 const save=useMutation({mutationFn:()=>api.post(`${base}/copy`,{channel,title,body,revisionOf}),onSuccess:()=>{setTitle("");setBody("");setRevisionOf(undefined);return refresh();}});
 const importCopy=useMutation({mutationFn:({jobId,item}:{jobId:string;item:{channel:string;title:string;body:string}})=>api.post(`${base}/copy`,{...item,sourceJobId:jobId}),onSuccess:refresh});
 const submit=useMutation({mutationFn:({kind,content}:{kind:string;content:Record<string,unknown>})=>api.post(`${base}/workflow/${kind}/deliverables`,{content}),onSuccess:refresh});
 const decision=useMutation({mutationFn:({id,action,note}:{id:string;action:string;note?:string})=>api.post(`${base}/copy/${id}/decision`,{decision:action,note:note||""}),onSuccess:refresh});
 const [notes,setNotes]=useState<Record<string,string>>({});
 const error=packs.error||copy.error||provider.error||generate.error||save.error||importCopy.error||submit.error||decision.error;
 return <details className="space-y-4 rounded-lg border border-border p-4" onToggle={e=>setOpen(e.currentTarget.open)}><summary className="cursor-pointer font-medium">Création IA et textes marketing</summary>
 {error&&<p role="alert" className="text-destructive">{error.message}</p>}
 <p className="text-sm text-muted-foreground">Le modèle local propose un pack de campagne. Chaque étape reste un brouillon : démarrez le workflow, puis soumettez et validez les étapes dans leur ordre. Les textes de publication ont leur propre validation ; aucune publication automatique.</p>
 <label className="block text-sm">Format du pack<select className={field} value={platform} onChange={e=>setPlatform(e.target.value)}>{["tiktok","reels","shorts","youtube","square"].map(p=><option key={p}>{p}</option>)}</select></label>
 <Button disabled={!provider.data?.configured||generate.isPending} onClick={()=>generate.mutate()}>Générer stratégie, script, storyboard et publications</Button>
 {!provider.data?.configured&&<p className="text-sm text-muted-foreground">Un modèle Ollama local doit être configuré sur le serveur et le worker.</p>}
 {packs.isLoading&&<p role="status">Chargement des productions…</p>}
 {packs.data?.map(job=><div key={job.id} className="space-y-3 border-t border-border pt-3"><p className="text-sm">Pack {job.id.slice(0,8)} · {job.status} · {job.events.at(-1)?.stage}</p>{job.error&&<p role="alert">{job.error}</p>}{job.input.pack&&<>
 {(["strategy","script","storyboard"] as const).map(kind=><details key={kind}><summary className="cursor-pointer text-sm">{kind}</summary><DraftPreview content={job.input.pack![kind]}/><Button variant="outline" disabled={submit.isPending} onClick={()=>submit.mutate({kind,content:job.input.pack![kind]})}>Soumettre ce brouillon au workflow</Button></details>)}
 {job.input.pack.copy.map((item,i)=><div key={i} className="space-y-2"><strong className="text-sm">{item.channel} · {item.title}</strong><p className="whitespace-pre-wrap text-sm">{item.body}</p><Button variant="outline" disabled={importCopy.isPending} onClick={()=>importCopy.mutate({jobId:job.id,item})}>Enregistrer ce texte à relire</Button></div>)}
 </>}</div>)}
 <form className="space-y-3 border-t border-border pt-3" onSubmit={e=>{e.preventDefault();save.mutate();}}><h4 className="font-medium">{revisionOf?"Nouvelle version du texte":"Rédiger un texte marketing"}</h4><label className="block text-sm">Canal<select className={field} value={channel} onChange={e=>setChannel(e.target.value)}>{["tiktok","instagram","linkedin","email","advertisement","website"].map(c=><option key={c}>{c}</option>)}</select></label><label className="block text-sm">Titre<input required maxLength={200} className={field} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="block text-sm">Texte<textarea required maxLength={10000} rows={5} className={field} value={body} onChange={e=>setBody(e.target.value)}/></label><Button type="submit" disabled={save.isPending}>Enregistrer le brouillon</Button></form>
 {copy.data?.map(item=><article className="space-y-2 rounded border border-border p-3" key={item.id}><p className="text-sm font-medium">{item.channel} · {item.title} · {item.status}</p><p className="whitespace-pre-wrap text-sm">{item.body}</p>{item.decisionNote&&<p className="text-sm">Retour : {item.decisionNote}</p>}{item.status==="draft"&&<><label className="block text-sm">Commentaire<input className={field} value={notes[item.id]||""} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))}/></label><Button disabled={decision.isPending} onClick={()=>decision.mutate({id:item.id,action:"approved"})}>Approuver le texte</Button><Button variant="outline" disabled={decision.isPending||!notes[item.id]?.trim()} onClick={()=>decision.mutate({id:item.id,action:"rejected",note:notes[item.id]})}>Demander une correction</Button></>}<Button variant="ghost" onClick={()=>{setChannel(item.channel);setTitle(item.title);setBody(item.body);setRevisionOf(item.id);}}>Préparer une nouvelle version</Button></article>)}
 </details>;
}

function DraftPreview({content}:{content:Record<string,unknown>}){return <div className="space-y-2 whitespace-pre-wrap text-sm">{typeof content.summary==="string"&&<><p>{content.summary}</p><p>{String(content.positioning)}</p>{Array.isArray(content.keyMessages)&&<ul className="list-inside list-disc">{content.keyMessages.map((m,i)=><li key={i}>{String(m)}</li>)}</ul>}</>}{Array.isArray(content.scenes)&&content.scenes.map((scene:{title:string;text:string;duration:number},i)=><p key={i}><strong>{i+1} · {scene.title}</strong><br/>{scene.text} · {scene.duration} s</p>)}</div>;}
