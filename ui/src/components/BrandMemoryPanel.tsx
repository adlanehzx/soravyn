import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
import type {
  BrandProduct,
  BrandPersona,
  BrandObjection,
  BrandSource,
  BrandMemoryContext,
  BriefPreparationResult,
} from "@soravyn/shared";

const fieldClass = "w-full rounded-md border border-border bg-background p-2 text-sm";

export function BrandMemoryPanel({ companyId }: { companyId: string }) {
  const cache = useQueryClient();
  const base = `/companies/${companyId}/studio/brand`;
  const memoryKey = ["brand-memory", companyId];

  const [activeTab, setActiveTab] = useState<"products" | "personas" | "objections" | "sources" | "brief">("products");

  const memory = useQuery({
    queryKey: memoryKey,
    queryFn: () => api.get<BrandMemoryContext>(`${base}/memory`),
  });

  // Brief Evaluator Form State
  const [briefName, setBriefName] = useState("");
  const [briefObjectives, setBriefObjectives] = useState("");
  const [briefContent, setBriefContent] = useState("");
  const [briefProductId, setBriefProductId] = useState("");
  const [briefPersonaId, setBriefPersonaId] = useState("");
  const [briefChannels, setBriefChannels] = useState("LinkedIn, YouTube");
  const [evaluationResult, setEvaluationResult] = useState<BriefPreparationResult | null>(null);

  // New Product Form State
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [prodPricing, setProdPricing] = useState("");
  const [prodValueProp, setProdValueProp] = useState("");
  const [prodFeatures, setProdFeatures] = useState("");

  // New Persona Form State
  const [persName, setPersName] = useState("");
  const [persRole, setPersRole] = useState("");
  const [persPainPoints, setPersPainPoints] = useState("");
  const [persGoals, setPersGoals] = useState("");
  const [persChannels, setPersChannels] = useState("LinkedIn, YouTube");

  // New Objection Form State
  const [objText, setObjText] = useState("");
  const [objCategory, setObjCategory] = useState<"pricing" | "product" | "trust" | "technical" | "timing" | "other">("pricing");
  const [objResponse, setObjResponse] = useState("");
  const [objProof, setObjProof] = useState("");
  const [objProductId, setObjProductId] = useState("");

  // New Source Form State
  const [srcTitle, setSrcTitle] = useState("");
  const [srcKind, setSrcKind] = useState<"document" | "faq" | "guideline" | "case_study" | "benchmark" | "proof">("document");
  const [srcContent, setSrcContent] = useState("");
  const [srcUrl, setSrcUrl] = useState("");
  const [srcTags, setSrcTags] = useState("");

  // Mutations
  const createProduct = useMutation({
    mutationFn: () =>
      api.post(`${base}/products`, {
        name: prodName,
        category: prodCategory,
        pricing: prodPricing,
        valueProposition: prodValueProp,
        keyFeatures: prodFeatures.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      setProdName("");
      setProdCategory("");
      setProdPricing("");
      setProdValueProp("");
      setProdFeatures("");
      return cache.invalidateQueries({ queryKey: memoryKey });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`${base}/products/${id}`),
    onSuccess: () => cache.invalidateQueries({ queryKey: memoryKey }),
  });

  const createPersona = useMutation({
    mutationFn: () =>
      api.post(`${base}/personas`, {
        name: persName,
        role: persRole,
        painPoints: persPainPoints.split(",").map((s) => s.trim()).filter(Boolean),
        goals: persGoals.split(",").map((s) => s.trim()).filter(Boolean),
        preferredChannels: persChannels.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      setPersName("");
      setPersRole("");
      setPersPainPoints("");
      setPersGoals("");
      return cache.invalidateQueries({ queryKey: memoryKey });
    },
  });

  const deletePersona = useMutation({
    mutationFn: (id: string) => api.delete(`${base}/personas/${id}`),
    onSuccess: () => cache.invalidateQueries({ queryKey: memoryKey }),
  });

  const createObjection = useMutation({
    mutationFn: () =>
      api.post(`${base}/objections`, {
        objection: objText,
        category: objCategory,
        recommendedResponse: objResponse,
        verifiableProof: objProof,
        productId: objProductId || null,
      }),
    onSuccess: () => {
      setObjText("");
      setObjResponse("");
      setObjProof("");
      setObjProductId("");
      return cache.invalidateQueries({ queryKey: memoryKey });
    },
  });

  const deleteObjection = useMutation({
    mutationFn: (id: string) => api.delete(`${base}/objections/${id}`),
    onSuccess: () => cache.invalidateQueries({ queryKey: memoryKey }),
  });

  const createSource = useMutation({
    mutationFn: () =>
      api.post(`${base}/sources`, {
        title: srcTitle,
        kind: srcKind,
        content: srcContent,
        sourceUrl: srcUrl,
        tags: srcTags.split(",").map((s) => s.trim()).filter(Boolean),
        verified: "verified",
      }),
    onSuccess: () => {
      setSrcTitle("");
      setSrcContent("");
      setSrcUrl("");
      setSrcTags("");
      return cache.invalidateQueries({ queryKey: memoryKey });
    },
  });

  const deleteSource = useMutation({
    mutationFn: (id: string) => api.delete(`${base}/sources/${id}`),
    onSuccess: () => cache.invalidateQueries({ queryKey: memoryKey }),
  });

  const evaluateBrief = useMutation({
    mutationFn: async () => {
      const res = await api.post<BriefPreparationResult>(`${base}/prepare-brief`, {
        name: briefName,
        objectives: briefObjectives,
        brief: briefContent,
        productId: briefProductId || null,
        personaId: briefPersonaId || null,
        channels: briefChannels.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setEvaluationResult(res);
      return res;
    },
  });

  const stats = memory.data?.stats ?? { productCount: 0, personaCount: 0, objectionCount: 0, sourceCount: 0 };
  const products = memory.data?.products ?? [];
  const personas = memory.data?.personas ?? [];
  const objections = memory.data?.objections ?? [];
  const sources = memory.data?.sources ?? [];

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mémoire de marque & Connaissances vérifiables</h2>
          <p className="text-sm text-muted-foreground">
            Produits, tarification, personas, objections et sources de preuve alimentant les briefs des agents.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">{stats.productCount} produits</span>
          <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">{stats.personaCount} personas</span>
          <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">{stats.objectionCount} objections</span>
          <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">{stats.sourceCount} sources</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border pb-2 text-sm font-medium">
        {(
          [
            ["products", "Produits & Tarifs"],
            ["personas", "Personas Cibles"],
            ["objections", "Objections & Réponses"],
            ["sources", "Sources & Preuves"],
            ["brief", "Évaluateur de Brief & Gaps"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`mr-4 border-b-2 pb-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: PRODUCTS */}
      {activeTab === "products" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-base font-medium">Offres & Produits ({products.length})</h3>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun produit enregistré. Ajoutez vos offres pour ancrer vos briefs.</p>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{p.name}</h4>
                        {p.category && <span className="text-xs text-muted-foreground">{p.category}</span>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${p.pricing ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800" : "bg-destructive/20 text-destructive"}`}>
                        {p.pricing || "Prix non défini"}
                      </span>
                    </div>
                    {p.valueProposition && (
                      <p className="mt-2 text-xs text-muted-foreground font-medium">USP : {p.valueProposition}</p>
                    )}
                    {p.keyFeatures.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.keyFeatures.map((f, i) => (
                          <span key={i} className="text-[11px] bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProduct.mutate(p.id)}
                        disabled={deleteProduct.isPending}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createProduct.mutate();
            }}
            className="space-y-3 rounded-lg border border-border bg-background/50 p-4"
          >
            <h3 className="text-base font-medium">Ajouter une offre / produit</h3>
            <label className="block text-xs">
              Nom du produit
              <input required className={fieldClass} value={prodName} onChange={(e) => setProdName(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs">
                Catégorie
                <input className={fieldClass} value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} />
              </label>
              <label className="block text-xs">
                Tarification / Prix (ex: 49€/mois)
                <input required className={fieldClass} value={prodPricing} onChange={(e) => setProdPricing(e.target.value)} />
              </label>
            </div>
            <label className="block text-xs">
              Proposition de valeur unique (USP)
              <input className={fieldClass} value={prodValueProp} onChange={(e) => setProdValueProp(e.target.value)} />
            </label>
            <label className="block text-xs">
              Fonctionnalités clés (séparées par virgules)
              <input className={fieldClass} value={prodFeatures} onChange={(e) => setProdFeatures(e.target.value)} />
            </label>
            <Button disabled={createProduct.isPending || !prodName || !prodPricing} type="submit" size="sm">
              {createProduct.isPending ? "Ajout en cours…" : "Enregistrer le produit"}
            </Button>
          </form>
        </div>
      )}

      {/* TAB 2: PERSONAS */}
      {activeTab === "personas" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-base font-medium">Personas Cibles ({personas.length})</h3>
            {personas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun persona enregistré. Définissez vos profils cibles.</p>
            ) : (
              <div className="space-y-3">
                {personas.map((pers) => (
                  <div key={pers.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{pers.name}</h4>
                        {pers.role && <p className="text-xs text-muted-foreground">{pers.role}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">{pers.preferredChannels.join(", ")}</span>
                    </div>
                    {pers.painPoints.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs font-semibold text-muted-foreground">Problèmes majeurs :</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {pers.painPoints.map((pt, i) => (
                            <span key={i} className="text-[11px] bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded">
                              {pt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePersona.mutate(pers.id)}
                        disabled={deletePersona.isPending}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createPersona.mutate();
            }}
            className="space-y-3 rounded-lg border border-border bg-background/50 p-4"
          >
            <h3 className="text-base font-medium">Ajouter un persona cible</h3>
            <label className="block text-xs">
              Nom / Identifiant du persona
              <input required className={fieldClass} value={persName} onChange={(e) => setPersName(e.target.value)} />
            </label>
            <label className="block text-xs">
              Rôle / Titre (ex: Responsable Acquisition)
              <input className={fieldClass} value={persRole} onChange={(e) => setPersRole(e.target.value)} />
            </label>
            <label className="block text-xs">
              Douleurs / Pain points (séparés par virgules)
              <input className={fieldClass} value={persPainPoints} onChange={(e) => setPersPainPoints(e.target.value)} />
            </label>
            <label className="block text-xs">
              Objectifs prioritaires (séparés par virgules)
              <input className={fieldClass} value={persGoals} onChange={(e) => setPersGoals(e.target.value)} />
            </label>
            <label className="block text-xs">
              Canaux préférés (séparés par virgules)
              <input className={fieldClass} value={persChannels} onChange={(e) => setPersChannels(e.target.value)} />
            </label>
            <Button disabled={createPersona.isPending || !persName} type="submit" size="sm">
              {createPersona.isPending ? "Ajout…" : "Enregistrer le persona"}
            </Button>
          </form>
        </div>
      )}

      {/* TAB 3: OBJECTIONS */}
      {activeTab === "objections" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-base font-medium">Objections & Réponses Vérifiables ({objections.length})</h3>
            {objections.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune objection répertoriée.</p>
            ) : (
              <div className="space-y-3">
                {objections.map((obj) => (
                  <div key={obj.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-destructive">« {obj.objection} »</h4>
                      <span className="text-[11px] bg-secondary px-2 py-0.5 rounded capitalize">{obj.category}</span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-foreground">Réponse recommandée : {obj.recommendedResponse}</p>
                    {obj.verifiableProof && (
                      <p className="mt-1 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 p-2 rounded">
                        Preuve vérifiable : {obj.verifiableProof}
                      </p>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteObjection.mutate(obj.id)}
                        disabled={deleteObjection.isPending}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createObjection.mutate();
            }}
            className="space-y-3 rounded-lg border border-border bg-background/50 p-4"
          >
            <h3 className="text-base font-medium">Ajouter une objection</h3>
            <label className="block text-xs">
              Objection fréquente
              <input required className={fieldClass} value={objText} onChange={(e) => setObjText(e.target.value)} />
            </label>
            <label className="block text-xs">
              Catégorie
              <select className={fieldClass} value={objCategory} onChange={(e) => setObjCategory(e.target.value as any)}>
                <option value="pricing">Tarif / Prix</option>
                <option value="product">Fonctionnalité / Produit</option>
                <option value="trust">Confiance / Crédibilité</option>
                <option value="technical">Technique / Complexité</option>
                <option value="timing">Délai / Timing</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label className="block text-xs">
              Argument de réponse recommandé
              <textarea required rows={2} className={fieldClass} value={objResponse} onChange={(e) => setObjResponse(e.target.value)} />
            </label>
            <label className="block text-xs">
              Élément de preuve vérifiable (chiffre, étude, benchmark)
              <input className={fieldClass} value={objProof} onChange={(e) => setObjProof(e.target.value)} />
            </label>
            <label className="block text-xs">
              Produit associé (optionnel)
              <select className={fieldClass} value={objProductId} onChange={(e) => setObjProductId(e.target.value)}>
                <option value="">Tous les produits</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <Button disabled={createObjection.isPending || !objText || !objResponse} type="submit" size="sm">
              {createObjection.isPending ? "Ajout…" : "Enregistrer l'objection"}
            </Button>
          </form>
        </div>
      )}

      {/* TAB 4: SOURCES */}
      {activeTab === "sources" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-base font-medium">Sources & Documents Vérifiables ({sources.length})</h3>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune source vérifiée enregistrée.</p>
            ) : (
              <div className="space-y-3">
                {sources.map((src) => (
                  <div key={src.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-foreground">{src.title}</h4>
                      <span className="text-[11px] bg-secondary px-2 py-0.5 rounded uppercase">{src.kind}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{src.content}</p>
                    {src.sourceUrl && (
                      <a
                        href={src.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block text-xs text-primary hover:underline"
                      >
                        {src.sourceUrl}
                      </a>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSource.mutate(src.id)}
                        disabled={deleteSource.isPending}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createSource.mutate();
            }}
            className="space-y-3 rounded-lg border border-border bg-background/50 p-4"
          >
            <h3 className="text-base font-medium">Ajouter une source documentaire</h3>
            <label className="block text-xs">
              Titre du document / de l'étude
              <input required className={fieldClass} value={srcTitle} onChange={(e) => setSrcTitle(e.target.value)} />
            </label>
            <label className="block text-xs">
              Type de document
              <select className={fieldClass} value={srcKind} onChange={(e) => setSrcKind(e.target.value as any)}>
                <option value="document">Document officiel</option>
                <option value="case_study">Étude de cas client</option>
                <option value="benchmark">Benchmark / Rapport d'étude</option>
                <option value="faq">FAQ validée</option>
                <option value="guideline">Guideline éditoriale</option>
                <option value="proof">Preuve / Donnée vérifiée</option>
              </select>
            </label>
            <label className="block text-xs">
              Contenu vérifiable (données, chiffres clés, citations)
              <textarea required rows={4} className={fieldClass} value={srcContent} onChange={(e) => setSrcContent(e.target.value)} />
            </label>
            <label className="block text-xs">
              Lien / URL source
              <input className={fieldClass} value={srcUrl} onChange={(e) => setSrcUrl(e.target.value)} />
            </label>
            <label className="block text-xs">
              Tags (séparés par virgules)
              <input className={fieldClass} value={srcTags} onChange={(e) => setSrcTags(e.target.value)} />
            </label>
            <Button disabled={createSource.isPending || !srcTitle || !srcContent} type="submit" size="sm">
              {createSource.isPending ? "Ajout…" : "Enregistrer la source"}
            </Button>
          </form>
        </div>
      )}

      {/* TAB 5: BRIEF EVALUATOR & GAP ANALYSIS */}
      {activeTab === "brief" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                evaluateBrief.mutate();
              }}
              className="space-y-4 rounded-lg border border-border bg-background/50 p-4"
            >
              <h3 className="text-base font-medium">Évaluer un brief & Détecter les manques</h3>
              <p className="text-xs text-muted-foreground">
                Vérifie la conformité avec la mémoire de marque : prix, personas, objections et sources de preuves.
              </p>

              <label className="block text-xs">
                Nom de la campagne
                <input required className={fieldClass} value={briefName} onChange={(e) => setBriefName(e.target.value)} />
              </label>

              <label className="block text-xs">
                Objectifs commerciaux
                <textarea required rows={2} className={fieldClass} value={briefObjectives} onChange={(e) => setBriefObjectives(e.target.value)} />
              </label>

              <label className="block text-xs">
                Contenu du brief
                <textarea required rows={5} className={fieldClass} value={briefContent} onChange={(e) => setBriefContent(e.target.value)} />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs">
                  Produit cible
                  <select className={fieldClass} value={briefProductId} onChange={(e) => setBriefProductId(e.target.value)}>
                    <option value="">Détection automatique</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  Persona cible
                  <select className={fieldClass} value={briefPersonaId} onChange={(e) => setBriefPersonaId(e.target.value)}>
                    <option value="">Détection automatique</option>
                    {personas.map((pers) => (
                      <option key={pers.id} value={pers.id}>{pers.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs">
                Canaux sélectionnés (séparés par virgules)
                <input className={fieldClass} value={briefChannels} onChange={(e) => setBriefChannels(e.target.value)} />
              </label>

              <Button disabled={evaluateBrief.isPending || !briefName || !briefContent} type="submit" size="sm">
                {evaluateBrief.isPending ? "Analyse en cours…" : "Analyser le brief & Détecter les manques"}
              </Button>
            </form>

            <div className="space-y-4">
              <h3 className="text-base font-medium">Résultat d'évaluation & Gaps identifiés</h3>
              {!evaluationResult ? (
                <div className="rounded-lg border border-border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Soumettez un brief pour visualiser les informations de marque appariées et les manques à combler.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`rounded-lg border p-4 ${
                      evaluationResult.status === "complete"
                        ? "border-emerald-800 bg-emerald-950/20 text-emerald-400"
                        : evaluationResult.status === "action_required"
                        ? "border-amber-800 bg-amber-950/20 text-amber-400"
                        : "border-destructive bg-destructive/10 text-destructive"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-xs">
                        Statut : {evaluationResult.status === "complete" ? "Brief complet" : evaluationResult.status === "action_required" ? "Action recommandée" : "Incomplet (bloquant)"}
                      </span>
                      <span className="text-xs">
                        {evaluationResult.missingInformation.length} point(s) d'attention
                      </span>
                    </div>
                  </div>

                  {/* Missing Information Cards */}
                  {evaluationResult.missingInformation.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Informations manquantes signalées
                      </h4>
                      {evaluationResult.missingInformation.map((item, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg border p-3 text-xs ${
                            item.severity === "error"
                              ? "border-destructive/60 bg-destructive/10 text-destructive"
                              : "border-amber-700/60 bg-amber-950/20 text-amber-300"
                          }`}
                        >
                          <div className="font-semibold">{item.message}</div>
                          <div className="mt-1 text-muted-foreground">→ Recommandation : {item.recommendation}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reconciled Brand Facts */}
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Connaissances de marque réconciliées
                    </h4>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-muted-foreground">Produit apparié : </span>
                        <span className="font-medium text-foreground">
                          {evaluationResult.matchedProduct ? `${evaluationResult.matchedProduct.name} (${evaluationResult.matchedProduct.pricing || "Prix manquant"})` : "Non spécifié"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Persona apparié : </span>
                        <span className="font-medium text-foreground">
                          {evaluationResult.matchedPersona ? evaluationResult.matchedPersona.name : "Non spécifié"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Objections applicables : </span>
                        <span className="font-medium text-foreground">
                          {evaluationResult.relevantObjections.length > 0 ? `${evaluationResult.relevantObjections.length} objection(s) identifiée(s)` : "Aucune"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sources pertinentes : </span>
                        <span className="font-medium text-foreground">
                          {evaluationResult.relevantSources.length > 0 ? `${evaluationResult.relevantSources.length} source(s) trouvée(s)` : "Aucune"}
                        </span>
                      </div>
                    </div>

                    {evaluationResult.recommendedBriefAdditions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <span className="text-xs font-semibold text-foreground">Ajouts recommandés pour l'agent :</span>
                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground list-disc list-inside">
                          {evaluationResult.recommendedBriefAdditions.map((add, idx) => (
                            <li key={idx}>{add}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
