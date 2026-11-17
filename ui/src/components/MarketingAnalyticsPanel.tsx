import React, { useState, useEffect } from "react";
import type {
  AnalyticsOverview,
  StrategicInsight,
  FeedbackLoopResult,
} from "@soravyn/shared";

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
      alert(`Boucle d'apprentissage IA terminée !\n${data.result.insightsGenerated} recommandations stratégiques générées et injectées dans la Mémoire de Marque.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTriggeringLoop(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Analytics & Feedback Loop IA
              </h2>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              Métriques de diffusion omnicanale et auto-apprentissage continu de votre Mémoire de Marque.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
            >
              <option value={7}>7 derniers jours</option>
              <option value={30}>30 derniers jours</option>
              <option value={90}>90 derniers jours</option>
            </select>

            <button
              onClick={handleRunFeedbackLoop}
              disabled={triggeringLoop}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              <span>{triggeringLoop ? "⏳" : "⚡"}</span>
              {triggeringLoop ? "Analyse IA..." : "Activer Feedback Loop IA"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Chargement des données analytiques...</div>
      ) : error ? (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">{error}</div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs text-zinc-400">Portée / Impressions</span>
              <div className="text-xl font-bold text-white mt-1">
                {(overview?.totalImpressions || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Vues directes : {(overview?.totalViews || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs text-zinc-400">Clics & Trafic</span>
              <div className="text-xl font-bold text-white mt-1">
                {(overview?.totalClicks || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5">
                Conversions : {(overview?.totalConversions || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs text-zinc-400">Taux d'Engagement Moyen</span>
              <div className="text-xl font-bold text-indigo-400 mt-1">
                {overview?.averageEngagementRate || 0}%
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Top canal : {overview?.topPerformingChannel || "N/A"}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs text-zinc-400">Rentabilité / ROI</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {overview?.totalSpendCents && overview.totalSpendCents > 0
                  ? `${Math.round(((overview.totalRevenueCents - overview.totalSpendCents) / overview.totalSpendCents) * 100)}%`
                  : "Organique"}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Revenus : {((overview?.totalRevenueCents || 0) / 100).toFixed(0)} €
              </div>
            </div>
          </div>

          {/* Omnichannel Breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>🌐</span> Performance par Canal de Diffusion
            </h3>

            {overview?.channelBreakdown && overview.channelBreakdown.length > 0 ? (
              <div className="space-y-3">
                {overview.channelBreakdown.map((item) => (
                  <div key={item.channel} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-medium capitalize">{item.channel}</span>
                      <span className="text-zinc-400">
                        {item.impressions.toLocaleString()} imp. • {item.engagementRate}% engagement
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.engagementRate * 15, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-4 text-center">
                Aucune donnée de canal pour cette période. Diffusez vos premiers contenus pour voir les analyses.
              </div>
            )}
          </div>

          {/* Strategic Insights & Brand Memory Feedback */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>🧠</span> Recommandations IA & Apprentissage Brand Memory
              </h3>
              <span className="text-xs text-zinc-500">{insights.length} insight(s) généré(s)</span>
            </div>

            {insights.length === 0 ? (
              <div className="text-xs text-zinc-500 py-6 text-center">
                Aucun enseignement généré pour le moment. Cliquez sur "Activer Feedback Loop IA" pour lancer l'analyse autonome.
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
                          [{insight.category}]
                        </span>
                        <h4 className="text-sm font-bold text-white">{insight.title}</h4>
                      </div>

                      {insight.appliedToBrandMemory && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          ✓ Intégré dans Brand Memory
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300">
                      <strong className="text-zinc-400">Constat : </strong>
                      {insight.observation}
                    </p>

                    <p className="text-xs text-indigo-300">
                      <strong className="text-indigo-400">Action recommandée : </strong>
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
