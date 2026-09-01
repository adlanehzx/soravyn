import { VideoProduction } from "./VideoProduction";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { api } from "../api/client";
import { Button } from "../components/ui/button";

type Check = { available: boolean; version?: string | null; requiredVersion?: string; reason?: string };
type Environment = {
  node: Check; ffmpeg: Check; ffprobe: Check; chromium: Check; sandbox: Check;
  hyperframes: Check; narration: Check; generationEnabled: boolean; reason: string;
};
const labels = { node: "Node.js ≥ 22", ffmpeg: "FFmpeg", ffprobe: "Vérification MP4", chromium: "Chromium", sandbox: "Isolation Docker", hyperframes: "HyperFrames 0.6.91", narration: "Narration" } as const;

export function VideoStudio() {
  const { selectedCompanyId } = useCompany();
  const query = useQuery({
    queryKey: ["video-environment", selectedCompanyId],
    queryFn: () => api.get<Environment>(`/companies/${selectedCompanyId}/video/environment`),
    enabled: !!selectedCompanyId, retry: false, staleTime: 60_000,
  });
  return <main className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-8">
    <header className="space-y-2"><p className="text-xs tracking-widest text-muted-foreground">SORAVYN / PRODUCTION</p>
      <h1 className="text-3xl font-semibold">Video Studio</h1>
      <p className="text-muted-foreground">Du brief de campagne au livrable vidéo.</p>
    </header>
    {!selectedCompanyId ? <p>Sélectionnez un workspace pour inspecter le moteur vidéo.</p> : <>
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-medium">Diagnostic de production</h2>
          <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? "Vérification…" : "Revérifier"}</Button>
        </div>
        {query.isLoading && <p role="status">Inspection des outils installés…</p>}
        {query.error && <p role="alert" className="text-destructive">{query.error.message}</p>}
        {query.data && <dl className="divide-y divide-border">{Object.entries(labels).map(([key, label]) => {
          const check = query.data[key as keyof typeof labels];
          return <div key={key} className="flex flex-wrap justify-between gap-2 py-3"><dt>{label}</dt><dd className={check.available ? "text-emerald-500" : "text-muted-foreground"}>{check.available ? check.version || "Disponible" : check.reason || "Indisponible"}</dd></div>;
        })}</dl>}
      </section>
      <VideoProduction key={selectedCompanyId} companyId={selectedCompanyId} />
    </>}
  </main>;
}
