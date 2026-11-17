import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { eq, and } from "../../server/node_modules/drizzle-orm/index.js";
import { alphaDb } from "./alpha-context.js";
import {
  companies,
  brandProfiles,
  brandProducts,
  brandPersonas,
  brandObjections,
  brandSources,
} from "../../packages/db/src/index.js";
import {
  getBrandMemoryContext,
  evaluateAndPrepareBrief,
} from "../../server/src/services/brand-memory.js";

async function run() {
  const db = await alphaDb();

  console.log("1. Creating test client and competitor company for boundary checks...");
  const rand1 = Math.random().toString(36).substring(2, 4).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 4).toUpperCase();
  const [client] = await db
    .insert(companies)
    .values({ name: "Brand Memory Alpha Client", issuePrefix: `M${rand1}` })
    .returning();
  const [competitor] = await db
    .insert(companies)
    .values({ name: "Competitor Boundary Client", issuePrefix: `C${rand2}` })
    .returning();

  const cid = client.id;
  const compId = competitor.id;

  console.log("2. Inserting brand profile...");
  await db.insert(brandProfiles).values({
    companyId: cid,
    name: "Soravyn Marketing",
    description: "Studio autonome d'intelligence créative pour marques modernes.",
    industry: "Marketing AI",
    audience: "Directeurs marketing B2B et fondateurs",
    tone: "Audacieux, direct, fondé sur la preuve",
    editorialRules: "Ne jamais faire de fausse promesse. Étayer chaque chiffre avec une source validée.",
    languages: ["fr", "en"],
    colors: ["#9484FF", "#0A0D14"],
  });

  console.log("3. Inserting product without pricing (evaluating missing pricing)...");
  const [unpricedProduct] = await db
    .insert(brandProducts)
    .values({
      companyId: cid,
      name: "Soravyn Studio Pro",
      category: "SaaS",
      description: "Plateforme de création de campagnes vidéo assistée par agents.",
      pricing: "", // empty pricing!
      valueProposition: "Créez vos vidéos de marque en 15 minutes sans compétence technique.",
      keyFeatures: ["Génération vidéo", "Sous-titrage dynamique", "Direction artistique"],
      targetAudience: "CMO et équipes créatives",
    })
    .returning();

  let memoryContext = await getBrandMemoryContext(db, cid);
  let eval1 = evaluateAndPrepareBrief(memoryContext, {
    name: "Campagne Lancement Pro",
    objectives: "Générer 50 démonstrations qualifiées",
    brief: "Présentation de Soravyn Studio Pro aux directeurs marketing.",
    productId: unpricedProduct.id,
    channels: ["LinkedIn"],
  });

  assert.equal(eval1.status, "incomplete");
  const priceError = eval1.missingInformation.find((m) => m.code === "missing_product_pricing");
  assert.ok(priceError, "Should signal missing pricing for product");
  assert.equal(priceError.severity, "error");
  console.log("   ✓ Missing pricing correctly detected and flagged with error severity.");

  console.log("4. Updating product with pricing & evaluating undefined personas...");
  const [pricedProduct] = await db
    .update(brandProducts)
    .set({ pricing: "990€/mois tout inclus", updatedAt: new Date() })
    .where(eq(brandProducts.id, unpricedProduct.id))
    .returning();

  memoryContext = await getBrandMemoryContext(db, cid);
  let eval2 = evaluateAndPrepareBrief(memoryContext, {
    name: "Campagne Lancement Pro",
    objectives: "Générer 50 démos",
    brief: "Présentation de Soravyn Studio Pro aux équipes.",
    productId: pricedProduct.id,
    channels: ["LinkedIn"],
  });

  assert.equal(eval2.status, "action_required");
  const noPersonaWarning = eval2.missingInformation.find((m) => m.code === "no_personas_defined");
  assert.ok(noPersonaWarning, "Should signal no personas defined in brand memory");
  console.log("   ✓ No personas defined correctly signaled.");

  console.log("5. Inserting personas and evaluating unspecified persona and channel mismatch...");
  const [persona] = await db
    .insert(brandPersonas)
    .values({
      companyId: cid,
      name: "Sarah Directrice Marketing",
      role: "Chief Marketing Officer",
      demographics: "35-50 ans, PME/ETI en croissance",
      painPoints: ["Délais d'agence de 3 semaines", "Coûts de production vidéo exorbitants"],
      goals: ["Multiplier la production de contenu par 4", "Réduire le coût par vidéo"],
      objections: ["L'IA manque d'authenticité et d'émotion humaine"],
      preferredChannels: ["LinkedIn", "YouTube"],
    })
    .returning();

  await db.insert(brandPersonas).values({
    companyId: cid,
    name: "Alexandre Fondateur",
    role: "CEO Startup",
    demographics: "28-40 ans",
    painPoints: ["Pas le temps de faire du marketing"],
    goals: ["Acquérir les 100 premiers clients"],
    preferredChannels: ["Twitter", "LinkedIn"],
  });

  memoryContext = await getBrandMemoryContext(db, cid);
  let evalUnspecified = evaluateAndPrepareBrief(memoryContext, {
    name: "Campagne Neutre",
    objectives: "Générer du trafic",
    brief: "Découvrez notre solution vidéo.",
    productId: pricedProduct.id,
    channels: ["LinkedIn"],
  });
  const unspecifiedWarning = evalUnspecified.missingInformation.find((m) => m.code === "unspecified_persona");
  assert.ok(unspecifiedWarning, "Should flag unspecified persona when personas exist");
  console.log("   ✓ Unspecified persona correctly flagged with available candidates.");

  memoryContext = await getBrandMemoryContext(db, cid);
  let eval3 = evaluateAndPrepareBrief(memoryContext, {
    name: "Campagne TikTok test",
    objectives: "Tester la portée organique",
    brief: "Vidéo courte pour Sarah Directrice Marketing sur Soravyn Studio Pro.",
    productId: pricedProduct.id,
    personaId: persona.id,
    channels: ["TikTok", "Snapchat"], // Mismatch with LinkedIn, YouTube
  });

  const channelMismatch = eval3.missingInformation.find((m) => m.code === "channel_mismatch");
  assert.ok(channelMismatch, "Should flag channel mismatch against persona preferred channels");
  console.log("   ✓ Channel mismatch correctly flagged.");

  console.log("6. Evaluating unverified claims...");
  let eval4 = evaluateAndPrepareBrief(memoryContext, {
    name: "Campagne Chiffres Audacieux",
    objectives: "Attirer l'attention",
    brief: "Avec Soravyn Studio Pro, gagnez 98% de marge brute en 4 jours et touchez 10000 clients.",
    productId: pricedProduct.id,
    personaId: persona.id,
    channels: ["LinkedIn"],
  });

  const claimFinding = eval4.missingInformation.find((m) => m.code === "unverified_claims");
  assert.ok(claimFinding, "Should flag unverified numeric claims");
  assert.ok(claimFinding.message.includes("98%"));
  console.log("   ✓ Unverified numeric claims correctly detected and cited.");

  console.log("7. Adding verified sources and objections with verifiable proofs...");
  await db.insert(brandSources).values({
    companyId: cid,
    title: "Étude d'Impact Marketing 2026",
    kind: "benchmark",
    content: "Sur un échantillon de 120 marques B2B, l'adoption de Soravyn a réduit les coûts de production de 65% et multiplié la cadence par 4x en 30 jours.",
    sourceUrl: "https://soravyn.test/etudes/2026-b2b",
    tags: ["b2b", "performance", "cadence"],
    verified: "verified",
  });

  await db.insert(brandObjections).values({
    companyId: cid,
    productId: pricedProduct.id,
    objection: "L'IA manque d'authenticité et d'émotion humaine",
    category: "product",
    recommendedResponse: "Soravyn applique rigoureusement la charte éditoriale et permet la validation humaine à chaque étape.",
    verifiableProof: "94% des spectateurs n'ont pas fait la différence lors d'un test en double aveugle sur 500 prospects.",
  });

  console.log("8. Evaluating complete and enriched brief (Lot 2 completion criterion)...");
  memoryContext = await getBrandMemoryContext(db, cid);
  const completeEval = evaluateAndPrepareBrief(memoryContext, {
    name: "Campagne Performance B2B Q4",
    objectives: "Convaincre les directions marketing sur LinkedIn",
    brief: "Sarah Directrice Marketing découvre Soravyn Studio Pro : réduisez vos coûts de 65% et atteignez une cadence 4x en 30 jours. Gardez le contrôle absolu avec validation humaine intégrée face aux craintes sur l'authenticité.",
    productId: pricedProduct.id,
    personaId: persona.id,
    channels: ["LinkedIn", "YouTube"],
  });

  assert.equal(completeEval.status, "complete", "Status should be complete when all checks pass");
  assert.equal(completeEval.missingInformation.length, 0, "No missing information should be signaled");
  assert.equal(completeEval.matchedProduct?.name, "Soravyn Studio Pro");
  assert.equal(completeEval.matchedPersona?.name, "Sarah Directrice Marketing");
  assert.ok(completeEval.relevantObjections.length > 0, "Should have linked relevant objections");
  assert.ok(completeEval.relevantSources.length > 0, "Should have linked relevant sources");
  assert.ok(completeEval.recommendedBriefAdditions.length > 0, "Should generate actionable additions for agents");
  console.log("   ✓ Brief preparation fully validated: complete status, matched facts, and actionable agent additions.");

  console.log("9. Verifying client isolation & boundaries...");
  const competitorContext = await getBrandMemoryContext(db, compId);
  assert.equal(competitorContext.products.length, 0, "Competitor must not see client's products");
  assert.equal(competitorContext.personas.length, 0, "Competitor must not see client's personas");
  assert.equal(competitorContext.objections.length, 0, "Competitor must not see client's objections");
  assert.equal(competitorContext.sources.length, 0, "Competitor must not see client's sources");
  console.log("   ✓ Client boundary verified: zero leakage across tenant companies.");

  const proof = {
    lot: "Lot 2 — Mémoire de marque",
    criterion: "Un agent prépare un brief avec les bonnes informations et signale celles qui manquent.",
    passed: true,
    timestamp: new Date().toISOString(),
    testedCompanyId: cid,
    stats: memoryContext.stats,
    checks: [
      "Brand products table with pricing, currency, features, and value proposition",
      "Brand personas table with pain points, goals, objections, and preferred channels",
      "Brand objections table with categories, recommended responses, and verifiable proofs",
      "Brand sources table with kind, content, URL, tags, and verified status",
      "Deterministic brief evaluation detecting missing product pricing (error severity)",
      "Deterministic brief evaluation detecting unstated target persona (warning)",
      "Deterministic brief evaluation detecting channel mismatch vs persona preferences",
      "Deterministic brief evaluation detecting unverified numeric claims",
      "Enriched brief context generation with reconciled facts and agent recommendations",
      "Strict company boundary & multi-tenant isolation verified with zero leakage",
    ],
    sampleEnrichedBrief: completeEval.enrichedBrief,
    sampleAdditions: completeEval.recommendedBriefAdditions,
  };

  await writeFile("doc/verification/brand-memory.json", JSON.stringify(proof, null, 2) + "\n");
  console.log("\nProof successfully written to doc/verification/brand-memory.json:");
  console.log(JSON.stringify(proof, null, 2));
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
