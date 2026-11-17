import { and, eq } from "drizzle-orm";
import {
  type Db,
  companies,
  campaigns,
  brandProfiles,
  videoJobs,
  marketingPlanProposals,
  marketingPlans,
  editorialCalendarItems,
} from "@soravyn/db";
import {
  type GeneratedStoryboard,
  type GenerateStoryboardInput,
  type StoryboardScene,
  type StoryboardCaptionCue,
} from "@soravyn/shared";
import { notFound, unprocessable } from "../errors.js";
import { getBrandMemoryContext } from "./brand-memory.js";
import { videoInput } from "./video-contract.js";

/**
 * Maps channel or marketing format string to a valid Video Studio platform.
 */
export function resolvePlatform(
  format?: string | null,
  channel?: string | null,
  fallback: "tiktok" | "reels" | "shorts" | "youtube" | "square" = "tiktok"
): "tiktok" | "reels" | "shorts" | "youtube" | "square" {
  const norm = `${format || ""} ${channel || ""}`.toLowerCase();
  if (norm.includes("shorts")) {
    return "shorts";
  }
  if (norm.includes("reels") || norm.includes("instagram")) {
    return "reels";
  }
  if (norm.includes("tiktok") || norm.includes("9:16") || norm.includes("vertical")) {
    return "tiktok";
  }
  if (norm.includes("square") || norm.includes("carrousel") || norm.includes("linkedin") || norm.includes("facebook")) {
    return "square";
  }
  if (norm.includes("16:9") || norm.includes("youtube") || norm.includes("paysage")) {
    return "youtube";
  }
  return fallback;
}

/**
 * Resolves the most suitable layout template.
 */
export function resolveTemplate(
  angle?: string | null,
  format?: string | null,
  fallback: "editorial" | "product" | "launch" = "editorial"
): "editorial" | "product" | "launch" {
  const norm = `${angle || ""} ${format || ""}`.toLowerCase();
  if (norm.includes("démo") || norm.includes("demo") || norm.includes("produit") || norm.includes("feature")) {
    return "product";
  }
  if (norm.includes("lancement") || norm.includes("launch") || norm.includes("nouveauté") || norm.includes("hook")) {
    return "launch";
  }
  return fallback;
}

/**
 * Generates an automated, highly structured 4-scene video storyboard
 * leveraging the Brand Memory (personas, products, objections) and the Marketing Proposal.
 */
export async function generateStoryboard(
  db: Db,
  companyId: string,
  input: GenerateStoryboardInput
): Promise<GeneratedStoryboard> {
  // 1. Verify company exists
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId));
  if (!company) throw notFound("Company not found");

  // 2. Fetch Brand Memory context & Profile
  const memoryContext = await getBrandMemoryContext(db, companyId);
  const brand = (memoryContext.profile as any) || null;

  let proposal: any = null;
  let calendarItem: any = null;
  let campaign: any = null;

  // 3. Resolve context from proposal, calendar item, or campaign
  if (input.proposalId) {
    const [p] = await db
      .select()
      .from(marketingPlanProposals)
      .where(
        and(
          eq(marketingPlanProposals.id, input.proposalId),
          eq(marketingPlanProposals.companyId, companyId)
        )
      );
    if (!p) throw notFound("Marketing plan proposal not found");
    proposal = p;
  }

  if (input.calendarItemId) {
    const [cItem] = await db
      .select()
      .from(editorialCalendarItems)
      .where(
        and(
          eq(editorialCalendarItems.id, input.calendarItemId),
          eq(editorialCalendarItems.companyId, companyId)
        )
      );
    if (!cItem) throw notFound("Editorial calendar item not found");
    calendarItem = cItem;

    if (!proposal && calendarItem.proposalId) {
      const [p] = await db
        .select()
        .from(marketingPlanProposals)
        .where(
          and(
            eq(marketingPlanProposals.id, calendarItem.proposalId),
            eq(marketingPlanProposals.companyId, companyId)
          )
        );
      if (p) proposal = p;
    }
  }

  const campaignId = input.campaignId || proposal?.campaignId || calendarItem?.campaignId;
  if (campaignId) {
    const [camp] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId)));
    if (camp) campaign = camp;
  }

  // 4. Extract key content drivers
  const title = proposal?.title || calendarItem?.title || campaign?.name || "Vidéo Stratégique";
  const hook = proposal?.hook || campaign?.brief || "Découvrez une nouvelle façon d'atteindre vos objectifs.";
  const angle = proposal?.angle || "Optimisation et performance";
  const cta = proposal?.call_to_action || "En savoir plus et réserver une démonstration";
  const targetAudience = proposal?.targetAudience || calendarItem?.targetAudience || campaign?.audience || "Professionnels";

  // Match closest persona from brand memory
  const matchedPersona = memoryContext.personas.find(p =>
    targetAudience.toLowerCase().includes(p.name.toLowerCase()) ||
    targetAudience.toLowerCase().includes(p.role.toLowerCase())
  ) || memoryContext.personas[0];

  // Match closest product
  const matchedProduct = memoryContext.products[0];

  // Match closest objection
  const matchedObjection = memoryContext.objections[0];

  // 5. Platform and template
  const platform = input.platform || resolvePlatform(proposal?.format, proposal?.channel || calendarItem?.channel);
  const template = input.template || resolveTemplate(angle, proposal?.format);
  const narration = input.narration || (brand?.languages?.includes("en") ? "en" : "fr");

  // 6. Synthesize the 4-scene narrative arc
  // Scene 1: Hook (5s)
  const scene1: StoryboardScene = {
    title: hook.length > 70 ? `${hook.slice(0, 67)}...` : hook,
    text: `Pourquoi ${targetAudience} réinventent leur stratégie en 2026.`,
    speech: `${hook} Voici la clé pour franchir un cap.`,
    duration: 5,
  };

  // Scene 2: Problem / Agitation (6s)
  const scene2Title = matchedObjection
    ? `Obstacle : ${matchedObjection.objection.slice(0, 60)}`
    : "La friction du quotidien";
  const scene2Speech = matchedObjection
    ? `Face à ce défi : ${matchedObjection.recommendedResponse}`
    : `Les méthodes manuelles ralentissent la croissance et dispersent les efforts de vos équipes.`;

  const scene2: StoryboardScene = {
    title: scene2Title,
    text: "Les méthodes traditionnelles atteignent aujourd'hui leurs limites.",
    speech: scene2Speech.slice(0, 250),
    duration: 6,
  };

  // Scene 3: Solution & Value Proposition (8s)
  const scene3Title = matchedProduct
    ? `${brand?.name || "SORAVYN"} : ${matchedProduct.name}`
    : `${brand?.name || "SORAVYN"} en action`;
  const scene3Speech = matchedProduct
    ? `Avec ${matchedProduct.name}, profitez de : ${matchedProduct.valueProposition}. Une solution validée et clé en main.`
    : `Grâce à notre plateforme intégrée, coordonnez vos campagnes avec une efficacité décuplée.`;

  const scene3: StoryboardScene = {
    title: scene3Title.slice(0, 80),
    text: matchedProduct?.valueProposition?.slice(0, 200) || "Une exécution autonome et fluide pour vos contenus.",
    speech: scene3Speech.slice(0, 250),
    duration: 8,
  };

  // Scene 4: Call to Action (5s)
  const scene4: StoryboardScene = {
    title: "Passez à l'action",
    text: cta.slice(0, 200),
    speech: `${cta}. Rejoignez la nouvelle ère dès aujourd'hui.`,
    duration: 5,
  };

  const scenes = [scene1, scene2, scene3, scene4];
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0); // 24 seconds

  // 7. Compute synchronized caption cues
  let currentMs = 0;
  const captionCues: StoryboardCaptionCue[] = scenes.map(scene => {
    const startMs = currentMs;
    const endMs = currentMs + scene.duration * 1000;
    currentMs = endMs;
    return {
      startMs,
      endMs,
      text: scene.speech || scene.text,
    };
  });

  return {
    title,
    platform,
    template,
    narration,
    scenes,
    captionCues,
    totalDuration,
    explanation: {
      hookRationale: `Accroche dynamique adaptée au canal ${platform} et au format ${template}.`,
      targetPersonaName: matchedPersona?.name,
      addressedObjection: matchedObjection?.objection,
      highlightedProduct: matchedProduct?.name,
    },
  };
}

/**
 * Enqueues a video production job directly from a generated storyboard,
 * linking it to the campaign and updating any associated editorial calendar item.
 */
export async function enqueueVideoProductionFromStoryboard(
  db: Db,
  companyId: string,
  storyboard: GeneratedStoryboard,
  context: {
    campaignId: string;
    proposalId?: string;
    calendarItemId?: string;
  }
) {
  // Validate with videoInput schema
  const payload = videoInput.parse({
    platform: storyboard.platform,
    template: storyboard.template,
    narration: storyboard.narration,
    scenes: storyboard.scenes,
    captionCues: storyboard.captionCues,
    normalizeAudio: true,
    voiceSpeed: 145,
    voicePitch: 50,
  });

  // Fetch brand profile
  const [brand] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.companyId, companyId));

  // Fetch campaign name
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, context.campaignId), eq(campaigns.companyId, companyId)));
  if (!campaign) throw notFound("Campaign not found");

  // Insert into videoJobs
  const [job] = await db
    .insert(videoJobs)
    .values({
      companyId,
      campaignId: context.campaignId,
      status: "queued",
      input: {
        ...payload,
        campaignName: campaign.name,
        brand: brand
          ? {
              name: brand.name,
              colors: brand.colors,
              fontFamily: brand.fontFamily,
              logoAssetId: brand.logoAssetId,
              logoLicense: brand.logoLicense,
            }
          : { name: "SORAVYN", colors: ["#9484FF"] },
        proposalId: context.proposalId,
        calendarItemId: context.calendarItemId,
      },
      events: [
        {
          stage: "queued",
          at: new Date().toISOString(),
        },
      ],
    })
    .returning();

  // If a calendar item is linked, update its status to 'in_production'
  if (context.calendarItemId) {
    await db
      .update(editorialCalendarItems)
      .set({
        status: "in_production",
        campaignId: context.campaignId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(editorialCalendarItems.id, context.calendarItemId),
          eq(editorialCalendarItems.companyId, companyId)
        )
      );
  } else if (context.proposalId) {
    // If proposalId is known, look up calendar item linked to proposal
    await db
      .update(editorialCalendarItems)
      .set({
        status: "in_production",
        campaignId: context.campaignId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(editorialCalendarItems.proposalId, context.proposalId),
          eq(editorialCalendarItems.companyId, companyId)
        )
      );
  }

  return job;
}

/**
 * Synchronizes a completed/approved video job to any matching editorial calendar items.
 */
export async function syncVideoJobToCalendar(
  db: Db,
  companyId: string,
  jobId: string,
  targetStatus: "ready_for_review" | "approved" = "ready_for_review"
) {
  const [job] = await db
    .select()
    .from(videoJobs)
    .where(and(eq(videoJobs.id, jobId), eq(videoJobs.companyId, companyId)));
  if (!job) return false;

  const input = job.input as any;
  const calendarItemId = input?.calendarItemId;
  const proposalId = input?.proposalId;

  const videoDownloadUrl = `/api/companies/${companyId}/video/jobs/${job.id}/files/output.mp4`;

  if (calendarItemId) {
    await db
      .update(editorialCalendarItems)
      .set({
        status: targetStatus,
        publishedUrl: videoDownloadUrl,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(editorialCalendarItems.id, calendarItemId),
          eq(editorialCalendarItems.companyId, companyId)
        )
      );
    return true;
  }

  if (proposalId) {
    await db
      .update(editorialCalendarItems)
      .set({
        status: targetStatus,
        publishedUrl: videoDownloadUrl,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(editorialCalendarItems.proposalId, proposalId),
          eq(editorialCalendarItems.companyId, companyId)
        )
      );
    return true;
  }

  return false;
}
