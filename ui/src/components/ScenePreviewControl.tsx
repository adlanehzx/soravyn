import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
type Preview={id:string;status:string;error:string|null};
export function ScenePreviewControl({companyId,campaignId,input,sceneIndex}:{companyId:string;campaignId:string;input:Record<string,unknown>;sceneIndex:number}){
 const [id,setId]=useState<string>();
 const create=useMutation({mutationFn:()=>api.post<Preview>(`/companies/${companyId}/video/campaigns/${campaignId}/previews`,{input,sceneIndex}),onSuccess:job=>setId(job.id)});
 const query=useQuery({queryKey:["scene-preview",companyId,id],queryFn:()=>api.get<Preview>(`/companies/${companyId}/video/jobs/${id}`),enabled:!!id,refetchInterval:query=>query.state.data&&["preview_ready","failed","cancelled"].includes(query.state.data.status)?false:2000});
 const error=create.error||query.error;
 return <div className="space-y-2"><Button type="button" variant="outline" disabled={!campaignId||create.isPending||!!query.data&&["queued","running"].includes(query.data.status)} onClick={()=>create.mutate()}>Prévisualiser cette scène</Button><p className="text-xs text-muted-foreground">Petit MP4, 640 px maximum, 24 images/s. Une scène de moins de 5 secondes est prolongée pour cet aperçu. Ce rendu ne valide aucun livrable. Relancez l’aperçu après une modification.</p>{error&&<p role="alert" className="text-destructive">{error.message}</p>}{query.data&&<p role="status" className="text-xs">{query.data.status}</p>}{query.data?.error&&<p role="alert" className="text-destructive">{query.data.error}</p>}{query.data?.status==="preview_ready"&&<video controls preload="metadata" className="max-h-80 w-full rounded bg-black" src={`/api/companies/${companyId}/video/jobs/${query.data.id}/files/preview.mp4`}/>}</div>;
}
