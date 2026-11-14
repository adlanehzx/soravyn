import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
type Probe={available:boolean;version?:string|null;reason?:string};
type Diagnostic={node:Probe;ffmpeg:Probe;ffprobe:Probe;chromium:Probe;sandbox:Probe;hyperframes:Probe;narration:Probe;worker:Probe;storage:Probe;model:Probe;database:Probe};
const labels:Record<keyof Diagnostic,string>={node:"Node.js",ffmpeg:"FFmpeg hôte",ffprobe:"Vérification MP4",chromium:"Chromium hôte",sandbox:"Docker",hyperframes:"Image de rendu",narration:"Narration locale",worker:"Signal du worker",storage:"Stockage vidéo",model:"Modèle local",database:"Base de données"};
export function StudioDiagnostics({companyId}:{companyId:string}){
 const [open,setOpen]=useState(false);const query=useQuery({queryKey:["studio-diagnostics",companyId],queryFn:()=>api.get<Diagnostic>(`/companies/${companyId}/video/environment`),enabled:open,staleTime:0,retry:false});
 return <details className="rounded-lg border border-border p-4" onToggle={e=>setOpen(e.currentTarget.open)}><summary className="cursor-pointer font-medium">Diagnostic du studio</summary><div className="mt-3 space-y-3"><Button variant="outline" disabled={query.isFetching} onClick={()=>query.refetch()}>Actualiser les vérifications</Button>{query.isFetching&&<p role="status">Vérification des services…</p>}{query.error&&<p role="alert" className="text-destructive">{query.error.message}</p>}{query.data&&Object.entries(labels).map(([key,label])=>{const probe=query.data[key as keyof Diagnostic];return <p key={key} className="text-sm"><strong>{label}</strong> : {probe?.available?"disponible":"indisponible ou non vérifié"}{probe?.version?` · ${probe.version}`:""}{probe?.reason&&<span className="block text-xs text-muted-foreground">{probe.reason}</span>}</p>;})}<p className="text-xs text-muted-foreground">Les outils du conteneur peuvent différer de ceux de l’hôte. Le signal du worker indique une activité récente ; il ne garantit pas la réussite du prochain rendu.</p></div></details>;
}
