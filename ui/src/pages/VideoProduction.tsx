import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "../components/ui/button";
type Scene={title:string;text:string;duration:number;speech?:string;imageAssetId?:string;imageLicense?:string};
export type Job={id:string;campaignId:string;status:string;error:string|null;approvalId:string|null;reviewStatus:string|null;events:{stage:string;at:string}[];input:{campaignName:string;platform:string;scenes?:Scene[];revisionOf?:string;revisionNote?:string; narration?:string}};
const field="w-full rounded-md border border-border bg-background p-2 text-sm";
export function VideoProduction({companyId}:{companyId:string}){
 const cache=useQueryClient();const base=`/companies/${companyId}/video`;
 const [campaignId,setCampaignId]=useState("");const [platform,setPlatform]=useState("tiktok");
 const [narration,setNarration]=useState("none");
 const provider=useQuery({queryKey:["video-script-provider",companyId],queryFn:()=>api.get<{configured:boolean;model:string|null}>(`${base}/script-provider`),retry:false});
 const script=useMutation({mutationFn:()=>api.post(`${base}/campaigns/${campaignId}/script`,{platform}),onSuccess:()=>cache.invalidateQueries({queryKey:["video-jobs",companyId]})});
 const [scenes,setScenes]=useState<Scene[]>([{title:"",text:"",duration:5}]);
 const campaigns=useQuery({queryKey:["campaigns",companyId],queryFn:()=>api.get<{id:string;name:string}[]>(`/companies/${companyId}/studio/campaigns`)});
 const jobs=useQuery({queryKey:["video-jobs",companyId],queryFn:()=>api.get<Job[]>(`${base}/jobs`),refetchInterval:5000});
 const upload=useMutation({mutationFn:async({file,index}:{file:File;index:number})=>{const form=new FormData();form.append("file",file);const result=await api.postForm<{assetId:string}>(`/companies/${companyId}/assets/images`,form);return {index,assetId:result.assetId};},onSuccess:({index,assetId})=>setScenes(v=>v.map((s,i)=>i===index?{...s,imageAssetId:assetId}:s))});
 const create=useMutation({mutationFn:()=>api.post(`${base}/campaigns/${campaignId}/jobs`,{platform,scenes,narration}),onSuccess:()=>cache.invalidateQueries({queryKey:["video-jobs",companyId]})});
 const retry=useMutation({mutationFn:(id:string)=>api.post(`${base}/jobs/${id}/retry`,{}),onSuccess:()=>cache.invalidateQueries({queryKey:["video-jobs",companyId]})});
 const cancel=useMutation({mutationFn:(id:string)=>api.post(`${base}/jobs/${id}/cancel`,{}),onSuccess:()=>cache.invalidateQueries({queryKey:["video-jobs",companyId]})});
 const error=cancel.error||upload.error||script.error||retry.error||create.error||campaigns.error||jobs.error;
 return <section className="space-y-6">
  <form className="space-y-4 rounded-xl border border-border p-5" onSubmit={e=>{e.preventDefault();create.mutate();}}>
   <h2 className="text-lg font-medium">Produire une vidéo à partir d’un script</h2>
   <p className="text-sm text-muted-foreground">Composition animée locale avec HyperFrames. Voix eSpeak optionnelle, sans musique. Saisissez le texte validé de chaque scène. Le worker doit être démarré pour traiter la file.</p>
   {error&&<p role="alert" className="text-destructive">{error.message}</p>}
   <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Campagne<select required className={field} value={campaignId} onChange={e=>setCampaignId(e.target.value)}><option value="">Choisir une campagne</option>{campaigns.data?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label className="space-y-1 text-sm">Format<select className={field} value={platform} onChange={e=>setPlatform(e.target.value)}>{["tiktok","reels","shorts","youtube","square"].map(p=><option key={p}>{p}</option>)}</select></label></div>
   <label className="block text-sm">Narration locale<select className={field} value={narration} onChange={e=>setNarration(e.target.value)}><option value="none">Sans voix</option><option value="fr">Français — eSpeak synthétique</option><option value="en">Anglais — eSpeak synthétique</option></select></label>
   <Button type="button" variant="outline" disabled={!campaignId||!provider.data?.configured||script.isPending} onClick={()=>script.mutate()}>Préparer le script avec le modèle local</Button>
   {!provider.data?.configured&&<p className="text-sm text-muted-foreground">Génération IA indisponible : configurer un modèle Ollama local dans le worker et le serveur.</p>}
   {scenes.map((s,i)=><fieldset key={i} className="space-y-3 rounded-md border border-border p-3"><legend className="px-2 text-sm">Scène {i+1}</legend>
    <label className="block text-sm">Titre<input required maxLength={90} className={field} value={s.title} onChange={e=>setScenes(v=>v.map((x,n)=>n===i?{...x,title:e.target.value}:x))}/></label>
    <label className="block text-sm">Texte<textarea required maxLength={260} className={field} value={s.text} onChange={e=>setScenes(v=>v.map((x,n)=>n===i?{...x,text:e.target.value}:x))}/></label>
    <label className="block text-sm">Image du client (PNG, JPEG, WebP)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={upload.isPending} className={field} onChange={e=>{const file=e.target.files?.[0];if(file)upload.mutate({file,index:i});}}/></label>
    {s.imageAssetId&&<><p className="text-xs text-muted-foreground">Image rattachée à cette scène.</p><label className="block text-sm">Droits sur l’image<input required maxLength={1000} placeholder="Propriété du client, licence ou autorisation" className={field} value={s.imageLicense||""} onChange={e=>setScenes(v=>v.map((x,n)=>n===i?{...x,imageLicense:e.target.value}:x))}/></label></>}
    <label className="block text-sm">Durée en secondes<input type="number" min={2} max={15} required className={field} value={s.duration} onChange={e=>setScenes(v=>v.map((x,n)=>n===i?{...x,duration:Number(e.target.value)}:x))}/></label>
    {scenes.length>1&&<Button type="button" variant="ghost" onClick={()=>setScenes(v=>v.filter((_,n)=>n!==i))}>Retirer cette scène</Button>}
   </fieldset>)}
   <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={scenes.length>=12} onClick={()=>setScenes(v=>[...v,{title:"",text:"",duration:5}])}>Ajouter une scène</Button><Button type="submit" disabled={!campaignId||create.isPending||upload.isPending}>{create.isPending?"Enregistrement…":"Mettre le rendu en file"}</Button></div>
   {create.isSuccess&&<p role="status">Projet enregistré dans la file de production.</p>}
  </form>
  <h2 className="text-xl font-medium">Historique de production</h2>
  {jobs.isLoading&&<p role="status">Chargement…</p>}
  {jobs.data?.length===0&&<p className="text-muted-foreground">Aucune production vidéo pour ce client.</p>}
  {jobs.data?.map(job=><article key={job.id} className="space-y-3 rounded-xl border border-border p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">{job.input.campaignName}</h3><span className="text-sm">{job.status}</span></div><p className="text-xs text-muted-foreground">{job.id} · {job.input.platform}</p>
   <ol className="space-y-1 text-sm text-muted-foreground">{job.events.map((e,i)=><li key={i}>{new Date(e.at).toLocaleString()} · {e.stage}</li>)}</ol>
   {job.error&&<p role="alert" className="text-destructive">{job.error}</p>}{["queued","running"].includes(job.status)&&<Button variant="outline" disabled={cancel.isPending} onClick={()=>cancel.mutate(job.id)}>Annuler la production</Button>}{["failed","cancelled"].includes(job.status)&&<Button variant="outline" disabled={retry.isPending} onClick={()=>retry.mutate(job.id)}>Relancer le rendu</Button>}
   {job.status==="script_ready"&&job.input.scenes&&<><p className="text-sm text-muted-foreground">Script proposé : à relire avant de lancer un rendu.</p><pre className="whitespace-pre-wrap text-sm">{job.input.scenes.map(s=>`${s.title}\n${s.text}`).join("\n\n")}</pre><Button variant="outline" onClick={()=>{setCampaignId(job.campaignId);setPlatform(job.input.platform);setScenes(job.input.scenes!);setNarration("none");}}>Charger ce script dans le formulaire</Button></>}
   {job.status==="succeeded"&&<><video controls preload="metadata" className="max-h-96 w-full rounded-md bg-black" src={`/api${base}/jobs/${job.id}/files/output.mp4`}/><div className="flex flex-wrap gap-4">{["output.mp4","brief.json","storyboard.json","report.json","captions.srt","assets.manifest.json",...(job.input.narration&&job.input.narration!=="none"?["narration.wav"]:[])].map(file=><a className="text-sm underline" key={file} href={`/api${base}/jobs/${job.id}/files/${file}`}>Télécharger {file}</a>)}</div><VideoReview job={job} companyId={companyId} /><VideoRevision job={job} companyId={companyId} /></>}
  </article>)}
 </section>;
}

function VideoReview({job,companyId}:{job:Job;companyId:string}){
 const cache=useQueryClient();const [note,setNote]=useState("");
 const decision=useMutation({mutationFn:(action:"approve"|"reject")=>api.post(`/approvals/${job.approvalId}/${action}`,{decisionNote:note}),onSuccess:()=>cache.invalidateQueries({queryKey:["video-jobs",companyId]})});
 if(!job.approvalId)return null;
 return <div className="space-y-3 border-t border-border pt-4"><p className="text-sm">Validation : {job.reviewStatus||"pending"}</p>
 {(!job.reviewStatus||["pending","revision_requested"].includes(job.reviewStatus))&&<><label className="block text-sm">Commentaire de révision<input className={field} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><div className="flex gap-3"><Button disabled={decision.isPending} onClick={()=>decision.mutate("approve")}>Approuver la vidéo</Button><Button variant="outline" disabled={decision.isPending||!note.trim()} onClick={()=>decision.mutate("reject")}>Refuser avec commentaire</Button></div></>}
 {decision.error&&<p role="alert" className="text-destructive">{decision.error.message}</p>}
 </div>;
}

function VideoRevision({job,companyId}:{job:Job;companyId:string}){
 const cache=useQueryClient();const [sceneIndex,setIndex]=useState(0);const [title,setTitle]=useState(job.input.scenes?.[0]?.title||"");const [text,setText]=useState(job.input.scenes?.[0]?.text||"");const [note,setNote]=useState("");
 const revision=useMutation({mutationFn:()=>api.post(`/companies/${companyId}/video/jobs/${job.id}/revisions`,{sceneIndex,title,text,note}),onSuccess:()=>cache.invalidateQueries({queryKey:["video-jobs",companyId]})});
 return <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm">Réviser une scène — nouvelle version</summary><form className="mt-3 space-y-3" onSubmit={e=>{e.preventDefault();revision.mutate();}}><p className="text-xs text-muted-foreground">La durée et la narration restent inchangées. Le rendu complet est recalculé ; la version source est conservée.</p><label className="block text-sm">Scène<select className={field} value={sceneIndex} onChange={e=>{const i=Number(e.target.value);setIndex(i);setTitle(job.input.scenes?.[i]?.title||"");setText(job.input.scenes?.[i]?.text||"");}}>{job.input.scenes?.map((s,i)=><option key={i} value={i}>{i+1} · {s.title}</option>)}</select></label><label className="block text-sm">Titre<input required maxLength={90} className={field} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="block text-sm">Texte visuel<textarea required maxLength={260} className={field} value={text} onChange={e=>setText(e.target.value)}/></label><label className="block text-sm">Motif<input required maxLength={2000} className={field} value={note} onChange={e=>setNote(e.target.value)}/></label><Button type="submit" disabled={revision.isPending}>Créer la révision</Button>{revision.error&&<p role="alert" className="text-destructive">{revision.error.message}</p>}{revision.isSuccess&&<p role="status">Révision ajoutée à la file de production.</p>}</form></details>;
}
