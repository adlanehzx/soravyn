import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { authApi } from "../api/auth";
import { Button } from "../components/ui/button";
export function ClientDeliveries({ companyId }: { companyId: string }) {
  const query = useQuery({
    queryKey: ["client-deliveries", companyId],
    queryFn: () =>
      api.get<{
        videos: {
          id: string;
          campaignName: string;
          platform: string;
          createdAt: string;
        }[];
        texts: { id: string; title: string; body: string; channel: string }[];
      }>(`/companies/${companyId}/client-deliverables`),
  });
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 overflow-y-auto p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground">
            SORAVYN / ESPACE CLIENT
          </p>
          <h1 className="text-3xl font-semibold">Vos créations approuvées</h1>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await authApi.signOut();
            window.location.assign("/auth");
          }}
        >
          Se déconnecter
        </Button>
      </header>
      <p className="text-sm text-muted-foreground">
        Cet accès nominatif est limité aux livrables approuvés de votre
        workspace. Les demandes de révision avant approbation utilisent le lien
        de revue transmis par votre agence.
      </p>
      {query.isLoading && <p role="status">Chargement…</p>}
      {query.error && (
        <p role="alert" className="text-destructive">
          {query.error.message}
        </p>
      )}
      {query.data?.videos.length === 0 && (
        <p className="rounded border border-dashed border-border p-6">
          Aucune vidéo approuvée pour le moment.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {query.data?.videos.map((video) => (
          <article
            key={video.id}
            className="space-y-3 rounded-lg border border-border p-4"
          >
            <h2 className="font-medium">{video.campaignName}</h2>
            <video
              className="max-h-96 w-full rounded bg-black"
              controls
              preload="metadata"
              src={`/api/companies/${companyId}/client-deliverables/${video.id}/video`}
            />
            <a
              className="text-sm underline"
              download
              href={`/api/companies/${companyId}/client-deliverables/${video.id}/video`}
            >
              Télécharger le MP4 approuvé
            </a>
          </article>
        ))}
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Textes approuvés</h2>
        {query.data?.texts.map((text) => (
          <article
            className="space-y-2 rounded border border-border p-4"
            key={text.id}
          >
            <h3 className="font-medium">{text.title}</h3>
            <p className="text-xs text-muted-foreground">{text.channel}</p>
            <p className="whitespace-pre-wrap">{text.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
