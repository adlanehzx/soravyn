import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { api } from "../api/client";
import { Button } from "../components/ui/button";
const field =
  "w-full min-w-0 rounded border border-border bg-background p-2 text-sm";
type Limits = {
  requireAgentPolicy: boolean;
  maxAgentRuns: number;
  maxVideoRuns: number;
  artifactRetentionDays: number;
};
type Policy = {
  requireTaskContext: boolean;
  allowExternalAccess: boolean;
  mode: string;
  allowedAdapters: string[];
  allowedCommands: string[];
  workspaceRoot: string;
  workspaceWritable: boolean;
  allowedEndpoints: string[];
  allowedEnvKeys: string[];
  apiCapabilities: string[];
  timeoutSec: number;
  cpu: number;
  memoryMb: number;
};
type Agent = {
  id: string;
  name: string;
  adapterType: string;
  command: string | null;
  policy: Policy | null;
  recommendedWorkspace: string;
};
type Recovery = {
  taskId: string;
  title: string;
  sourceRunId: string;
  status: string;
  error: string | null;
  recovery: { id: string; newRunId: string | null } | null;
  checkpoints: {
    id: string;
    summary: string;
    output: { completed?: string[]; nextActions?: string[]; notes?: string };
  }[];
};
export function Governance() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  return !selectedCompanyId ? (
    <p className="p-8">Sélectionnez un workspace.</p>
  ) : selectedCompany?.accessRole && selectedCompany.accessRole !== "admin" ? (
    <p className="p-8">Cette page nécessite le rôle administrateur.</p>
  ) : (
    <GovernanceConsole key={selectedCompanyId} companyId={selectedCompanyId} />
  );
}
function GovernanceConsole({ companyId }: { companyId: string }) {
  const base = `/companies/${companyId}/governance`;
  const cache = useQueryClient();
  const key = ["governance", companyId];
  const limits = useQuery({
    queryKey: [...key, "limits"],
    queryFn: () => api.get<Limits>(base),
  });
  const agents = useQuery({
    queryKey: [...key, "agents"],
    queryFn: () => api.get<Agent[]>(`${base}/agents`),
  });
  const members = useQuery({
    queryKey: [...key, "members"],
    queryFn: () =>
      api.get<
        {
          userId: string;
          name: string;
          email: string;
          role: string;
          isInstanceAdmin: boolean;
        }[]
      >(`${base}/members`),
  });
  const recoveries = useQuery({
    queryKey: [...key, "recoverable"],
    queryFn: () => api.get<Recovery[]>(`${base}/recoverable`),
    refetchInterval: 10000,
  });
  const operations = useQuery({
    queryKey: [...key, "operations"],
    queryFn: () =>
      api.get<{
        activeAgentPermits: number;
        warnings: { agentId: string; message: string }[];
        recentRunFailures: {
          id: string;
          status: string;
          errorCode: string | null;
        }[];
        recentProductionFailures: { id: string; error: string | null }[];
        retentionCandidates: number;
      }>(`${base}/operations`),
  });
  const [draft, setDraft] = useState<Limits>({
    requireAgentPolicy: false,
    maxAgentRuns: 4,
    maxVideoRuns: 1,
    artifactRetentionDays: 30,
  });
  const [agentId, setAgentId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("client");
  useEffect(() => {
    if (limits.data)
      setDraft({
        requireAgentPolicy: limits.data.requireAgentPolicy,
        maxAgentRuns: limits.data.maxAgentRuns,
        maxVideoRuns: limits.data.maxVideoRuns,
        artifactRetentionDays: limits.data.artifactRetentionDays,
      });
  }, [limits.data]);
  const refresh = () => cache.invalidateQueries({ queryKey: key });
  const save = useMutation({
    mutationFn: () => api.put(base, draft),
    onSuccess: refresh,
  });
  const member = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      api.put(`${base}/members/${encodeURIComponent(id)}`, { role: value }),
    onSuccess: refresh,
  });
  const removeGlobal = useMutation({
    mutationFn: (id: string) =>
      api.delete(`${base}/instance-admins/${encodeURIComponent(id)}`),
    onSuccess: refresh,
  });
  const error =
    limits.error ||
    agents.error ||
    members.error ||
    recoveries.error ||
    operations.error ||
    save.error ||
    member.error ||
    removeGlobal.error;
  const selected = agents.data?.find((agent) => agent.id === agentId);
  return (
    <main className="mx-auto max-w-6xl space-y-7 p-4 sm:p-8">
      <header>
        <p className="text-xs tracking-widest text-muted-foreground">
          SORAVYN / CONTRÔLE ET EXPLOITATION
        </p>
        <h1 className="text-3xl font-semibold">Gouvernance</h1>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded border border-destructive p-3 text-destructive"
        >
          {error.message}
        </p>
      )}
      <form
        className="space-y-3 rounded-lg border border-border p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <h2 className="text-xl font-medium">Règles du workspace</h2>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.requireAgentPolicy}
            onChange={(e) =>
              setDraft((v) => ({ ...v, requireAgentPolicy: e.target.checked }))
            }
          />
          Exiger une politique approuvée avant toute exécution d’agent
        </label>
        <p className="text-xs text-muted-foreground">
          Les installations existantes restent compatibles tant que ce contrôle
          n’est pas activé. Un agent doté d’une politique doit toujours la
          respecter. Les adaptateurs locaux de confiance ne sont pas des
          sandboxes.
        </p>
        {(
          [
            ["maxAgentRuns", "Agents simultanés", 1, 32],
            ["maxVideoRuns", "Productions simultanées", 1, 8],
            [
              "artifactRetentionDays",
              "Conservation avant archivage (jours)",
              7,
              3650,
            ],
          ] as const
        ).map(([id, label, min, max]) => (
          <label key={id} className="block text-sm">
            {label}
            <input
              type="number"
              required
              className={field}
              min={min}
              max={max}
              value={draft[id]}
              onChange={(e) =>
                setDraft((v) => ({ ...v, [id]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
        <Button disabled={save.isPending} type="submit">
          Enregistrer les règles
        </Button>
      </form>
      <section className="space-y-3 rounded-lg border border-border p-5">
        <h2 className="text-xl font-medium">Permissions des agents</h2>
        <label className="block text-sm">
          Agent
          <select
            className={field}
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="">Choisir un agent</option>
            {agents.data?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} · {agent.adapterType}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <PolicyForm
            key={selected.id + JSON.stringify(selected.policy)}
            agent={selected}
            base={base}
            refresh={refresh}
          />
        )}
      </section>
      <section className="space-y-4 rounded-lg border border-border p-5">
        <h2 className="text-xl font-medium">Utilisateurs et rôles</h2>
        <p className="text-xs text-muted-foreground">
          Administrateur : configuration complète du workspace. Chef de projet :
          campagnes, budgets et validations. Créatif : rédaction et production,
          sans validation interne. Client : livrables approuvés uniquement. Un
          administrateur d’instance conserve un accès global : son privilège
          doit être retiré séparément pour le limiter.
        </p>
        {members.data?.map((memberRow) => (
          <div
            key={memberRow.userId}
            className="flex flex-wrap items-center gap-3"
          >
            <p className="min-w-0 break-all text-sm">
              {memberRow.name} · {memberRow.email}
              <span className="block text-xs text-muted-foreground">
                {memberRow.userId}
                {memberRow.isInstanceAdmin
                  ? " · administrateur d’instance"
                  : ""}
              </span>
            </p>
            <select
              aria-label={`Rôle de ${memberRow.name}`}
              className={field + " sm:max-w-xs"}
              value={memberRow.role}
              disabled={member.isPending}
              onChange={(e) =>
                member.mutate({ id: memberRow.userId, value: e.target.value })
              }
            >
              {[
                ["admin", "Administrateur"],
                ["project_manager", "Chef de projet"],
                ["creative", "Créatif"],
                ["client", "Client"],
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            {memberRow.isInstanceAdmin && (
              <Button
                variant="outline"
                disabled={removeGlobal.isPending}
                onClick={() => removeGlobal.mutate(memberRow.userId)}
              >
                Retirer le privilège global
              </Button>
            )}
          </div>
        ))}
        <form
          className="space-y-2 border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            member.mutate({ id: userId, value: role });
          }}
        >
          <label className="block text-sm">
            Identifiant du compte déjà inscrit
            <input
              className={field}
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Rôle
            <select
              className={field}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {[
                ["admin", "Administrateur"],
                ["project_manager", "Chef de projet"],
                ["creative", "Créatif"],
                ["client", "Client"],
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={member.isPending}>
            Accorder cet accès au workspace
          </Button>
        </form>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Reprise des tâches interrompues</h2>
        {recoveries.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune tâche interrompue à reprendre parmi les exécutions récentes.
          </p>
        )}
        {recoveries.data?.map((row) => (
          <RecoveryCard key={row.sourceRunId} row={row} refresh={refresh} />
        ))}
      </section>
      <section className="space-y-3 rounded-lg border border-border p-5">
        <h2 className="text-xl font-medium">Exploitation</h2>
        <p className="text-sm">
          Exécutions d’agents admises :{" "}
          {operations.data?.activeAgentPermits ?? "…"} · jobs anciens pouvant
          être archivés : {operations.data?.retentionCandidates ?? "…"}
        </p>
        {operations.data?.warnings.map((warning) => (
          <p className="text-sm text-amber-500" key={warning.agentId}>
            {warning.message}
          </p>
        ))}
        <details>
          <summary className="cursor-pointer text-sm">Échecs récents</summary>
          {operations.data?.recentRunFailures.map((run) => (
            <p className="text-sm" key={run.id}>
              {run.id.slice(0, 8)} · {run.status} · {run.errorCode}
            </p>
          ))}
          {operations.data?.recentProductionFailures.map((job) => (
            <p className="text-sm" key={job.id}>
              {job.id.slice(0, 8)} · {job.error}
            </p>
          ))}
        </details>
        <RetentionPanel base={base} refresh={refresh} />
      </section>
    </main>
  );
}
function PolicyForm({
  agent,
  base,
  refresh,
}: {
  agent: Agent;
  base: string;
  refresh: () => Promise<unknown>;
}) {
  const [policy, setPolicy] = useState<Policy>(
    agent.policy || {
      requireTaskContext: true,
      allowExternalAccess: false,
      mode: "blocked",
      allowedAdapters: [agent.adapterType],
      allowedCommands: agent.command ? [agent.command] : [],
      workspaceRoot: agent.recommendedWorkspace,
      workspaceWritable: false,
      allowedEndpoints: [],
      allowedEnvKeys: [],
      apiCapabilities: [
        "organization.read",
        "tasks.read",
        "tasks.write",
        "campaigns.read",
        "deliverables.submit",
        "costs.report",
      ],
      timeoutSec: 300,
      cpu: 1,
      memoryMb: 512,
    }
  );
  const save = useMutation({
    mutationFn: () => api.put(`${base}/agents/${agent.id}/policy`, policy),
    onSuccess: refresh,
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="block text-sm">
        Mode
        <select
          className={field}
          value={policy.mode}
          onChange={(e) => setPolicy((p) => ({ ...p, mode: e.target.value }))}
        >
          <option value="blocked">Bloqué</option>
          <option
            value="isolated_process"
            disabled={agent.adapterType !== "process"}
          >
            Commande isolée hors réseau
          </option>
          <option value="trusted">Adaptateur local / HTTP de confiance</option>
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        L’isolation utilise un dossier dédié, sans réseau ni secrets hérités.
        Elle prend en charge l’adaptateur process ; les outils disponibles sont
        ceux de l’image de rendu. Le mode de confiance autorise un programme
        local ou un endpoint approuvé et ne limite pas ses opérations internes
        sur l’hôte.
      </p>
      {policy.mode === "trusted" && (
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={policy.allowExternalAccess}
            onChange={(e) =>
              setPolicy((p) => ({
                ...p,
                allowExternalAccess: e.target.checked,
              }))
            }
          />
          J’autorise explicitement cet adaptateur à accéder à l’hôte et au
          réseau, avec son modèle et son budget mensuel configurés.
        </label>
      )}
      {[
        ["allowedAdapters", "Adaptateurs autorisés"],
        [
          "allowedCommands",
          "Commandes de lancement autorisées (une par ligne)",
        ],
        ["allowedEndpoints", "Endpoints HTTP exacts autorisés"],
        ["allowedEnvKeys", "Variables explicitement transmises"],
      ].map(([key, label]) => (
        <label className="block text-sm" key={key}>
          {label}
          <textarea
            className={field}
            value={(policy[key as keyof Policy] as string[]).join("\n")}
            onChange={(e) =>
              setPolicy((p) => ({
                ...p,
                [key]: e.target.value
                  .split("\n")
                  .map((v) => v.trim())
                  .filter(Boolean),
              }))
            }
          />
        </label>
      ))}
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={policy.requireTaskContext}
          onChange={(e) =>
            setPolicy((p) => ({ ...p, requireTaskContext: e.target.checked }))
          }
        />
        Exiger une tâche identifiée avant toute exécution
      </label>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={policy.workspaceWritable}
          onChange={(e) =>
            setPolicy((p) => ({ ...p, workspaceWritable: e.target.checked }))
          }
        />
        Autoriser l’écriture dans le dossier isolé dédié
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["timeoutSec", "Durée maximale (secondes)", 1, 1800],
          ["cpu", "CPU", 0.25, 4],
          ["memoryMb", "RAM (Mo)", 128, 4096],
        ].map(([key, label, min, max]) => (
          <label className="text-sm" key={String(key)}>
            {label}
            <input
              className={field}
              type="number"
              min={Number(min)}
              max={Number(max)}
              step={key === "cpu" ? 0.25 : 1}
              value={Number(policy[key as keyof Policy])}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, [key]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
      </div>
      <fieldset>
        <legend className="text-sm">Capacités API</legend>
        {[
          "organization.read",
          "tasks.read",
          "tasks.write",
          "campaigns.read",
          "deliverables.submit",
          "costs.report",
          "assets.read",
          "assets.write",
          "approvals.request",
          "activity.read",
        ].map((capability) => (
          <label className="mr-4 inline-flex gap-2 text-xs" key={capability}>
            <input
              type="checkbox"
              checked={policy.apiCapabilities.includes(capability)}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  apiCapabilities: e.target.checked
                    ? [...p.apiCapabilities, capability]
                    : p.apiCapabilities.filter((v) => v !== capability),
                }))
              }
            />
            {capability}
          </label>
        ))}
      </fieldset>
      {save.error && (
        <p role="alert" className="text-destructive">
          {save.error.message}
        </p>
      )}
      <Button disabled={save.isPending} type="submit">
        Approuver cette politique
      </Button>
    </form>
  );
}
function RecoveryCard({
  row,
  refresh,
}: {
  row: Recovery;
  refresh: () => Promise<unknown>;
}) {
  const [consent, setConsent] = useState(false);
  const resume = useMutation({
    mutationFn: () =>
      api.post(`/issues/${row.taskId}/recovery`, {
        sourceRunId: row.sourceRunId,
        confirmExternalEffectsReviewed: true,
        confirmConfiguredModelCosts: true,
      }),
    onSuccess: refresh,
  });
  return (
    <article className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="font-medium">{row.title}</h3>
      <p className="text-sm text-muted-foreground">
        {row.status} · {row.error}
      </p>
      {row.checkpoints.map((checkpoint) => (
        <div className="space-y-1 text-sm" key={checkpoint.id}>
          <p>{checkpoint.summary}</p>
          {checkpoint.output.completed?.map((item, i) => (
            <p key={i}>Réalisé : {item}</p>
          ))}
          {checkpoint.output.nextActions?.map((item, i) => (
            <p key={i}>Suite : {item}</p>
          ))}
        </div>
      ))}
      {row.checkpoints.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Aucun point d’avancement structuré n’a été conservé. Inspectez les
          anciens journaux avant de répéter une action.
        </p>
      )}
      {row.recovery ? (
        <p className="text-sm">
          Reprise déjà autorisée ; exécution{" "}
          {row.recovery.newRunId?.slice(0, 8) ||
            "différée par la politique de réveil"}
          .
        </p>
      ) : (
        <>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            J’ai vérifié les effets externes possibles et j’autorise le modèle
            configuré et son coût.
          </label>
          <Button
            disabled={!consent || resume.isPending}
            onClick={() => resume.mutate()}
          >
            Autoriser la reprise de cette tâche
          </Button>
        </>
      )}
      {resume.error && (
        <p role="alert" className="text-destructive">
          {resume.error.message}
        </p>
      )}
    </article>
  );
}
function RetentionPanel({
  base,
  refresh,
}: {
  base: string;
  refresh: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const query = useQuery({
    queryKey: [base, "retention"],
    queryFn: () =>
      api.get<{ id: string; status: string; bytes: number }[]>(
        `${base}/operations/retention`
      ),
    enabled: open,
  });
  const archive = useMutation({
    mutationFn: () =>
      api.post(`${base}/operations/retention/archive`, {
        jobIds: query.data?.filter((job) => job.bytes > 0).map((job) => job.id),
        confirmArchive: true,
      }),
    onSuccess: async () => {
      await query.refetch();
      await refresh();
    },
  });
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm">
        Archivage réversible des anciens intermédiaires
      </summary>
      <p className="my-2 text-xs text-muted-foreground">
        Déplace les fichiers de jobs échoués, annulés ou d’aperçus arrivés à
        échéance dans une archive privée. Les livrables finaux sont exclus ;
        aucune suppression automatique définitive n’est effectuée.
      </p>
      {query.data?.map((job) => (
        <p className="text-xs" key={job.id}>
          {job.id.slice(0, 8)} · {job.status} ·{" "}
          {(job.bytes / 1048576).toFixed(1)} Mo
        </p>
      ))}
      <label className="my-2 flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
        />
        Confirmer l’archivage des fichiers listés
      </label>
      <Button
        disabled={
          !confirm ||
          !query.data?.some((job) => job.bytes > 0) ||
          archive.isPending
        }
        onClick={() => archive.mutate()}
      >
        Archiver
      </Button>
      {(query.error || archive.error) && (
        <p role="alert" className="text-destructive">
          {(query.error || archive.error)?.message}
        </p>
      )}
    </details>
  );
}
