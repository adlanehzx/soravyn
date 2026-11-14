import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
type Budget = {
  limitCents: number | null;
  reportedCents: number;
  reservedCents: number;
  remainingCents: number | null;
  reservations: { id: string; amountCents: number; taskId: string }[];
};
export function CampaignBudgetPanel({
  companyId,
  campaignId,
}: {
  companyId: string;
  campaignId: string;
}) {
  const [taskId, setTaskId] = useState("");
  const [reservation, setReservation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const cache = useQueryClient();
  const base = `/companies/${companyId}/studio/campaigns/${campaignId}/budget`;
  const key = ["campaign-budget", companyId, campaignId];
  const budget = useQuery({
    queryKey: key,
    queryFn: () => api.get<Budget>(base),
    enabled: open,
  });
  const save = useMutation({
    mutationFn: () => api.put(base, { limitCents: Number(amount) }),
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  const release = useMutation({
    mutationFn: (id: string) => api.post(`${base}/${id}/release`, {}),
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  const renew = useMutation({
    mutationFn: () =>
      api.post(`${base}/reservations`, {
        taskId,
        maximumCostCents: Number(reservation),
        confirmConfiguredModelCosts: confirmed,
      }),
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  const error = budget.error || save.error || release.error || renew.error;
  return (
    <details
      className="rounded-lg border border-border p-4"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer font-medium">
        Budget d’autorisation de la campagne
      </summary>
      <div className="mt-3 space-y-3">
        {error && (
          <p role="alert" className="text-destructive">
            {error.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Enveloppe en centimes de la devise des coûts déclarés. Seule la part
          non consommée de chaque réservation est ajoutée aux coûts déclarés.
          Les exécutions d’agents rattachées à la campagne vérifient aussi cette
          réservation, quel que soit leur déclencheur. Ce contrôle ne plafonne
          pas directement une facture fournisseur.
        </p>
        {budget.data && (
          <p className="text-sm">
            Plafond : {budget.data.limitCents ?? "non défini"} · déclaré :{" "}
            {budget.data.reportedCents} · réservé : {budget.data.reservedCents}{" "}
            · disponible : {budget.data.remainingCents ?? "non limité"}
          </p>
        )}
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <label className="text-sm">
            Plafond en centimes
            <input
              className="block rounded border border-border bg-background p-2"
              required
              type="number"
              min={0}
              max={2147483647}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={save.isPending}>
            Enregistrer
          </Button>
        </form>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            renew.mutate();
          }}
        >
          <label className="block text-sm">
            Identifiant de tâche
            <input
              className="block w-full rounded border border-border bg-background p-2"
              required
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Nouvelle autorisation disponible en centimes
            <input
              className="block rounded border border-border bg-background p-2"
              required
              type="number"
              min={1}
              max={2147483647}
              value={reservation}
              onChange={(e) => setReservation(e.target.value)}
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input
              required
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            J’autorise les coûts du modèle configuré pour cette tâche.
          </label>
          <Button disabled={renew.isPending || !confirmed} type="submit">
            Autoriser / renouveler
          </Button>
        </form>
        {budget.data?.reservations.map((r) => (
          <p key={r.id} className="text-sm">
            Réservation : {r.amountCents} cents{" "}
            <Button
              variant="ghost"
              disabled={release.isPending}
              onClick={() => release.mutate(r.id)}
            >
              Libérer après contrôle des coûts
            </Button>
          </p>
        ))}
      </div>
    </details>
  );
}
