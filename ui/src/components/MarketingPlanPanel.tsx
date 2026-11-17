import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
import {
  Sparkles,
  Plus,
  X,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Layers,
  Target,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type {
  MarketingPlanSummary,
  MarketingPlanWithDetails,
  MarketingPlanTheme,
  MarketingPlanProposal,
} from "@soravyn/shared";

const fieldClass = "w-full rounded-md border border-border bg-background p-2 text-sm text-foreground";

export function MarketingPlanPanel({ companyId }: { companyId: string }) {
  const cache = useQueryClient();
  const base = `/companies/${companyId}/studio/plans`;
  const plansKey = ["marketing-plans", companyId];

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [validationNotes, setValidationNotes] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Generator form state
  const [periodMonth, setPeriodMonth] = useState("2026-11");
  const [commercialGoal, setCommercialGoal] = useState("+30% démos qualifiées, 50k€ ARR");
  const [targetAudience, setTargetAudience] = useState("Décideurs B2B & Responsables Marketing");
  const [totalBudget, setTotalBudget] = useState(5000);
  const [currency, setCurrency] = useState("EUR");
  const [channels, setChannels] = useState("LinkedIn, YouTube, TikTok, Instagram");

  // Fetch all plans
  const plansQuery = useQuery({
    queryKey: plansKey,
    queryFn: () => api.get<MarketingPlanSummary[]>(base),
  });

  // Current active plan
  const activePlanId = selectedPlanId || plansQuery.data?.[0]?.id || null;

  const planDetailQuery = useQuery({
    queryKey: ["marketing-plan-detail", companyId, activePlanId],
    queryFn: () => api.get<MarketingPlanWithDetails>(`${base}/${activePlanId}`),
    enabled: !!activePlanId,
  });

  // Plan generation mutation
  const generateMutation = useMutation({
    mutationFn: () =>
      api.post<MarketingPlanWithDetails>(`${base}/generate`, {
        periodMonth,
        commercialGoal,
        targetAudience,
        totalBudget: Number(totalBudget),
        currency,
        primaryChannels: channels.split(",").map((s) => s.trim()).filter(Boolean),
        priorities: [
          "Notoriété & Positionnement de marque",
          "Acquisition de prospects qualifiés",
          "Démonstration de valeur & Conversion",
        ],
      }),
    onSuccess: (newPlan) => {
      setSelectedPlanId(newPlan.id);
      setShowGenerator(false);
      setActionMessage("Plan marketing généré avec succès par l'IA.");
      return cache.invalidateQueries({ queryKey: plansKey });
    },
  });

  // Submit for validation mutation
  const submitValidationMutation = useMutation({
    mutationFn: (planId: string) =>
      api.post<MarketingPlanWithDetails>(`${base}/${planId}/submit-validation`, {
        notes: validationNotes || "Soumission du plan marketing mensuel pour gouvernance",
      }),
    onSuccess: () => {
      setValidationNotes("");
      setActionMessage("Plan soumis au centre de validation avec succès.");
      cache.invalidateQueries({ queryKey: plansKey });
      return cache.invalidateQueries({ queryKey: ["marketing-plan-detail", companyId, activePlanId] });
    },
  });

  // Resolve approval mutation (Approve / Reject)
  const resolveApprovalMutation = useMutation({
    mutationFn: ({ planId, decision, note }: { planId: string; decision: "approved" | "rejected"; note?: string }) =>
      api.post<MarketingPlanWithDetails>(`${base}/${planId}/resolve-approval`, {
        decision,
        decisionNote: note || (decision === "approved" ? "Plan validé par l'opérateur" : "Plan à réviser"),
      }),
    onSuccess: (_, vars) => {
      setActionMessage(vars.decision === "approved" ? "Plan validé et activé." : "Plan rejeté pour révision.");
      cache.invalidateQueries({ queryKey: plansKey });
      return cache.invalidateQueries({ queryKey: ["marketing-plan-detail", companyId, activePlanId] });
    },
  });

  // Convert proposal to live Campaign mutation
  const convertProposalMutation = useMutation({
    mutationFn: ({ planId, proposalId }: { planId: string; proposalId: string }) =>
      api.post<{ campaign: { id: string; name: string }; proposal: MarketingPlanProposal }>(
        `${base}/${planId}/proposals/${proposalId}/convert`,
        {}
      ),
    onSuccess: (data) => {
      setActionMessage(`Proposition convertie avec succès en campagne : "${data.campaign.name}"`);
      cache.invalidateQueries({ queryKey: ["campaigns", companyId] });
      cache.invalidateQueries({ queryKey: plansKey });
      return cache.invalidateQueries({ queryKey: ["marketing-plan-detail", companyId, activePlanId] });
    },
  });

  const plan = planDetailQuery.data;

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Plan Marketing & Stratégie Mensuelle</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
              Stratégie
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Structurez vos objectifs commerciaux en plans d'actions par thèmes, canaux et budgets soumis à validation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {plansQuery.data && plansQuery.data.length > 0 && (
            <select
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              value={activePlanId || ""}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plansQuery.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.periodMonth} — {p.title} ({p.status})
                </option>
              ))}
            </select>
          )}

          <Button
            variant={showGenerator ? "secondary" : "default"}
            size="sm"
            onClick={() => setShowGenerator(!showGenerator)}
            className="flex items-center gap-1.5"
          >
            {showGenerator ? (
              <>
                <X className="h-3.5 w-3.5" />
                Fermer le générateur
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Générer un plan
              </>
            )}
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {actionMessage}
          </span>
          <button className="text-xs hover:opacity-75" onClick={() => setActionMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Generator Drawer */}
      {showGenerator && (
        <div className="space-y-4 rounded-lg border border-border/80 bg-background/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Générateur de Plan Marketing Opérationnel</span>
          </div>
          <p className="text-xs text-muted-foreground">
            L'IA connecte les objectifs commerciaux avec la <strong>Mémoire de Marque</strong> (offres, personas, arguments et objections) pour construire un plan mensuel structuré.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Mois cible</label>
              <input
                className={fieldClass}
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                placeholder="2026-11"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Budget Total</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className={fieldClass}
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                />
                <input
                  className="w-16 rounded-md border border-border bg-background p-2 text-sm text-foreground"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Canaux de diffusion</label>
              <input
                className={fieldClass}
                value={channels}
                onChange={(e) => setChannels(e.target.value)}
                placeholder="LinkedIn, YouTube, TikTok"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Objectif Commercial Chiffré</label>
            <input
              className={fieldClass}
              value={commercialGoal}
              onChange={(e) => setCommercialGoal(e.target.value)}
              placeholder="ex: +30% de démos qualifiées, 50k€ de nouveaux contrats"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Audience Cible</label>
            <input
              className={fieldClass}
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="ex: Décideurs B2B, Responsables Acquisition"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setShowGenerator(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={generateMutation.isPending || !commercialGoal}
              onClick={() => generateMutation.mutate()}
              className="flex items-center gap-1.5"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {generateMutation.isPending ? "Génération du plan en cours…" : "Générer le Plan avec l'IA"}
            </Button>
          </div>
        </div>
      )}

      {/* Plan Details Display */}
      {planDetailQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Chargement du plan…</span>
        </div>
      ) : !plan ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Aucun plan marketing configuré pour ce client. Cliquez sur <strong>"Générer un plan"</strong> pour créer le premier plan mensuel.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Summary & Budget */}
          <div className="grid gap-4 rounded-lg border border-border/70 bg-card/60 p-4 md:grid-cols-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Statut du Plan</span>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    plan.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : plan.status === "pending_validation"
                      ? "bg-amber-500/20 text-amber-300 animate-pulse"
                      : plan.status === "rejected"
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {plan.status === "approved" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : plan.status === "pending_validation" ? (
                    <Clock className="h-3 w-3" />
                  ) : plan.status === "rejected" ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {plan.status === "approved"
                    ? "Validé & Actif"
                    : plan.status === "pending_validation"
                    ? "En attente de validation"
                    : plan.status === "rejected"
                    ? "Rejeté (à modifier)"
                    : "Brouillon modifiable"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Budget Total</span>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {plan.totalBudget.toLocaleString()} {plan.currency}
              </p>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Budget Alloué</span>
              <p className="mt-1 text-lg font-semibold text-primary">
                {plan.allocatedBudgetSum.toLocaleString()} {plan.currency}
              </p>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Budget Restant</span>
              <p className="mt-1 text-lg font-semibold text-muted-foreground">
                {plan.remainingBudget.toLocaleString()} {plan.currency}
              </p>
            </div>
          </div>

          {/* Goal & Description */}
          <div className="rounded-lg border border-border/50 bg-background/40 p-4">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              <span>Objectif Commercial Clé</span>
            </div>
            <p className="mt-1 text-base font-medium text-foreground">{plan.commercialGoal}</p>
            {plan.description && <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              {plan.primaryChannels.map((c) => (
                <span key={c} className="rounded bg-secondary/80 px-2 py-0.5 text-xs text-secondary-foreground border border-border">
                  Canal : {c}
                </span>
              ))}
              {plan.targetAudience && (
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground border border-border">
                  Cible : {plan.targetAudience}
                </span>
              )}
            </div>
          </div>

          {/* Validation & Approval Gate */}
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h4>Validation de Gouvernance</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conformément à la politique SORAVYN, aucun engagement de budget ni production ne s'effectue sans validation explicite.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {plan.status === "draft" || plan.status === "rejected" ? (
                <div className="flex items-center gap-2">
                  <input
                    className="w-48 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                    placeholder="Note pour validation…"
                    value={validationNotes}
                    onChange={(e) => setValidationNotes(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={submitValidationMutation.isPending}
                    onClick={() => submitValidationMutation.mutate(plan.id)}
                    className="flex items-center gap-1.5"
                  >
                    {submitValidationMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {submitValidationMutation.isPending ? "Soumission…" : "Soumettre à validation"}
                  </Button>
                </div>
              ) : plan.status === "pending_validation" ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-400 hover:text-rose-300 border-rose-800"
                    disabled={resolveApprovalMutation.isPending}
                    onClick={() =>
                      resolveApprovalMutation.mutate({ planId: plan.id, decision: "rejected", note: "Révision demandée" })
                    }
                  >
                    Rejeter
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                    disabled={resolveApprovalMutation.isPending}
                    onClick={() =>
                      resolveApprovalMutation.mutate({ planId: plan.id, decision: "approved", note: "Approuvé par opérateur" })
                    }
                  >
                    {resolveApprovalMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {resolveApprovalMutation.isPending ? "Validation…" : "Approuver le plan"}
                  </Button>
                </div>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-3 py-1 rounded-md">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Plan validé par la gouvernance
                </span>
              )}
            </div>
          </div>

          {/* Weekly Themes List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <h3>Thèmes Hebdomadaires ({plan.themes.length})</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {plan.themes.map((theme: MarketingPlanTheme) => (
                <div
                  key={theme.id}
                  className="flex flex-col justify-between rounded-lg border border-border bg-background/60 p-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                        S{theme.weekNumber}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {theme.allocatedBudget.toLocaleString()} {plan.currency}
                      </span>
                    </div>
                    <h5 className="mt-2 text-xs font-semibold leading-tight text-foreground">{theme.title}</h5>
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{theme.description}</p>
                  </div>
                  {theme.targetKpi && (
                    <div className="mt-3 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                      <strong>KPI :</strong> {theme.targetKpi}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Campaign Proposals List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-4 w-4" />
              <h3>Propositions de Campagnes Concrètes ({plan.proposals.length})</h3>
            </div>
            <div className="space-y-2">
              {plan.proposals.map((prop: MarketingPlanProposal) => (
                <div
                  key={prop.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground border border-border">
                        {prop.channel}
                      </span>
                      <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {prop.format}
                      </span>
                      {prop.status === "converted" && (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-800">
                          Convertie en Campagne
                        </span>
                      )}
                    </div>
                    <h5 className="text-sm font-semibold text-foreground">{prop.title}</h5>
                    {prop.hook && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Accroche :</strong> "{prop.hook}"
                      </p>
                    )}
                    {prop.callToAction && (
                      <p className="text-xs text-muted-foreground">
                        <strong>CTA :</strong> {prop.callToAction}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      Coût est. {prop.estimatedCost} {plan.currency}
                    </span>

                    {prop.status === "converted" ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        Active dans le Studio
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={convertProposalMutation.isPending}
                        onClick={() =>
                          convertProposalMutation.mutate({ planId: plan.id, proposalId: prop.id })
                        }
                        className="flex items-center gap-1.5"
                      >
                        {convertProposalMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5" />
                        )}
                        {convertProposalMutation.isPending
                          ? "Conversion…"
                          : "Transformer en Campagne"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
