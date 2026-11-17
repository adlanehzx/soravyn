import { and, desc, eq } from "drizzle-orm";
import {
  brandProfiles,
  brandProducts,
  brandPersonas,
  brandObjections,
  brandSources,
  type Db,
} from "@soravyn/db";
import type {
  BrandProduct,
  BrandPersona,
  BrandObjection,
  BrandSource,
  BrandMemoryContext,
  BriefPreparationResult,
  MissingInformationFinding,
  PrepareBriefInput,
} from "@soravyn/shared";

export async function getBrandMemoryContext(db: Db, companyId: string): Promise<BrandMemoryContext> {
  const [profile] = await db.select().from(brandProfiles).where(eq(brandProfiles.companyId, companyId));
  const products = await db.select().from(brandProducts).where(eq(brandProducts.companyId, companyId)).orderBy(desc(brandProducts.createdAt));
  const personas = await db.select().from(brandPersonas).where(eq(brandPersonas.companyId, companyId)).orderBy(desc(brandPersonas.createdAt));
  const objections = await db.select().from(brandObjections).where(eq(brandObjections.companyId, companyId)).orderBy(desc(brandObjections.createdAt));
  const sources = await db.select().from(brandSources).where(eq(brandSources.companyId, companyId)).orderBy(desc(brandSources.createdAt));

  return {
    profile: profile ?? null,
    products: products as unknown as BrandProduct[],
    personas: personas as unknown as BrandPersona[],
    objections: objections as unknown as BrandObjection[],
    sources: sources as unknown as BrandSource[],
    stats: {
      productCount: products.length,
      personaCount: personas.length,
      objectionCount: objections.length,
      sourceCount: sources.length,
    },
  };
}

export function evaluateAndPrepareBrief(
  context: BrandMemoryContext,
  input: PrepareBriefInput
): BriefPreparationResult {
  const missingInformation: MissingInformationFinding[] = [];
  const recommendedAdditions: string[] = [];

  const combinedBriefText = `${input.name} ${input.objectives} ${input.brief}`.toLowerCase();

  // 1. Matched Product Resolution
  let matchedProduct: BrandProduct | null = null;
  if (input.productId) {
    matchedProduct = context.products.find((p) => p.id === input.productId) ?? null;
  }
  if (!matchedProduct && context.products.length > 0) {
    matchedProduct = context.products.find((p) => combinedBriefText.includes(p.name.toLowerCase())) ?? null;
  }

  // 2. Product & Pricing Validation
  if (!matchedProduct) {
    if (context.products.length > 0) {
      missingInformation.push({
        code: "unspecified_product",
        field: "productId",
        severity: "warning",
        message: "Aucun produit ou offre spécifique de la marque n'est rattaché à ce brief.",
        recommendation: `Sélectionnez l'un des produits enregistrés (${context.products.map((p) => p.name).join(", ")}) pour ancrer la proposition de valeur.`,
      });
    } else {
      missingInformation.push({
        code: "no_products_defined",
        field: "products",
        severity: "warning",
        message: "Aucun produit n'est encore enregistré dans la mémoire de marque.",
        recommendation: "Ajoutez vos produits ou offres dans la mémoire de marque avec leur tarification.",
      });
    }
  } else {
    if (!matchedProduct.pricing || matchedProduct.pricing.trim() === "") {
      missingInformation.push({
        code: "missing_product_pricing",
        field: "pricing",
        severity: "error",
        message: `Le produit "${matchedProduct.name}" n'a aucun prix ni modèle tarifaire renseigné.`,
        recommendation: "Précisez le prix, l'abonnement ou la mention tarifaire dans la fiche produit.",
      });
    }
    if (!matchedProduct.valueProposition || matchedProduct.valueProposition.trim() === "") {
      missingInformation.push({
        code: "missing_value_proposition",
        field: "valueProposition",
        severity: "warning",
        message: `La proposition de valeur unique (USP) pour "${matchedProduct.name}" est absente.`,
        recommendation: "Complétez la proposition de valeur du produit pour orienter les accroches créatives.",
      });
    }
  }

  // 3. Matched Persona Resolution
  let matchedPersona: BrandPersona | null = null;
  if (input.personaId) {
    matchedPersona = context.personas.find((p) => p.id === input.personaId) ?? null;
  }
  if (!matchedPersona && context.personas.length > 0) {
    matchedPersona = context.personas.find((p) =>
      combinedBriefText.includes(p.name.toLowerCase()) ||
      (p.role && combinedBriefText.includes(p.role.toLowerCase()))
    ) ?? null;
  }

  // 4. Persona Validation
  if (!matchedPersona) {
    if (context.personas.length > 0) {
      missingInformation.push({
        code: "unspecified_persona",
        field: "personaId",
        severity: "warning",
        message: "Aucun persona cible n'est explicitement identifié pour cette campagne.",
        recommendation: `Ciblez un persona parmi : ${context.personas.map((p) => p.name).join(", ")}.`,
      });
    } else {
      missingInformation.push({
        code: "no_personas_defined",
        field: "personas",
        severity: "warning",
        message: "Aucun persona n'est défini dans la mémoire de marque.",
        recommendation: "Définissez au moins un persona cible pour adapter le vocabulaire et les canaux.",
      });
    }
  }

  // 5. Relevant Objections Resolution
  let relevantObjections = context.objections;
  if (matchedProduct) {
    const productObjections = context.objections.filter((o) => o.productId === matchedProduct!.id);
    if (productObjections.length > 0) {
      relevantObjections = productObjections;
    }
  }

  // Check if objections are handled in the brief
  if (relevantObjections.length > 0) {
    const unaddressed = relevantObjections.filter((obj) => {
      const objectionWords = obj.objection.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const mentioned = objectionWords.some((w) => combinedBriefText.includes(w));
      return !mentioned;
    });

    if (unaddressed.length > 0 && unaddressed.length === relevantObjections.length) {
      missingInformation.push({
        code: "unhandled_objections",
        field: "objections",
        severity: "warning",
        message: `Des objections fréquentes (${unaddressed.slice(0, 2).map((o) => `"${o.objection}"`).join(", ")}) ne sont pas traitées dans ce brief.`,
        recommendation: "Anticipez ces objections dans les messages clés ou le scénario créatif.",
      });
    }
  }

  // 6. Source Claims & Verification
  const claimMatches = Array.from(
    new Set(
      input.brief.match(
        /\b\d+(?:[.,]\d+)?\s*(?:%|€|\$|clients|utilisateurs|jours|ans|x|fois)(?![a-zA-Z0-9])/gi
      ) || []
    )
  );

  const allVerifiedSourcesText = context.sources
    .filter((s) => s.verified === "verified")
    .map((s) => s.content)
    .concat(context.objections.map((o) => o.verifiableProof))
    .join("\n")
    .toLowerCase();

  const unverifiedClaims = claimMatches.filter(
    (claim) => !allVerifiedSourcesText.includes(claim.toLowerCase())
  );

  if (unverifiedClaims.length > 0) {
    missingInformation.push({
      code: "unverified_claims",
      field: "sources",
      severity: "warning",
      message: `Des affirmations chiffrées ne figurent dans aucune source vérifiée enregistrée : ${unverifiedClaims.join(", ")}.`,
      recommendation: "Ajoutez la source documentaire ou l'étude justificative dans les sources de la marque.",
    });
  }

  // 7. Channels & Persona Preference Alignment
  const briefChannels = input.channels ?? [];
  if (briefChannels.length === 0) {
    missingInformation.push({
      code: "missing_channels",
      field: "channels",
      severity: "warning",
      message: "Aucun canal de diffusion n'est sélectionné pour cette campagne.",
      recommendation: matchedPersona && matchedPersona.preferredChannels.length > 0
        ? `Le persona cible privilégie : ${matchedPersona.preferredChannels.join(", ")}.`
        : "Spécifiez au moins un canal de diffusion (ex: TikTok, LinkedIn, Instagram, YouTube).",
    });
  } else if (matchedPersona && matchedPersona.preferredChannels.length > 0) {
    const commonChannels = briefChannels.filter((c) =>
      matchedPersona!.preferredChannels.some((pc) => pc.toLowerCase() === c.toLowerCase())
    );
    if (commonChannels.length === 0) {
      missingInformation.push({
        code: "channel_mismatch",
        field: "channels",
        severity: "warning",
        message: `Les canaux sélectionnés (${briefChannels.join(", ")}) ne correspondent pas aux canaux préférés du persona "${matchedPersona.name}" (${matchedPersona.preferredChannels.join(", ")}).`,
        recommendation: `Envisagez d'ajouter ${matchedPersona.preferredChannels.join(", ")} au plan de diffusion.`,
      });
    }
  }

  // 8. Brand Tone & Editorial Rules
  const profileRecord = context.profile as Record<string, unknown> | null;
  const brandTone = typeof profileRecord?.tone === "string" && profileRecord.tone ? profileRecord.tone : "Non défini";
  const editorialRules = typeof profileRecord?.editorialRules === "string" && profileRecord.editorialRules ? profileRecord.editorialRules : "";

  if (brandTone === "Non défini" || !editorialRules) {
    missingInformation.push({
      code: "missing_editorial_rules",
      field: "editorialRules",
      severity: "warning",
      message: "La charte éditoriale ou le ton de marque n'est pas encore défini dans le profil de marque.",
      recommendation: "Renseignez le ton et les règles éditoriales pour garantir la cohérence stylistique.",
    });
  }

  // 9. Build Recommended Additions
  if (matchedProduct) {
    recommendedAdditions.push(`Offre mise en avant : ${matchedProduct.name} (${matchedProduct.pricing || "Prix à préciser"})`);
    if (matchedProduct.valueProposition) {
      recommendedAdditions.push(`Accroche valeur : ${matchedProduct.valueProposition}`);
    }
  }
  if (matchedPersona) {
    recommendedAdditions.push(`Angle d'accroche persona : Répondre au problème "${matchedPersona.painPoints[0] || matchedPersona.role}"`);
  }
  if (relevantObjections.length > 0) {
    const topObj = relevantObjections[0];
    recommendedAdditions.push(`Traitement de l'objection "${topObj.objection}" via l'argument : "${topObj.recommendedResponse}"`);
  }

  // 10. Relevant Sources Matching
  const relevantSources = context.sources.filter((s) => {
    const titleWords = s.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const tagMatch = s.tags.some((t) => combinedBriefText.includes(t.toLowerCase()));
    return tagMatch || titleWords.some((w) => combinedBriefText.includes(w));
  });

  const hasErrors = missingInformation.some((m) => m.severity === "error");
  const status: BriefPreparationResult["status"] = hasErrors
    ? "incomplete"
    : missingInformation.length > 0
    ? "action_required"
    : "complete";

  return {
    version: "deterministic-v1",
    status,
    enrichedBrief: {
      campaignName: input.name,
      objectives: input.objectives,
      briefContent: input.brief,
      channels: briefChannels,
      brandTone,
      editorialRules,
    },
    matchedProduct,
    matchedPersona,
    relevantObjections,
    relevantSources,
    missingInformation,
    recommendedBriefAdditions: recommendedAdditions,
  };
}
