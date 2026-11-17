import React, { useState, useEffect } from "react";
import type {
  AnalyticsOverview,
  StrategicInsight,
} from "@soravyn/shared";
import {
  TrendingUp,
  Zap,
  Globe,
  Lightbulb,
  Check,
  CheckCircle2,
  Loader2,
  X,
  Target,
  BarChart3,
  MousePointerClick,
  Percent,
  Coins,
} from "lucide-react";
import { Button } from "./ui/button";

interface MarketingAnalyticsPanelProps {
  companyId: string;
}

export const MarketingAnalyticsPanel: React.FC<MarketingAnalyticsPanelProps> = ({
  companyId,
}) => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [insights, setInsights] = useState<StrategicInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<number>(30);
  const [triggeringLoop, setTriggeringLoop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewRes, insightsRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/studio/analytics/overview?timeframeDays=${timeframe}`),
        fetch(`/api/companies/${companyId}/studio/analytics/insights`),
      ]);

      if (!overviewRes.ok || !insightsRes.ok) {
        throw new Error("Impossible de charger les métriques analytiques");
      }

      const overviewData = await overviewRes.json();
      const insightsData = await insightsRes.json();

      setOverview(overviewData.overview);
      setInsights(insightsData.insights || []);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, timeframe]);

  const handleRunFeedbackLoop = async () => {
    try {
      setTriggeringLoop(true);
      setFeedbackSuccessMessage(null);
      const res = await fetch(`/api/companies/${companyId}/studio/analytics/feedback-loop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeframeDays: timeframe,
          autoApplyToBrandMemory: true,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur lors de l'exécution de la boucle d'apprentissage");
      }

      const data = await res.json();
      await fetchData();
      setFeedbackSuccessMessage(
        `Boucle d'apprentissage IA terminée : ${data.result.insightsGenerated} recommandations stratégiques générées et injectées dans la Mémoire de Marque.`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTriggeringLoop(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Analytics & Feedback Loop IA
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                Performance
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Métriques de diffusion omnicanale et auto-apprentissage continu de votre Mémoire de Marque.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(Number(e.target.value))}
              className="bg-background border border-border text-foreground rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
            >
              <option value={7}>7 derniers jours</option>
              <option value={30}>30 derniers jours</option>
              <option value={90}>90 derniers jours</option>
            </select>

            <Button
              onClick={handleRunFeedbackLoop}
              disabled={triggeringLoop}
              size="sm"
              className="flex items-center gap-2 text-xs"
            >
              {triggeringLoop ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {triggeringLoop ? "Analyse IA..." : "Activer Feedback Loop IA"}
            </Button>
          </div>
        </div>
      </div>

      {feedbackSuccessMessage && (
        <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {feedbackSuccessMessage}
          </span>
          <button className="text-xs hover:opacity-75" onClick={() => setFeedbackSuccessMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Chargement des données analytiques...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">{error}</div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Portée / Impressions</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold text-foreground mt-1">
                {(overview?.totalImpressions || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Vues directes : {(overview?.totalViews || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Clics & Trafic</span>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold text-foreground mt-1">
                {(overview?.totalClicks || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5">
                Conversions : {(overview?.totalConversions || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Taux d'Engagement Moyen</span>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold text-primary mt-1">
                {overview?.averageEngagementRate || 0}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Top canal : {overview?.topPerformingChannel || "N/A"}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Rentabilité / ROI</span>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {overview?.totalSpendCents && overview.totalSpendCents > 0
                  ? `${Math.round(((overview.totalRevenueCents - overview.totalSpendCents) / overview.totalSpendCents) * 100)}%`
                  : "Organique"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Revenus : {((overview?.totalRevenueCents || 0) / 100).toFixed(0)} €
              </div>
            </div>
          </div>

          {/* Omnichannel Breakdown */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Performance par Canal de Diffusion
            </h3>

            {overview?.channelBreakdown && overview.channelBreakdown.length > 0 ? (
              <div className="space-y-3">
                {overview.channelBreakdown.map((item) => (
                  <div key={item.channel} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium capitalize">{item.channel}</span>
                      <span className="text-muted-foreground">
                        {item.impressions.toLocaleString()} imp. • {item.engagementRate}% engagement
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.engagementRate * 15, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center">
                Aucune donnée de canal pour cette période. Diffusez vos premiers contenus pour voir les analyses.
              </div>
            )}
          </div>

          {/* Strategic Insights & Brand Memory Feedback */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Recommandations IA & Apprentissage Brand Memory
              </h3>
              <span className="text-xs text-muted-foreground">{insights.length} insight(s) généré(s)</span>
            </div>

            {insights.length === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center">
                Aucun enseignement généré pour le moment. Cliquez sur "Activer Feedback Loop IA" pour lancer l'analyse autonome.
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-4 bg-background border border-border rounded-lg space-y-2 hover:border-border/80 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                          [{insight.category}]
                        </span>
                        <h4 className="text-sm font-bold text-foreground">{insight.title}</h4>
                      </div>

                      {insight.appliedToBrandMemory && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Intégré dans Brand Memory
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Constat : </strong>
                      {insight.observation}
                    </p>

                    <p className="text-xs text-primary">
                      <strong className="text-foreground">Action recommandée : </strong>
                      {insight.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
