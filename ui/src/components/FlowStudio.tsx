import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
type Job = {
  id: string;
  campaignId: string;
  status: string;
  stage: string;
  message: string | null;
  maxCredits: number;
  observedCredits: number | null;
  prompt: string;
};
export function FlowStudio({ companyId }: { companyId: string }) {
  const base = `/companies/${companyId}/video/flow`,
    cache = useQueryClient();
  const [campaignId, setCampaign] = useState(""),
    [prompt, setPrompt] = useState(""),
    [maxCredits, setCredits] = useState(20),
    [consent, setConsent] = useState(false);
  const key = ["flow", companyId];
  const status = useQuery({
    queryKey: [...key, "status"],
    queryFn: () =>
      api.get<{
        enabled: boolean;
        calibrated: boolean;
        reason: string;
        loginCommand: string;
      }>(base + "/status"),
  });
  const jobs = useQuery({
    queryKey: key,
    queryFn: () => api.get<Job[]>(base),
    refetchInterval: 10000,
  });
  const campaigns = useQuery({
    queryKey: ["flow-campaigns", companyId],
    queryFn: () =>
      api.get<{ id: string; name: string }[]>(
        `/companies/${companyId}/studio/campaigns`
      ),
  });
  const refresh = () => cache.invalidateQueries({ queryKey: key });
  const create = useMutation({
    mutationFn: () =>
      api.post(base, {
        campaignId,
        prompt,
        maxCredits,
        confirmCreditSpend: consent,
      }),
    onSuccess: async () => {
      setConsent(false);
      await refresh();
    },
  });
  const action = useMutation({
    mutationFn: ({
      id,
      operation,
    }: {
      id: string;
      operation: "resume" | "cancel";
    }) =>
      api.post(
        `${base}/${id}/${operation}`,
        operation === "resume" ? { confirmNoGenerationSubmitted: true } : {}
      ),
    onSuccess: refresh,
  });
  const error =
    status.error ||
    jobs.error ||
    campaigns.error ||
    create.error ||
    action.error;
  const field = "block w-full rounded border border-border bg-background p-2";
  return (
    <section className="space-y-4 rounded-xl border border-border p-5">
      <h2 className="text-xl font-medium">
        Google Flow · connecteur expérimental
      </h2>
      <p className="text-sm text-muted-foreground">
        Génération dans votre navigateur local avec votre compte Google. Aucun
        accès API Ultra n’est présumé. Connexion, MFA et CAPTCHA restent
        manuels. Les clips restent à valider avant livraison.
      </p>
      {status.isLoading && <p role="status">Vérification du connecteur…</p>}
      {status.data && (
        <div className="space-y-2 text-sm">
          <p>{status.data.reason}</p>
          <p>
            Worker autorisé : {status.data.enabled ? "oui" : "non"} ·
            calibration : {status.data.calibrated ? "présente" : "à réaliser"}
          </p>
          <p>
            Connexion locale :{" "}
            <code className="break-all">{status.data.loginCommand}</code>
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error.message}
        </p>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label className="block text-sm">
          Campagne
          <select
            className={field}
            required
            value={campaignId}
            onChange={(e) => setCampaign(e.target.value)}
          >
            <option value="">Choisir une campagne</option>
            {campaigns.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Prompt vidéo
          <textarea
            className={field}
            required
            minLength={10}
            maxLength={12000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Crédits maximum pour ce clip
          <input
            className={field}
            type="number"
            required
            min={1}
            max={1000}
            value={maxCredits}
            onChange={(e) => setCredits(Number(e.target.value))}
          />
        </label>
        <label className="flex gap-2 text-sm">
          <input
            required
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          J’autorise la consommation de ces crédits dans Flow pour cette
          demande.
        </label>
        <Button disabled={!consent || create.isPending}>
          Ajouter à la file Flow
        </Button>
      </form>
      {jobs.isLoading && <p role="status">Chargement des productions…</p>}
      {jobs.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune production Flow pour ce client.
        </p>
      )}
      {jobs.data?.map((job) => (
        <article
          key={job.id}
          className="space-y-2 rounded border border-border p-3"
        >
          <p className="text-sm">
            {job.status} · {job.stage} · autorisation : {job.maxCredits} crédits
          </p>
          {job.message && <p className="text-sm">{job.message}</p>}
          <p className="whitespace-pre-wrap break-words text-sm">
            {job.prompt}
          </p>
          {job.status === "succeeded" && (
            <>
              <video
                controls
                preload="none"
                className="max-h-80 w-full"
                src={`${"/api" + base}/${job.id}/video`}
              />
              <a
                className="text-sm underline"
                href={`${"/api" + base}/${job.id}/video`}
                download
              >
                Télécharger le clip MP4
              </a>
            </>
          )}
          {job.status === "queued" && (
            <Button
              variant="outline"
              disabled={action.isPending}
              onClick={() => action.mutate({ id: job.id, operation: "cancel" })}
            >
              Annuler
            </Button>
          )}
          {job.status === "needs_attention" &&
            job.stage === "before_submission" && (
              <Button
                variant="outline"
                disabled={action.isPending}
                onClick={() =>
                  action.mutate({ id: job.id, operation: "resume" })
                }
              >
                Reprendre après correction, avant soumission
              </Button>
            )}
          {job.stage === "submission_uncertain" && (
            <p className="text-sm text-amber-500">
              Vérifiez le projet dans Flow. Aucune nouvelle génération
              automatique ne sera lancée pour ce job.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
