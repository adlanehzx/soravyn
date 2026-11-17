import { and, desc, eq, sql } from "drizzle-orm";
import {
  marketingPlans,
  marketingPlanThemes,
  marketingPlanProposals,
  campaigns,
  approvals,
  activityLog,
  type Db,
} from "@soravyn/db";
import type {
  GenerateMarketingPlanInput,
  MarketingPlanInput,
  MarketingPlanUpdateInput,
  MarketingPlanThemeInput,
  MarketingPlanProposalInput,
  MarketingPlanWithDetails,
  MarketingPlanSummary,
} from "@soravyn/shared";
import { badRequest, conflict, notFound, unprocessable } from "../errors.js";
import { getBrandMemoryContext } from "./brand-memory.js";

export async function listMarketingPlans(
  db: Db,
  companyId: string
): Promise<MarketingPlanSummary[]> {
  const plans = await db
    .select()
    .from(marketingPlans)
    .where(eq(marketingPlans.companyId, companyId))
    .orderBy(desc(marketingPlans.createdAt));

  const summaries: MarketingPlanSummary[] = [];
  for (const plan of plans) {
    const themes = await db
      .select({ count: sql<number>`count(*)` })
      .from(marketingPlanThemes)
      .where(eq(marketingPlanThemes.planId, plan.id));
    const proposals = await db
      .select({ count: sql<number>`count(*)` })
      .from(marketingPlanProposals)
      .where(eq(marketingPlanProposals.planId, plan.id));
    const converted = await db
      .select({ count: sql<number>`count(*)` })
      .from(marketingPlanProposals)
      .where(
        and(
          eq(marketingPlanProposals.planId, plan.id),
          eq(marketingPlanProposals.status, "converted")
        )
      );

    summaries.push({
      id: plan.id,
      title: plan.title,
      periodMonth: plan.periodMonth,
      commercialGoal: plan.commercialGoal,
      totalBudget: plan.totalBudget,
      currency: plan.currency,
      status: plan.status as any,
      themesCount: Number(themes[0]?.count ?? 0),
      proposalsCount: Number(proposals[0]?.count ?? 0),
      convertedCampaignsCount: Number(converted[0]?.count ?? 0),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });
  }

  return summaries;
}

export async function getMarketingPlanById(
  db: Db,
  companyId: string,
  planId: string
): Promise<MarketingPlanWithDetails> {
  const [plan] = await db
    .select()
    .from(marketingPlans)
    .where(and(eq(marketingPlans.id, planId), eq(marketingPlans.companyId, companyId)));

  if (!plan) {
    throw notFound("Marketing plan not found");
  }

  const themes = await db
    .select()
    .from(marketingPlanThemes)
    .where(and(eq(marketingPlanThemes.planId, planId), eq(marketingPlanThemes.companyId, companyId)))
    .orderBy(marketingPlanThemes.weekNumber, marketingPlanThemes.orderIndex);

  const proposals = await db
    .select()
    .from(marketingPlanProposals)
    .where(and(eq(marketingPlanProposals.planId, planId), eq(marketingPlanProposals.companyId, companyId)))
    .orderBy(marketingPlanProposals.createdAt);

  let approvalInfo: { id: string; status: string; decisionNote?: string | null } | null = null;
  if (plan.approvalId) {
    const [approvalRecord] = await db
      .select()
      .from(approvals)
      .where(and(eq(approvals.id, plan.approvalId), eq(approvals.companyId, companyId)));
    if (approvalRecord) {
      approvalInfo = {
        id: approvalRecord.id,
        status: approvalRecord.status,
        decisionNote: approvalRecord.decisionNote,
      };
    }
  }

  const allocatedBudgetSum = themes.reduce((sum, t) => sum + (t.allocatedBudget || 0), 0);
  const remainingBudget = Math.max(0, plan.totalBudget - allocatedBudgetSum);

  return {
    ...plan,
    status: plan.status as any,
    themes: themes as any,
    proposals: proposals as any,
    allocatedBudgetSum,
    remainingBudget,
    approval: approvalInfo,
  };
}

export async function generateMarketingPlan(
  db: Db,
  companyId: string,
  input: GenerateMarketingPlanInput,
  userId?: string
): Promise<MarketingPlanWithDetails> {
  const brandContext = await getBrandMemoryContext(db, companyId);

  const product =
    (input.focusProductIds && input.focusProductIds.length > 0
      ? brandContext.products.find((p) => input.focusProductIds!.includes(p.id))
      : null) ??
    brandContext.products[0] ??
    null;

  const persona =
    (input.focusPersonaIds && input.focusPersonaIds.length > 0
      ? brandContext.personas.find((p) => input.focusPersonaIds!.includes(p.id))
      : null) ??
    brandContext.personas[0] ??
    null;

  const priorities =
    input.priorities && input.priorities.length > 0
      ? input.priorities
      : [
          "Notoriété & Positionnement de marque",
          "Acquisition de prospects qualifiés",
          "Démonstration de valeur & Conversion",
        ];

  const primaryChannels =
    input.primaryChannels && input.primaryChannels.length > 0
      ? input.primaryChannels
      : persona?.preferredChannels && persona.preferredChannels.length > 0
      ? persona.preferredChannels
      : ["LinkedIn", "YouTube", "TikTok", "Instagram"];

  const planTitle = `Plan Marketing ${input.periodMonth} — ${product ? product.name : "Expansion Marque"}`;
  const totalBudget = input.totalBudget ?? 5000;
  const currency = input.currency ?? "EUR";

  const productName = product ? product.name : "Notre Offre";
  const personaName = persona ? persona.name : "Cible prioritaire";
  const usp = product?.valueProposition || "Solution performante et adaptée à vos enjeux";
  const painPoint = persona?.painPoints?.[0] || "optimisation des coûts et du temps d'exécution";

  // Create plan in DB
  const [createdPlan] = await db
    .insert(marketingPlans)
    .values({
      companyId,
      title: planTitle,
      description: `Plan d'action commercial pour le mois ${input.periodMonth}. Objectif: ${input.commercialGoal}. Produit phare: ${productName}.`,
      periodMonth: input.periodMonth,
      commercialGoal: input.commercialGoal,
      targetAudience: input.targetAudience || (persona ? `${persona.name} (${persona.role})` : "Décideurs et acheteurs B2B"),
      totalBudget,
      currency,
      priorities,
      primaryChannels,
      status: "draft",
      kpiTargets: {
        objectif_commercial: input.commercialGoal,
        budget_alloue: totalBudget,
        leads_estimes: Math.round(totalBudget / 50),
      },
      createdByUserId: userId || null,
    })
    .returning();

  // Create 4 weekly themes
  const weeklyBudgets = [
    Math.round(totalBudget * 0.25),
    Math.round(totalBudget * 0.30),
    Math.round(totalBudget * 0.25),
    Math.round(totalBudget * 0.20),
  ];

  const themeTemplates = [
    {
      weekNumber: 1,
      title: `Semaine 1 : Sensibilisation & Diagnostic du Problème`,
      description: `Mettre en lumière le coût de l'inaction face à : "${painPoint}". Capter l'attention de ${personaName}.`,
      allocatedBudget: weeklyBudgets[0],
      targetKpi: `15 000 impressions qualifiées, taux d'accroche > 28%`,
      orderIndex: 0,
    },
    {
      weekNumber: 2,
      title: `Semaine 2 : Démonstration Produit & Différenciation`,
      description: `Démontrer la valeur de ${productName} (${usp}). Mettre l'accent sur les fonctionnalités clés.`,
      allocatedBudget: weeklyBudgets[1],
      targetKpi: `600 visites de page produit, 45 démonstrations visionnées`,
      orderIndex: 1,
    },
    {
      weekNumber: 3,
      title: `Semaine 3 : Preuves Sociales & Levée des Objections`,
      description: `Publier des preuves tangibles, retours d'expérience et désamorcer les freins tarifaires et techniques.`,
      allocatedBudget: weeklyBudgets[2],
      targetKpi: `80 consultations de tarifs, 30 leads qualifiés`,
      orderIndex: 2,
    },
    {
      weekNumber: 4,
      title: `Semaine 4 : Offre d'Activation, Urgence & Clôture`,
      description: `Campagne de clôture mensuelle avec appel à l'action direct et incitation à réserver une démo.`,
      allocatedBudget: weeklyBudgets[3],
      targetKpi: `15 signatures / démarrages d'essai validés`,
      orderIndex: 3,
    },
  ];

  const createdThemes = [];
  for (const t of themeTemplates) {
    const [theme] = await db
      .insert(marketingPlanThemes)
      .values({
        planId: createdPlan.id,
        companyId,
        weekNumber: t.weekNumber,
        title: t.title,
        description: t.description,
        focusPersonaId: persona?.id || null,
        focusProductId: product?.id || null,
        allocatedBudget: t.allocatedBudget,
        targetKpi: t.targetKpi,
        orderIndex: t.orderIndex,
      })
      .returning();
    createdThemes.push(theme);
  }

  // Generate proposals attached to themes
  const channel1 = primaryChannels[0] || "LinkedIn";
  const channel2 = primaryChannels[1] || "YouTube";
  const channel3 = primaryChannels[2] || "TikTok";

  const proposalTemplates = [
    // Theme 1
    {
      themeIndex: 0,
      title: `Vidéo Accroche : Le coût invisible de ${painPoint}`,
      channel: channel1,
      format: "Video 16:9",
      angle: `Analyse d'impact et diagnostic chiffré des pertes liées à l'absence de solution moderne`,
      hook: `Saviez-vous que 72% des équipes perdent plus de 10h par semaine sur cette tâche ?`,
      callToAction: `Téléchargez le rapport d'audit comparatif`,
      estimatedCost: Math.round(weeklyBudgets[0] * 0.6),
    },
    {
      themeIndex: 0,
      title: `Carrousel Synthèse : 4 erreurs à éliminer ce trimestre`,
      channel: channel1,
      format: "Post Carrousel",
      angle: `Guide pragmatique en 5 étapes pour auditer sa méthode actuelle`,
      hook: `Voici les 4 signes que vos process actuels freinent votre croissance :`,
      callToAction: `Commentez "AUDIT" pour recevoir la checklist`,
      estimatedCost: Math.round(weeklyBudgets[0] * 0.4),
    },
    // Theme 2
    {
      themeIndex: 1,
      title: `Vidéo Démo : ${productName} en action réelle`,
      channel: channel2,
      format: "Video 16:9",
      angle: `Démonstration pas-à-pas de la proposition de valeur (${usp})`,
      hook: `Comment diviser par 3 vos délais de production sans recruter :`,
      callToAction: `Réservez votre démonstration personnalisée en 1 clic`,
      estimatedCost: Math.round(weeklyBudgets[1] * 0.7),
    },
    {
      themeIndex: 1,
      title: `Short Dynamique : Avant vs Après ${productName}`,
      channel: channel3,
      format: "Short/Reel 9:16",
      angle: `Comparatif percutant et dynamique du workflow traditionnel vs autonome`,
      hook: `Votre quotidien avant... et après avoir activé notre studio :`,
      callToAction: `Lien en bio pour tester gratuitement`,
      estimatedCost: Math.round(weeklyBudgets[1] * 0.3),
    },
    // Theme 3
    {
      themeIndex: 2,
      title: `Étude de Cas : Retour sur investissement mesuré en 30 jours`,
      channel: channel1,
      format: "Post Carrousel",
      angle: `Preuve documentaire et benchmark sur les gains concrets observés`,
      hook: `Les résultats vérifiés : +45% d'efficacité dès le premier mois.`,
      callToAction: `Découvrez l'étude de cas complète`,
      estimatedCost: Math.round(weeklyBudgets[2] * 0.5),
    },
    {
      themeIndex: 2,
      title: `Vidéo Réponse : "Est-ce rentable pour une structure comme la nôtre ?"`,
      channel: channel2,
      format: "Video 16:9",
      angle: `Réponse transparente sur les tarifs (${product?.pricing || "sur mesure"}) et le seuil de rentabilité`,
      hook: `Pourquoi notre tarification est rentabilisée dès les deux premières semaines :`,
      callToAction: `Calculez votre ROI avec notre simulateur`,
      estimatedCost: Math.round(weeklyBudgets[2] * 0.5),
    },
    // Theme 4
    {
      themeIndex: 3,
      title: `Campagne d'Activation : Offre de lancement pour ${input.periodMonth}`,
      channel: channel1,
      format: "Video 16:9",
      angle: `Urgence raisonnée et proposition exclusive de démarrage rapide`,
      hook: `Rejoignez les marques pionnières avant la fin du mois :`,
      callToAction: `Activez votre accès studio dès aujourd'hui`,
      estimatedCost: Math.round(weeklyBudgets[3] * 0.7),
    },
    {
      themeIndex: 3,
      title: `Newsletter d'Urgence : Clôture des créneaux d'onboarding`,
      channel: "Newsletter",
      format: "Emailing / Séquence",
      angle: `Dernier rappel pour bénéficier du setup offert`,
      hook: `Dernières 48h pour finaliser votre déploiement de ${input.periodMonth}`,
      callToAction: `Confirmer votre créneau d'intégration`,
      estimatedCost: Math.round(weeklyBudgets[3] * 0.3),
    },
  ];

  for (const p of proposalTemplates) {
    const parentTheme = createdThemes[p.themeIndex];
    await db.insert(marketingPlanProposals).values({
      planId: createdPlan.id,
      themeId: parentTheme ? parentTheme.id : null,
      companyId,
      title: p.title,
      channel: p.channel,
      format: p.format,
      angle: p.angle,
      hook: p.hook,
      callToAction: p.callToAction,
      estimatedCost: p.estimatedCost,
      targetAudience: persona ? `${persona.name} (${persona.role})` : "Audience cible",
      status: "suggested",
    });
  }

  await db.insert(activityLog).values({
    companyId,
    actorType: "user",
    actorId: userId || "system",
    action: "marketing_plan.generated",
    entityType: "marketing_plan",
    entityId: createdPlan.id,
    details: {
      planId: createdPlan.id,
      title: createdPlan.title,
      periodMonth: input.periodMonth,
      commercialGoal: input.commercialGoal,
      themesCount: createdThemes.length,
      proposalsCount: proposalTemplates.length,
    },
  });

  return getMarketingPlanById(db, companyId, createdPlan.id);
}

export async function createMarketingPlan(
  db: Db,
  companyId: string,
  input: MarketingPlanInput,
  userId?: string
): Promise<MarketingPlanWithDetails> {
  const [created] = await db
    .insert(marketingPlans)
    .values({
      companyId,
      title: input.title,
      description: input.description,
      periodMonth: input.periodMonth,
      commercialGoal: input.commercialGoal,
      targetAudience: input.targetAudience,
      totalBudget: input.totalBudget,
      currency: input.currency,
      priorities: input.priorities,
      primaryChannels: input.primaryChannels,
      kpiTargets: input.kpiTargets,
      status: "draft",
      createdByUserId: userId || null,
    })
    .returning();

  await db.insert(activityLog).values({
    companyId,
    actorType: "user",
    actorId: userId || "system",
    action: "marketing_plan.created",
    entityType: "marketing_plan",
    entityId: created.id,
    details: { title: created.title, periodMonth: created.periodMonth },
  });

  return getMarketingPlanById(db, companyId, created.id);
}

export async function updateMarketingPlan(
  db: Db,
  companyId: string,
  planId: string,
  input: MarketingPlanUpdateInput
): Promise<MarketingPlanWithDetails> {
  const [existing] = await db
    .select()
    .from(marketingPlans)
    .where(and(eq(marketingPlans.id, planId), eq(marketingPlans.companyId, companyId)));

  if (!existing) {
    throw notFound("Marketing plan not found");
  }

  await db
    .update(marketingPlans)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(marketingPlans.id, planId));

  return getMarketingPlanById(db, companyId, planId);
}

export async function deleteMarketingPlan(
  db: Db,
  companyId: string,
  planId: string
): Promise<void> {
  const [existing] = await db
    .select()
    .from(marketingPlans)
    .where(and(eq(marketingPlans.id, planId), eq(marketingPlans.companyId, companyId)));

  if (!existing) {
    throw notFound("Marketing plan not found");
  }

  await db.delete(marketingPlans).where(eq(marketingPlans.id, planId));
}

export async function addOrUpdateTheme(
  db: Db,
  companyId: string,
  planId: string,
  input: MarketingPlanThemeInput,
  themeId?: string
) {
  const [plan] = await db
    .select()
    .from(marketingPlans)
    .where(and(eq(marketingPlans.id, planId), eq(marketingPlans.companyId, companyId)));
  if (!plan) {
    throw notFound("Marketing plan not found");
  }

  if (themeId) {
    const [existing] = await db
      .select()
      .from(marketingPlanThemes)
      .where(
        and(
          eq(marketingPlanThemes.id, themeId),
          eq(marketingPlanThemes.planId, planId),
          eq(marketingPlanThemes.companyId, companyId)
        )
      );
    if (!existing) throw notFound("Theme not found");

    const [updated] = await db
      .update(marketingPlanThemes)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(marketingPlanThemes.id, themeId))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(marketingPlanThemes)
      .values({
        planId,
        companyId,
        ...input,
      })
      .returning();
    return created;
  }
}

export async function deleteTheme(
  db: Db,
  companyId: string,
  planId: string,
  themeId: string
) {
  const [existing] = await db
    .select()
    .from(marketingPlanThemes)
    .where(
      and(
        eq(marketingPlanThemes.id, themeId),
        eq(marketingPlanThemes.planId, planId),
        eq(marketingPlanThemes.companyId, companyId)
      )
    );
  if (!existing) throw notFound("Theme not found");
  await db.delete(marketingPlanThemes).where(eq(marketingPlanThemes.id, themeId));
}

export async function addOrUpdateProposal(
  db: Db,
  companyId: string,
  planId: string,
  input: MarketingPlanProposalInput,
  proposalId?: string
) {
  const [plan] = await db
    .select()
    .from(marketingPlans)
    .where(and(eq(marketingPlans.id, planId), eq(marketingPlans.companyId, companyId)));
  if (!plan) {
    throw notFound("Marketing plan not found");
  }

  if (proposalId) {
    const [existing] = await db
      .select()
      .from(marketingPlanProposals)
      .where(
        and(
          eq(marketingPlanProposals.id, proposalId),
          eq(marketingPlanProposals.planId, planId),
          eq(marketingPlanProposals.companyId, companyId)
        )
      );
    if (!existing) throw notFound("Proposal not found");

    const [updated] = await db
      .update(marketingPlanProposals)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(marketingPlanProposals.id, proposalId))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(marketingPlanProposals)
      .values({
        planId,
        companyId,
        ...input,
      })
      .returning();
    return created;
  }
}

export async function deleteProposal(
  db: Db,
  companyId: string,
  planId: string,
  proposalId: string
) {
  const [existing] = await db
    .select()
    .from(marketingPlanProposals)
    .where(
      and(
        eq(marketingPlanProposals.id, proposalId),
        eq(marketingPlanProposals.planId, planId),
        eq(marketingPlanProposals.companyId, companyId)
      )
    );
  if (!existing) throw notFound("Proposal not found");
  await db.delete(marketingPlanProposals).where(eq(marketingPlanProposals.id, proposalId));
}

export async function submitPlanForValidation(
  db: Db,
  companyId: string,
  planId: string,
  userId: string,
  notes?: string
): Promise<MarketingPlanWithDetails> {
  const [plan] = await db
    .select()
    .from(marketingPlans)
    .where(and(eq(marketingPlans.id, planId), eq(marketingPlans.companyId, companyId)));

  if (!plan) {
    throw notFound("Marketing plan not found");
  }

  if (plan.status === "approved" || plan.status === "active") {
    throw conflict("This plan has already been approved");
  }

  // Create approval record
  const [approval] = await db
    .insert(approvals)
    .values({
      companyId,
      type: "marketing_plan_validation",
      requestedByUserId: userId,
      status: "pending",
      payload: {
        planId: plan.id,
        title: plan.title,
        periodMonth: plan.periodMonth,
        commercialGoal: plan.commercialGoal,
        totalBudget: plan.totalBudget,
        currency: plan.currency,
        notes: notes || "Soumission du plan marketing mensuel pour validation de gouvernance",
      },
    })
    .returning();

  // Update plan status
  await db
    .update(marketingPlans)
    .set({
      status: "pending_validation",
      approvalId: approval.id,
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(marketingPlans.id, planId));

  await db.insert(activityLog).values({
    companyId,
    actorType: "user",
    actorId: userId,
    action: "marketing_plan.submitted_validation",
    entityType: "marketing_plan",
    entityId: plan.id,
    details: {
      planId: plan.id,
      approvalId: approval.id,
      notes: notes || "",
    },
  });

  return getMarketingPlanById(db, companyId, planId);
}

export async function resolvePlanApproval(
  db: Db,
  companyId: string,
  planId: string,
  decision: "approved" | "rejected",
  userId: string,
  decisionNote?: string
): Promise<MarketingPlanWithDetails> {
  const [plan] = await db
    .select()
    .from(marketingPlans)
    .where(and(eq(marketingPlans.id, planId), eq(marketingPlans.companyId, companyId)));

  if (!plan) {
    throw notFound("Marketing plan not found");
  }

  if (plan.approvalId) {
    await db
      .update(approvals)
      .set({
        status: decision,
        decisionNote: decisionNote || null,
        decidedByUserId: userId,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(approvals.id, plan.approvalId), eq(approvals.companyId, companyId)));
  }

  const newStatus = decision === "approved" ? "approved" : "rejected";
  await db
    .update(marketingPlans)
    .set({
      status: newStatus,
      rejectionReason: decision === "rejected" ? decisionNote || "Plan rejeté" : null,
      updatedAt: new Date(),
    })
    .where(eq(marketingPlans.id, planId));

  await db.insert(activityLog).values({
    companyId,
    actorType: "user",
    actorId: userId,
    action: decision === "approved" ? "marketing_plan.approved" : "marketing_plan.rejected",
    entityType: "marketing_plan",
    entityId: plan.id,
    details: {
      planId: plan.id,
      decision,
      decisionNote: decisionNote || "",
    },
  });

  return getMarketingPlanById(db, companyId, planId);
}

export async function convertProposalToCampaign(
  db: Db,
  companyId: string,
  planId: string,
  proposalId: string,
  userId: string
) {
  const [plan] = await db
    .select()
    .from(marketingPlans)
    .where(and(eq(marketingPlans.id, planId), eq(marketingPlans.companyId, companyId)));

  if (!plan) {
    throw notFound("Marketing plan not found");
  }

  const [proposal] = await db
    .select()
    .from(marketingPlanProposals)
    .where(
      and(
        eq(marketingPlanProposals.id, proposalId),
        eq(marketingPlanProposals.planId, planId),
        eq(marketingPlanProposals.companyId, companyId)
      )
    );

  if (!proposal) {
    throw notFound("Proposal not found");
  }

  if (proposal.campaignId || proposal.status === "converted") {
    throw conflict("This proposal has already been converted into a campaign");
  }

  const briefText = [
    `Campagne issue du plan marketing "${plan.title}" (${plan.periodMonth}).`,
    `Objectif commercial du plan : ${plan.commercialGoal}`,
    `Format prévu : ${proposal.format}`,
    `Angle créatif : ${proposal.angle}`,
    `Accroche suggérée : ${proposal.hook}`,
    `Appel à l'action (CTA) : ${proposal.callToAction}`,
    `Coût alloué estimé : ${proposal.estimatedCost} ${plan.currency}`,
  ].join("\n\n");

  const [createdCampaign] = await db
    .insert(campaigns)
    .values({
      companyId,
      name: proposal.title,
      objectives: `Objectif commercial du plan : ${plan.commercialGoal}`,
      audience: proposal.targetAudience || plan.targetAudience,
      channels: [proposal.channel],
      brief: briefText,
      strategy: `Canal : ${proposal.channel} | Format : ${proposal.format} | Angle : ${proposal.angle}`,
      status: "brief",
    })
    .returning();

  const [updatedProposal] = await db
    .update(marketingPlanProposals)
    .set({
      campaignId: createdCampaign.id,
      status: "converted",
      updatedAt: new Date(),
    })
    .where(eq(marketingPlanProposals.id, proposalId))
    .returning();

  await db.insert(activityLog).values({
    companyId,
    actorType: "user",
    actorId: userId,
    action: "marketing_plan.proposal_converted",
    entityType: "campaign",
    entityId: createdCampaign.id,
    details: {
      planId,
      proposalId,
      campaignId: createdCampaign.id,
      title: proposal.title,
      channel: proposal.channel,
    },
  });

  return {
    campaign: createdCampaign,
    proposal: updatedProposal,
  };
}
