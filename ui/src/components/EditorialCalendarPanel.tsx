import React, { useState, useEffect } from "react";
import type {
  EditorialCalendarItem,
  EditorialCalendarStats,
  EditorialContentType,
  EditorialStatus,
  MarketingPlanWithDetails,
  GeneratedStoryboard,
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
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("2026-11");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Video generation modal
  const [activeVideoItem, setActiveVideoItem] = useState<EditorialCalendarItem | null>(null);
  const [videoPlatform, setVideoPlatform] = useState<"tiktok" | "reels" | "shorts" | "youtube" | "square">("tiktok");
  const [videoTemplate, setVideoTemplate] = useState<"editorial" | "product" | "launch">("editorial");
  const [videoNarration, setVideoNarration] = useState<"fr" | "en" | "none">("fr");
  const [previewStoryboard, setPreviewStoryboard] = useState<GeneratedStoryboard | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [viewingVideoItem, setViewingVideoItem] = useState<EditorialCalendarItem | null>(null);
  const [publishingItemId, setPublishingItemId] = useState<string | null>(null);

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
        const planList = Array.isArray(plansData) ? plansData : (plansData.plans || []);
        setPlans(planList);
        if (planList.length > 0 && !selectedPlanId) {
          setSelectedPlanId(planList[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Impossible de charger le calendrier éditorial");
    } finally {
      setLoading(false);
    }
  };

  const openGenerateModal = async () => {
    try {
      const plansRes = await fetch(`/api/companies/${companyId}/studio/plans?periodMonth=${selectedMonth}`);
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        const planList = Array.isArray(plansData) ? plansData : (plansData.plans || []);
        setPlans(planList);
        if (planList.length > 0) {
          setSelectedPlanId(planList[0].id);
        }
      }
    } catch {
      // ignore
    }
    setShowGenerateModal(true);
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

  // Preview storyboard
  const handlePreviewStoryboard = async (item: EditorialCalendarItem) => {
    try {
      setGeneratingVideo(true);
      const res = await fetch(`/api/companies/${companyId}/studio/video/preview-storyboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarItemId: item.id,
          proposalId: item.proposalId || undefined,
          platform: videoPlatform,
          template: videoTemplate,
          narration: videoNarration,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur de prévisualisation du storyboard");
      }
      const data = await res.json();
      setPreviewStoryboard(data.storyboard);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGeneratingVideo(false);
    }
  };

  // Enqueue video render
  const handleLaunchVideoRender = async (item: EditorialCalendarItem) => {
    try {
      setGeneratingVideo(true);
      const res = await fetch(`/api/companies/${companyId}/studio/video/generate-from-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarItemId: item.id,
          proposalId: item.proposalId || undefined,
          platform: videoPlatform,
          template: videoTemplate,
          narration: videoNarration,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur de mise en file de production");
      }
      setActiveVideoItem(null);
      setPreviewStoryboard(null);
      await fetchData();
      alert("La vidéo a été ajoutée à la file de production avec succès !");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handlePublishItem = async (item: EditorialCalendarItem) => {
    try {
      setPublishingItemId(item.id);
      const res = await fetch(`/api/companies/${companyId}/distribution/calendar/${item.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur lors du dispatch de publication");
      }
      const data = await res.json();
      await fetchData();
      alert(`Contenu dispatché et publié avec succès !\nLien externe : ${data.result?.externalPostUrl}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishingItemId(null);
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
                Lot 4 & 5 — Opérationnels
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Synchronisation des publications (vidéos, posts réseaux sociaux, emails et articles) et génération de vidéo par IA connectée.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openGenerateModal}
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
            onClick={openGenerateModal}
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
            const hasVideoAsset = !!item.publishedUrl && item.publishedUrl.endsWith(".mp4");

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

                {/* Right side: Video Actions & Status dropdown */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 self-end md:self-center">
                  {/* Video specific action buttons */}
                  {item.contentType === "video" && (
                    <>
                      {hasVideoAsset ? (
                        <button
                          onClick={() => setViewingVideoItem(item)}
                          className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                        >
                          <span>▶️</span> Voir la vidéo
                        </button>
                      ) : item.status === "in_production" ? (
                        <span className="px-3 py-1 bg-amber-950/60 border border-amber-800 text-amber-300 rounded-lg text-xs flex items-center gap-1.5 animate-pulse">
                          <span>⚙️</span> Rendu en cours...
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveVideoItem(item);
                            setPreviewStoryboard(null);
                          }}
                          className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                        >
                          <span>🎬</span> IA Storyboard & Rendu
                        </button>
                      )}
                    </>
                  )}

                  {/* External publication & dispatch actions */}
                  {item.status === "published" && item.publishedUrl ? (
                    <a
                      href={item.publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-950/70 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                      title="Consulter le contenu publié"
                    >
                      <span>🔗</span> En ligne
                    </a>
                  ) : item.status === "approved" ? (
                    <button
                      onClick={() => handlePublishItem(item)}
                      disabled={publishingItemId === item.id}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                      title="Diffuser vers le canal de publication externe"
                    >
                      <span>{publishingItemId === item.id ? "⏳" : "🚀"}</span>
                      {publishingItemId === item.id ? "Dispatch..." : "Publier"}
                    </button>
                  ) : null}

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

      {/* Video Player Modal */}
      {viewingVideoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎬</span> {viewingVideoItem.title}
              </h3>
              <button
                onClick={() => setViewingVideoItem(null)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {viewingVideoItem.publishedUrl && (
              <video
                controls
                autoPlay
                className="w-full max-h-[420px] rounded-lg bg-black border border-zinc-800"
                src={viewingVideoItem.publishedUrl}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex gap-2">
                {viewingVideoItem.publishedUrl && (
                  <a
                    href={viewingVideoItem.publishedUrl}
                    download
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-xs font-medium transition"
                  >
                    Télécharger output.mp4
                  </a>
                )}
              </div>
              <button
                onClick={() => setViewingVideoItem(null)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Generation / Storyboard Modal */}
      {activeVideoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>✨</span> Générateur de Vidéo & Storyboard IA
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">{activeVideoItem.title}</p>
              </div>
              <button
                onClick={() => {
                  setActiveVideoItem(null);
                  setPreviewStoryboard(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Config inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Format / Plateforme</label>
                <select
                  value={videoPlatform}
                  onChange={(e: any) => setVideoPlatform(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="tiktok">TikTok (9:16 Vertical)</option>
                  <option value="reels">Reels (9:16 Vertical)</option>
                  <option value="shorts">Shorts (9:16 Vertical)</option>
                  <option value="youtube">YouTube (16:9 Paysage)</option>
                  <option value="square">Carré (1:1 Square)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Template Graphique</label>
                <select
                  value={videoTemplate}
                  onChange={(e: any) => setVideoTemplate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="editorial">Éditorial (Élégant, Typographie)</option>
                  <option value="product">Produit (Focus Offre & Mockup)</option>
                  <option value="launch">Lancement (Impact, Dynamisme)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Narration Vocale</label>
                <select
                  value={videoNarration}
                  onChange={(e: any) => setVideoNarration(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="fr">Français (eSpeak local)</option>
                  <option value="en">Anglais (eSpeak local)</option>
                  <option value="none">Sans voix (Visuel seul)</option>
                </select>
              </div>
            </div>

            {/* Storyboard Preview Display */}
            {previewStoryboard ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Storyboard Généré ({previewStoryboard.totalDuration}s — {previewStoryboard.scenes.length} scènes)
                  </h4>
                  <span className="text-[11px] text-zinc-400">
                    Persona : {previewStoryboard.explanation.targetPersonaName || "Cible standard"}
                  </span>
                </div>

                <div className="space-y-2">
                  {previewStoryboard.scenes.map((scene, idx) => (
                    <div key={idx} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-zinc-400 font-semibold">
                        <span>Scène {idx + 1} : {scene.title}</span>
                        <span className="text-purple-300">{scene.duration}s</span>
                      </div>
                      <p className="text-zinc-300">{scene.text}</p>
                      {scene.speech && (
                        <p className="text-zinc-500 italic">🎙️ Voix off : "{scene.speech}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-lg text-center">
                <p className="text-xs text-zinc-400">
                  Cliquez sur "Prévisualiser le Storyboard" pour générer la narration et les 4 scènes selon la Mémoire de Marque.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => handlePreviewStoryboard(activeVideoItem)}
                disabled={generatingVideo}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-xs font-medium transition"
              >
                {generatingVideo && !previewStoryboard ? "Génération..." : "👁️ Prévisualiser le Storyboard"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveVideoItem(null);
                    setPreviewStoryboard(null);
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchVideoRender(activeVideoItem)}
                  disabled={generatingVideo}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>🚀</span> {generatingVideo ? "Lancement..." : "Lancer le Rendu Vidéo"}
                </button>
              </div>
            </div>
          </div>
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
                      {p.title} ({p.periodMonth} — {p.proposalsCount ?? p.proposals?.length ?? 0} propositions)
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>+</span> Nouveau Contenu au Planning
            </h3>

            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Titre du contenu</label>
                <input
                  required
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Ex: Démo produit 15s TikTok"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Format</label>
                  <select
                    value={newItemType}
                    onChange={(e: any) => setNewItemType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="video">Vidéo</option>
                    <option value="social_post">Post Réseau</option>
                    <option value="email">Email / Newsletter</option>
                    <option value="article">Article / Blog</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Canal</label>
                  <select
                    value={newItemChannel}
                    onChange={(e) => setNewItemChannel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-white"
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
                <label className="block text-xs font-medium text-zinc-300 mb-1">Date et heure de publication</label>
                <input
                  required
                  type="datetime-local"
                  value={newItemDate}
                  onChange={(e) => setNewItemDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Brief / Accroche (optionnel)</label>
                <textarea
                  rows={3}
                  value={newItemBrief}
                  onChange={(e) => setNewItemBrief(e.target.value)}
                  placeholder="Objectif, hook ou consignes spécifiques..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                />
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
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium transition"
                >
                  {loading ? "Création..." : "Ajouter au planning"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
