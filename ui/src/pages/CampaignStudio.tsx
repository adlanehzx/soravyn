import { StudioDiagnostics } from "../components/StudioDiagnostics";
import { CampaignCreativePanel } from "../components/CampaignCreativePanel";
import { CampaignBudgetPanel } from "../components/CampaignBudgetPanel";
import { CampaignWorkflowPanel } from "../components/CampaignWorkflowPanel";
import { BrandMemoryPanel } from "../components/BrandMemoryPanel";
import { MarketingPlanPanel } from "../components/MarketingPlanPanel";
import { EditorialCalendarPanel } from "../components/EditorialCalendarPanel";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { api } from "../api/client";
import { Button } from "../components/ui/button";

type Brand = { name: string; description: string; industry: string; audience: string; tone: string; languages: string[]; colors: string[];fontFamily:string;editorialRules:string;logoAssetId:string|null;logoLicense:string };
type Campaign = { id: string; name: string; objectives: string; brief: string; status: string; audience: string; hasWorkflow?:boolean; producerTaskId: string | null };
const blank: Brand = { name: "", description: "", industry: "", audience: "", tone: "", languages: ["fr"], colors: ["#9484FF"],fontFamily:"sans",editorialRules:"",logoAssetId:null,logoLicense:"" };
const stages = ["brief", "strategy", "production", "review", "approval", "delivery"];
const stageNames: Record<string, string> = { brief: "Brief", strategy: "Stratégie", production: "Production", review: "Révision", approval: "Validation", delivery: "Livraison" };
const fieldClass = "w-full rounded-md border border-border bg-background p-2 text-sm";

export function CampaignStudio() {
  const { selectedCompanyId } = useCompany();
  // Remount forms at company boundaries; never carry one client's draft into another.
  return selectedCompanyId ? <ClientStudio key={selectedCompanyId} companyId={selectedCompanyId} /> : <p className="p-8">Sélectionnez ou créez un workspace client.</p>;
}
function ClientStudio({ companyId }: { companyId: string }) {
  const base = `/companies/${companyId}/studio`;
  const cache = useQueryClient();
  const brand = useQuery({ queryKey: ["brand", companyId], queryFn: () => api.get<Brand | null>(`${base}/brand`), retry: false });
  const campaigns = useQuery({ queryKey: ["campaigns", companyId], queryFn: () => api.get<Campaign[]>(`${base}/campaigns`), retry: false });
  const [logoError,setLogoError]=useState("");
  const [profile, setProfile] = useState<Brand>(blank);
  const agents = useQuery({ queryKey: ["studio-agents", companyId], queryFn: () => api.get<{ id: string; name: string; status: string }[]>(`/companies/${companyId}/agents`), retry: false });
  const [producerId, setProducerId] = useState("");
  const task = useMutation({ mutationFn: (id: string) => api.post(`${base}/campaigns/${id}/producer-task`, { agentId: producerId }), onSuccess: () => cache.invalidateQueries({ queryKey: ["campaigns", companyId] }) });
  const [name, setName] = useState("");
  const [objectives, setObjectives] = useState("");
  const [brief, setBrief] = useState("");
  useEffect(() => { if (brand.data) setProfile(brand.data); }, [brand.data]);
  const saveBrand = useMutation({ mutationFn: () => api.put(`${base}/brand`, Object.fromEntries(Object.keys(blank).map(k => [k, profile[k as keyof Brand]]))), onSuccess: () => cache.invalidateQueries({ queryKey: ["brand", companyId] }) });
  const create = useMutation({ mutationFn: () => api.post(`${base}/campaigns`, { name, objectives, brief, audience: profile.audience, channels: [] }), onSuccess: () => { setName(""); setObjectives(""); setBrief(""); return cache.invalidateQueries({ queryKey: ["campaigns", companyId] }); } });
  const transition = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => api.post(`${base}/campaigns/${id}/transition`, { status }), onSuccess: () => cache.invalidateQueries({ queryKey: ["campaigns", companyId] }) });
  function submit(event: FormEvent) { event.preventDefault(); create.mutate(); }
  const error = brand.error || campaigns.error || saveBrand.error || create.error || transition.error || task.error || agents.error;
  return <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
    <header><p className="text-xs tracking-widest text-muted-foreground">SORAVYN / MARKETING OPERATIONS</p><h1 className="mt-2 text-3xl font-semibold">Campaign Studio</h1><p className="mt-2 text-muted-foreground">Une identité de marque, des campagnes et un suivi partagé avec votre équipe.</p></header>
    {error && <p role="alert" className="rounded-md border border-destructive p-3 text-destructive">{error.message}</p>}
    <StudioDiagnostics companyId={companyId}/>
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-4 rounded-xl border border-border bg-card p-5" onSubmit={e => { e.preventDefault(); saveBrand.mutate(); }}>
        <h2 className="text-lg font-medium">Identité du client</h2>
        {brand.isLoading ? <p role="status">Chargement…</p> : <>
          {([['name', 'Nom de marque'], ['industry', 'Secteur'], ['description', 'Description'], ['audience', 'Audience cible'], ['tone', 'Ton éditorial']] as const).map(([key, label]) => <label key={key} className="block space-y-1 text-sm"><span>{label}</span><input className={fieldClass} required={key === 'name'} maxLength={key === 'name' ? 200 : 2000} value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} /></label>)}
          <label className="block text-sm">Couleurs (hexadécimal, séparées par des virgules)<input className={fieldClass} value={profile.colors.join(", ")} onChange={e=>setProfile(p=>({...p,colors:e.target.value.split(",").map(v=>v.trim())}))}/></label>
          <label className="block text-sm">Langues (séparées par des virgules)<input className={fieldClass} value={profile.languages.join(", ")} onChange={e=>setProfile(p=>({...p,languages:e.target.value.split(",").map(v=>v.trim())}))}/></label>
          <label className="block text-sm">Typographie<select className={fieldClass} value={profile.fontFamily} onChange={e=>setProfile(p=>({...p,fontFamily:e.target.value}))}><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
          <label className="block text-sm">Règles éditoriales<textarea maxLength={5000} className={fieldClass} value={profile.editorialRules} onChange={e=>setProfile(p=>({...p,editorialRules:e.target.value}))}/></label>
          <label className="block text-sm">Logo du client<input type="file" accept="image/png,image/jpeg,image/webp" className={fieldClass} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=new FormData();data.append("file",file);const asset=await api.postForm<{assetId:string}>(`/companies/${companyId}/assets/images`,data);setProfile(p=>({...p,logoAssetId:asset.assetId}));}catch(error){setLogoError(error instanceof Error?error.message:"Échec de l’envoi");}}}/></label>
          {logoError&&<p role="alert" className="text-destructive">{logoError}</p>}
          {profile.logoAssetId&&<><p className="text-xs">Logo rattaché à la marque.</p><label className="block text-sm">Droits sur le logo<input required maxLength={1000} className={fieldClass} value={profile.logoLicense} onChange={e=>setProfile(p=>({...p,logoLicense:e.target.value}))}/></label><Button type="button" variant="ghost" onClick={()=>setProfile(p=>({...p,logoAssetId:null,logoLicense:""}))}>Retirer le logo</Button></>}
          <Button disabled={saveBrand.isPending || !!brand.error} type="submit">{saveBrand.isPending ? "Enregistrement…" : "Enregistrer la marque"}</Button>
          {saveBrand.isSuccess && <p role="status" className="text-sm text-emerald-500">Identité enregistrée.</p>}
        </>}
      </form>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-medium">Nouvelle campagne</h2>
        <label className="block space-y-1 text-sm"><span>Nom</span><input required maxLength={200} className={fieldClass} value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="block space-y-1 text-sm"><span>Objectifs</span><textarea required maxLength={2000} className={fieldClass} value={objectives} onChange={e => setObjectives(e.target.value)} /></label>
        <label className="block space-y-1 text-sm"><span>Brief marketing</span><textarea required maxLength={20000} rows={5} className={fieldClass} value={brief} onChange={e => setBrief(e.target.value)} /></label>
        <Button disabled={create.isPending} type="submit">{create.isPending ? "Création…" : "Créer la campagne"}</Button>
      </form>
    </div>
    <BrandMemoryPanel companyId={companyId} />
    <MarketingPlanPanel companyId={companyId} />
    <EditorialCalendarPanel companyId={companyId} />
    <section className="space-y-4"><h2 className="text-xl font-medium">Campagnes du client</h2><label className="block max-w-sm space-y-1 text-sm"><span>Producer pour les nouveaux briefs vidéo</span><select className={fieldClass} value={producerId} onChange={e => setProducerId(e.target.value)}><option value="">Choisir un agent du client</option>{agents.data?.filter(a => !["terminated", "pending_approval"].includes(a.status)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><p className="text-sm text-muted-foreground">La tâche est créée dans le backlog. Son exécution se pilote depuis les tâches ; aucun modèle payant n’est appelé par ce bouton.</p>
      {campaigns.isLoading && <p role="status">Chargement des campagnes…</p>}
      {campaigns.data?.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-muted-foreground">Votre première campagne commence par un brief. Définissez son objectif ci-dessus.</p>}
      {campaigns.data?.map(c => { const next = stages[stages.indexOf(c.status) + 1]; return <article key={c.id} className="space-y-3 rounded-xl border border-border p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{c.name}</h3><span className="text-sm text-muted-foreground">{stageNames[c.status] || c.status}</span></div><p>{c.objectives}</p>{c.hasWorkflow ? null : c.producerTaskId ? <p className="text-sm text-emerald-500">Brief Producer enregistré dans les tâches.</p> : <Button variant="outline" disabled={!producerId || task.isPending} onClick={() => task.mutate(c.id)}>Préparer le brief vidéo</Button>}<p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.brief}</p>{next && (!c.hasWorkflow||next==="delivery") && <Button variant="outline" disabled={transition.isPending} onClick={() => transition.mutate({ id: c.id, status: next })}>Passer en {stageNames[next]}</Button>}{c.status === "approval" && <p className="text-sm text-muted-foreground">La livraison nécessite une vidéo approuvée dans le centre de validations.</p>}<CampaignCreativePanel companyId={companyId} campaignId={c.id}/><CampaignBudgetPanel companyId={companyId} campaignId={c.id}/><CampaignWorkflowPanel companyId={companyId} campaignId={c.id}/></article>; })}
    </section>
  </div>;
}
