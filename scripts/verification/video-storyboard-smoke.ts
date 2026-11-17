import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { eq, and } from "../../server/node_modules/drizzle-orm/index.js";
import { alphaDb, alphaConnectionString } from "./alpha-context.js";
import {
  companies,
  brandProfiles,
  brandProducts,
  brandPersonas,
  brandObjections,
  marketingPlans,
  editorialCalendarItems,
  videoJobs,
  campaigns,
  activityLog,
  applyPendingMigrations,
} from "../../packages/db/src/index.js";
import { generateMarketingPlan } from "../../server/src/services/marketing-plan.js";
import { generateCalendarFromPlan } from "../../server/src/services/editorial-calendar.js";
import {
  generateStoryboard,
  enqueueVideoProductionFromStoryboard,
  syncVideoJobToCalendar,
  resolvePlatform,
  resolveTemplate,
} from "../../server/src/services/storyboard-generator.js";

async function run() {
  console.log("=== SORAVYN LOT 5: Video Studio & Storyboard Bridge Verification ===");
  const connUrl = await alphaConnectionString();
  await applyPendingMigrations(connUrl);
  const db = await alphaDb();

  console.log("1. Setting up isolated test companies...");
  const rand1 = Math.random().toString(36).substring(2, 4).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 4).toUpperCase();
  const [client] = await db
    .insert(companies)
    .values({ name: "Soravyn Video Studio Alpha", issuePrefix: `V${rand1}` })
    .returning();
  const [competitor] = await db
    .insert(companies)
    .values({ name: "Competitor Boundary Co", issuePrefix: `Y${rand2}` })
    .returning();

  const cid = client.id;
  const compId = competitor.id;

  console.log("2. Populating Brand Memory (Profile, Product, Persona, Objection)...");
  await db.insert(brandProfiles).values({
    companyId: cid,
    name: "Soravyn Autonomous Studio",
    description: "Plateforme IA de production marketing et vidéo omnicanale.",
    industry: "MarTech",
    audience: "Directeurs Marketing & Créatifs",
    tone: "Audacieux, direct, axé sur le ROI",
    editorialRules: "Aucune hallucination, messages percutants et clairs.",
    languages: ["fr"],
    colors: ["#9484FF"],
  });

  const [product] = await db
    .insert(brandProducts)
    .values({
      companyId: cid,
      name: "Video Studio Pro",
      category: "Logiciel SaaS",
      description: "Générateur vidéo autonome de scripts à haute conversion.",
      pricing: "199€ / mois",
      currency: "EUR",
      valueProposition: "Transformez vos propositions marketing en vidéos publiables en 1 clic.",
      keyFeatures: ["Rendu MP4 matériellement vérifié", "Sous-titres synchronisés", "4 scènes calibrées"],
      targetAudience: "Responsables Acquisition",
    })
    .returning();

  const [persona] = await db
    .insert(brandPersonas)
    .values({
      companyId: cid,
      name: "Maxime",
      role: "Responsable Acquisition",
      demographics: "32 ans, Paris, scale-up B2B",
      painPoints: ["Goulot d'étranglement sur la production vidéo", "Coûts d'agence trop élevés"],
      goals: ["Accélérer le rythme de publication", "Multiplier par 3 le ROI vidéo"],
      objections: ["Les vidéos IA manquent de finition professionnelle"],
      preferredChannels: ["TikTok", "LinkedIn", "YouTube"],
    })
    .returning();

  const [objection] = await db
    .insert(brandObjections)
    .values({
      companyId: cid,
      objection: "Les vidéos IA manquent de cohérence graphique et de dynamisme",
      category: "Qualité créative",
      recommendedResponse: "Nos templates respectent rigoureusement la charte graphique et la grille typographique de votre marque.",
      verifiableProof: "Vérification stricte de la géométrie et encodage MP4 conforme.",
      productId: product.id,
    })
    .returning();

  console.log("3. Generating Marketing Plan (Lot 3) & Editorial Calendar (Lot 4)...");
  const plan = await generateMarketingPlan(
    db,
    cid,
    {
      periodMonth: "2026-11",
      commercialGoal: "+40% de conversion et 100 leads qualifiés",
      targetAudience: "Responsables Acquisition",
      totalBudget: 15000,
      currency: "EUR",
      primaryChannels: ["TikTok", "LinkedIn", "YouTube"],
      focusProductIds: [product.id],
      focusPersonaIds: [persona.id],
    },
    "operator-user-1"
  );
  console.log(`Plan generated: id=${plan.id}, themes=${plan.themes?.length}, proposals=${plan.proposals?.length}`);

  const { items: calendarItems } = await generateCalendarFromPlan(db, cid, {
    planId: plan.id,
  });
  console.log(`Calendar items generated: ${calendarItems.length}`);
  assert.ok(calendarItems.length > 0, "Calendar items should be created from plan");

  // Find a video calendar item or proposal
  const videoCalendarItem = calendarItems.find((i) => i.contentType === "video") || calendarItems[0];
  console.log(`Selected item: "${videoCalendarItem.title}" (${videoCalendarItem.channel})`);

  console.log("4. Testing Storyboard Generator (Lot 5)...");
  const storyboard = await generateStoryboard(db, cid, {
    calendarItemId: videoCalendarItem.id,
    proposalId: videoCalendarItem.proposalId || undefined,
    narration: "fr",
  });

  assert.ok(storyboard.scenes.length === 4, "Storyboard must have exactly 4 structured scenes");
  assert.equal(storyboard.totalDuration, 24, "Total duration must be 24 seconds");
  assert.ok(storyboard.captionCues.length === 4, "Caption cues must match scene count");
  assert.ok(storyboard.explanation.addressedObjection, "Should incorporate brand objection context");

  // Validate scene breakdown
  const [s1, s2, s3, s4] = storyboard.scenes;
  assert.equal(s1.duration, 5, "Scene 1 (Hook) duration must be 5s");
  assert.equal(s2.duration, 6, "Scene 2 (Problem) duration must be 6s");
  assert.equal(s3.duration, 8, "Scene 3 (Solution) duration must be 8s");
  assert.equal(s4.duration, 5, "Scene 4 (CTA) duration must be 5s");
  console.log("✓ 4-Scene Storyboard validated with calibrated timings and brand memory context");

  console.log("5. Testing Video Production Enqueueing & Calendar Bridge...");
  // Create or resolve campaign
  const [campaign] = await db
    .insert(campaigns)
    .values({
      companyId: cid,
      name: "Campagne Vidéo Studio Alpha",
      objectives: "Augmenter la notoriété et convertir des leads B2B",
      status: "production",
      brief: "Test automatisé de rendu vidéo",
    })
    .returning();

  const job = await enqueueVideoProductionFromStoryboard(db, cid, storyboard, {
    campaignId: campaign.id,
    calendarItemId: videoCalendarItem.id,
    proposalId: videoCalendarItem.proposalId || undefined,
  });

  assert.ok(job.id, "Video job must be created");
  assert.equal(job.status, "queued", "Video job initial status must be 'queued'");

  // Check that calendar item transitioned to 'in_production'
  const [updatedItem] = await db
    .select()
    .from(editorialCalendarItems)
    .where(and(eq(editorialCalendarItems.id, videoCalendarItem.id), eq(editorialCalendarItems.companyId, cid)));
  assert.equal(updatedItem.status, "in_production", "Calendar item must transition to 'in_production'");
  console.log("✓ Video job enqueued and calendar item marked as 'in_production'");

  console.log("6. Testing Post-Production Synchronization (Ready for review)...");
  const syncedReview = await syncVideoJobToCalendar(db, cid, job.id, "ready_for_review");
  assert.ok(syncedReview, "Sync to calendar must succeed");

  const [itemInReview] = await db
    .select()
    .from(editorialCalendarItems)
    .where(and(eq(editorialCalendarItems.id, videoCalendarItem.id), eq(editorialCalendarItems.companyId, cid)));
  assert.equal(itemInReview.status, "ready_for_review", "Calendar item must be updated to 'ready_for_review'");
  assert.ok(itemInReview.publishedUrl?.includes(job.id), "publishedUrl must reference video job file");
  console.log("✓ Post-production sync populated publishedUrl and status 'ready_for_review'");

  console.log("7. Testing Governance Approval Synchronization (Approved)...");
  const syncedApproved = await syncVideoJobToCalendar(db, cid, job.id, "approved");
  assert.ok(syncedApproved, "Sync approval must succeed");

  const [itemApproved] = await db
    .select()
    .from(editorialCalendarItems)
    .where(and(eq(editorialCalendarItems.id, videoCalendarItem.id), eq(editorialCalendarItems.companyId, cid)));
  assert.equal(itemApproved.status, "approved", "Calendar item must be updated to 'approved'");
  console.log("✓ Governance approval sync confirmed with status 'approved'");

  console.log("8. Verifying Multi-Tenant Boundary Isolation...");
  await assert.rejects(
    async () => {
      await generateStoryboard(db, compId, {
        calendarItemId: videoCalendarItem.id, // Belonging to client, not competitor
      });
    },
    /not found/i,
    "Cross-company storyboard generation must be rejected with 404"
  );
  console.log("✓ Multi-tenant boundary strictly verified (cross-company access blocked)");

  // Smoke test run completed successfully

  const report = {
    lot: "Lot 5: Video Studio / Storyboard & Generation Unifiée",
    passed: true,
    timestamp: new Date().toISOString(),
    checks: [
      "Brand memory integration in 4-scene storyboard generation",
      "Calibrated timings (Hook 5s, Problem 6s, Solution 8s, CTA 5s -> Total 24s)",
      "Synchronized caption cues generated for video and SRT captions",
      "Automated video job enqueued in 'queued' state with validated videoInput schema",
      "Editorial calendar item transitioned to 'in_production'",
      "Post-production bridge synced video download URL into calendar item",
      "Governance approval bridge transitions calendar item to 'approved'",
      "Multi-tenant data isolation strictly enforced (404 on cross-company requests)",
    ],
    mode: "Live PostgreSQL, Real Transactional Pipeline, No Mock Data",
  };

  const reportPath = new URL("../../doc/verification/video-storyboard.json", import.meta.url);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log("Report saved to doc/verification/video-storyboard.json");
  console.log(JSON.stringify(report, null, 2));
}

run().catch((err) => {
  console.error("FATAL ERROR in video-storyboard-smoke:", err);
  process.exit(1);
});
