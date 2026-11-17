import React, { useState, useEffect } from "react";
import type {
  EditorialCalendarItem,
  EditorialCalendarStats,
  EditorialContentType,
  EditorialStatus,
  MarketingPlanWithDetails,
} from "@soravyn/shared";

interface Props {
  companyId: string;
}

const TYPE_LABELS: Record<EditorialContentType, { label: string; icon: string; color: string }> = {
  video: { label: "Vidéo", icon: "🎬", color: "bg-purple-950/60 text-purple-300 border-purple-800" },
  social_post: { label: "Post Réseau", icon: "📱", color: "bg-blue-950/60 text-blue-300 border-blue-800" },
  email: { label: "Email / News", icon: "✉️", color: "bg-amber-950/60 text-amber-300 border-amber-800" },
  article: { label: "Article / Blog", icon: "📄", color: "bg-emerald-950/60 text-emerald-300 border-emerald-800" },
};

const STATUS_CONFIG: Record<EditorialStatus, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  scheduled: { label: "Programmé", color: "bg-blue-900/60 text-blue-200 border-blue-700" },
  in_production: { label: "En production", color: "bg-amber-900/60 text-amber-200 border-amber-700" },
  ready_for_review: { label: "À réviser", color: "bg-indigo-900/60 text-indigo-200 border-indigo-700" },
  approved: { label: "Validé", color: "bg-emerald-900/60 text-emerald-200 border-emerald-700" },
  published: { label: "Publié", color: "bg-teal-900/60 text-teal-200 border-teal-700" },
  cancelled: { label: "Annulé", color: "bg-rose-900/60 text-rose-300 border-rose-800" },
};

export const EditorialCalendarPanel: React.FC<Props> = ({ companyId }) => {
  const [items, setItems] = useState<EditorialCalendarItem[]>([]);
  const [stats, setStats] = useState<EditorialCalendarStats | null>(null);
  const [plans, setPlans] = useState<MarketingPlanWithDetails[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("2026-11");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New item form
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemType, setNewItemType] = useState<EditorialContentType>("social_post");
  const [newItemChannel, setNewItemChannel] = useState("LinkedIn");
  const [newItemDate, setNewItemDate] = useState("2026-11-15T10:00");
  const [newItemBrief, setNewItemBrief] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load calendar items
      let url = `/api/companies/${companyId}/studio/calendar?periodMonth=${selectedMonth}`;
      if (typeFilter !== "all") url += `&contentType=${typeFilter}`;
      if (channelFilter !== "all") url += `&channel=${channelFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur de chargement du calendrier");
      const data = await res.json();
      setItems(data.items || []);

      // Load stats
      const statsRes = await fetch(`/api/companies/${companyId}/studio/calendar/stats?periodMonth=${selectedMonth}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      // Load marketing plans for generation drawer
      const plansRes = await fetch(`/api/companies/${companyId}/studio/plans?periodMonth=${selectedMonth}`);
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
        if (plansData.plans?.length > 0 && !selectedPlanId) {
          setSelectedPlanId(plansData.plans[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Impossible de charger le calendrier éditorial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, selectedMonth, typeFilter, channelFilter]);

  const handleStatusChange = async (itemId: string, newStatus: EditorialStatus) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/studio/calendar/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour du statut");
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet élément du calendrier ?")) return;
    try {
      const res = await fetch(`/api/companies/${companyId}/studio/calendar/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur de suppression");
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateFromPlan = async () => {
    if (!selectedPlanId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/studio/calendar/generate-from-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Échec de génération du calendrier");
      }
      setShowGenerateModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/studio/calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newItemTitle,
          contentType: newItemType,
          channel: newItemChannel,
          scheduledAt: new Date(newItemDate).toISOString(),
          contentBrief: newItemBrief || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Échec de création");
      }
      setShowCreateModal(false);
      setNewItemTitle("");
      setNewItemBrief("");
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <h2 className="text-xl font-bold text-white tracking-tight">Calendrier Éditorial Omnicanal</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-950 text-purple-300 border border-purple-800">
                Lot 4 — Validé
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Synchronisation automatique des publications (vidéos, posts réseaux sociaux, emails et articles) issue des plans marketing validés.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
            >
              <span>⚡</span> Générer depuis le Plan
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <span>+</span> Nouvel Élément
            </button>
          </div>
        </div>

        {/* Global Statistics */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-6 pt-6 border-t border-zinc-800/80">
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs text-zinc-500">Total Planifié</div>
              <div className="text-lg font-bold text-white mt-0.5">{stats.totalItems}</div>
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs text-purple-400">Vidéos</div>
              <div className="text-lg font-bold text-purple-300 mt-0.5">{stats.byType.video || 0}</div>
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs text-blue-400">Posts Sociaux</div>
              <div className="text-lg font-bold text-blue-300 mt-0.5">{stats.byType.social_post || 0}</div>
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs text-amber-400">Emails</div>
              <div className="text-lg font-bold text-amber-300 mt-0.5">{stats.byType.email || 0}</div>
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs text-emerald-400">Articles</div>
              <div className="text-lg font-bold text-emerald-300 mt-0.5">{stats.byType.article || 0}</div>
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs text-teal-400">Validés / Prêts</div>
              <div className="text-lg font-bold text-teal-300 mt-0.5">
                {(stats.byStatus.approved || 0) + (stats.byStatus.published || 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Mois :</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Format :</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="all">Tous les formats</option>
              <option value="video">Vidéos</option>
              <option value="social_post">Posts réseaux</option>
              <option value="email">Emails / Newsletters</option>
              <option value="article">Articles / Blog</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Canal :</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="all">Tous les canaux</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="YouTube">YouTube</option>
              <option value="TikTok">TikTok</option>
              <option value="X">X (Twitter)</option>
              <option value="Newsletter">Newsletter</option>
              <option value="Blog">Blog</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="text-xs text-zinc-400 hover:text-white transition px-2 py-1 bg-zinc-800 rounded border border-zinc-700"
        >
          Rafraîchir
        </button>
      </div>

      {/* Main Content Agenda */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">Chargement du calendrier éditorial...</div>
      ) : error ? (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl">
          <p className="text-zinc-400 text-sm">Aucun contenu planifié pour {selectedMonth}.</p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition"
          >
            Générer le planning depuis un Plan Marketing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const dateObj = new Date(item.scheduledAt);
            const dateStr = dateObj.toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            const timeStr = dateObj.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const typeConfig = TYPE_LABELS[item.contentType] || TYPE_LABELS.social_post;
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;

            return (
              <div
                key={item.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left side: Date, Type, Channel */}
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-center min-w-[75px] shrink-0">
                    <div className="text-xs uppercase font-bold text-zinc-400">{dateStr}</div>
                    <div className="text-sm font-semibold text-white mt-0.5">{timeStr}</div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 ${typeConfig.color}`}
                      >
                        <span>{typeConfig.icon}</span> {typeConfig.label}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {item.channel}
                      </span>
                      {item.campaignId && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-950/80 text-purple-300 border border-purple-800">
                          Studio Lié
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>

                    {item.contentBrief && (
                      <p className="text-xs text-zinc-400 line-clamp-2 max-w-2xl whitespace-pre-line">
                        {item.contentBrief}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Status dropdown & actions */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Statut :</span>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as EditorialStatus)}
                      className={`text-xs font-medium rounded-lg px-2.5 py-1.5 border transition ${statusConfig.color}`}
                    >
                      <option value="draft">Brouillon</option>
                      <option value="scheduled">Programmé</option>
                      <option value="in_production">En production</option>
                      <option value="ready_for_review">À réviser</option>
                      <option value="approved">Validé</option>
                      <option value="published">Publié</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate From Plan Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚡</span> Générer le Calendrier Éditorial
            </h3>
            <p className="text-xs text-zinc-400">
              Sélectionnez un plan marketing pour convertir automatiquement ses propositions en créneaux calendaires optimisés sur 4 semaines.
            </p>

            {plans.length === 0 ? (
              <div className="p-3 bg-amber-950/40 border border-amber-800 rounded text-xs text-amber-300">
                Aucun plan marketing trouvé pour ce mois. Veuillez créer et valider un plan dans l'onglet Plan Marketing.
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-300">Plan Marketing source :</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.periodMonth} — {p.proposals?.length || 0} propositions)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium transition"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateFromPlan}
                disabled={!selectedPlanId || loading}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs font-medium transition"
              >
                {loading ? "Génération..." : "Générer le calendrier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleCreateItem}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg w-full space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>+</span> Planifier un Nouveau Contenu
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Titre de la publication :</label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="ex: Vidéo Teaser — Démonstration du flux d'orchestration"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Type de contenu :</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as EditorialContentType)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="video">Vidéo</option>
                    <option value="social_post">Post Réseau Social</option>
                    <option value="email">Email / Newsletter</option>
                    <option value="article">Article / Blog</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Canal de diffusion :</label>
                  <select
                    value={newItemChannel}
                    onChange={(e) => setNewItemChannel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="YouTube">YouTube</option>
                    <option value="TikTok">TikTok</option>
                    <option value="X">X (Twitter)</option>
                    <option value="Newsletter">Newsletter</option>
                    <option value="Blog">Blog</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Date et heure de publication :</label>
                <input
                  type="datetime-local"
                  required
                  value={newItemDate}
                  onChange={(e) => setNewItemDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Brief & Instructions créatives :</label>
                <textarea
                  rows={3}
                  value={newItemBrief}
                  onChange={(e) => setNewItemBrief(e.target.value)}
                  placeholder="Accroche, message principal, appel à l'action..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs font-medium transition"
              >
                {loading ? "Enregistrement..." : "Créer l'élément"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
