import { describe, it, expect } from "vitest";
import { evaluateAndPrepareBrief } from "../services/brand-memory.js";
import type { BrandMemoryContext, PrepareBriefInput } from "@soravyn/shared";

describe("Brand Memory Brief Evaluation & Gap Analysis", () => {
  const sampleContext: BrandMemoryContext = {
    profile: {
      name: "Acme SaaS",
      tone: "Audacieux, expert et empathique",
      editorialRules: "Tutoiement exclu, phrases percutantes, pas de jargon creux.",
    },
    products: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        companyId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        name: "Acme Growth Suite",
        category: "Logiciel B2B",
        description: "Plateforme d'automatisation marketing multicanal.",
        pricing: "490€/mois sans engagement",
        currency: "EUR",
        valueProposition: "Générez 3x plus de leads qualifiés en 30 jours.",
        keyFeatures: ["CRM intégré", "Génération IA", "Campagnes omnicanales"],
        targetAudience: "PME et agences marketing",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        companyId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        name: "Acme Enterprise",
        category: "Enterprise",
        description: "Déploiement dédié sur infrastructure privée.",
        pricing: "", // Missing pricing!
        currency: "EUR",
        valueProposition: "",
        keyFeatures: ["Single Sign-On", "SLA 99.9%"],
        targetAudience: "Grands comptes",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    personas: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        companyId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        name: "Thomas le Responsable Acquisition",
        role: "Head of Growth",
        demographics: "30-45 ans, échelle PME 50-200 salariés",
        painPoints: ["Temps passé sur le montage", "CAC en hausse continue"],
        goals: ["Doubler les leads sans recruter", "Accélérer la cadence"],
        objections: ["Trop complexe à configurer", "Peur des coûts cachés"],
        preferredChannels: ["LinkedIn", "YouTube"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    objections: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        companyId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        objection: "Trop complexe à configurer",
        category: "technical",
        recommendedResponse: "Prise en main en 15 minutes chrono sans code.",
        verifiableProof: "Temps moyen de premier déploiement mesuré à 14 minutes sur 250 clients.",
        productId: "11111111-1111-4111-8111-111111111111",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    sources: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        companyId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        title: "Rapport d'impact client 2026",
        kind: "case_study",
        content: "Étude vérifiée sur 250 clients : augmentation moyenne de 3x des leads en 30 jours, 14 minutes de configuration.",
        sourceUrl: "https://acme.test/proofs/2026",
        tags: ["leads", "temps", "statistiques"],
        verified: "verified",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    stats: { productCount: 2, personaCount: 1, objectionCount: 1, sourceCount: 1 },
  };

  it("signals missing pricing when targeted product has no price", () => {
    const input: PrepareBriefInput = {
      name: "Campagne Enterprise Q4",
      objectives: "Signer 10 grands comptes",
      brief: "Nous promouvons Acme Enterprise pour les grandes entreprises.",
      productId: "22222222-2222-4222-8222-222222222222",
      channels: ["LinkedIn"],
    };

    const result = evaluateAndPrepareBrief(sampleContext, input);
    expect(result.status).toBe("incomplete");
    const pricingError = result.missingInformation.find((m) => m.code === "missing_product_pricing");
    expect(pricingError).toBeDefined();
    expect(pricingError?.severity).toBe("error");
    expect(pricingError?.message).toContain("n'a aucun prix ni modèle tarifaire");
  });

  it("signals unverified claims when numbers are not in verified sources", () => {
    const input: PrepareBriefInput = {
      name: "Campagne Chiffres non vérifiés",
      objectives: "Attirer du trafic",
      brief: "Découvrez Acme Growth Suite et gagnez 95% de marge en 3 jours avec 5000 clients.",
      productId: "11111111-1111-4111-8111-111111111111",
      personaId: "33333333-3333-4333-8333-333333333333",
      channels: ["LinkedIn"],
    };

    const result = evaluateAndPrepareBrief(sampleContext, input);
    const unverified = result.missingInformation.find((m) => m.code === "unverified_claims");
    expect(unverified).toBeDefined();
    expect(unverified?.message).toContain("95%");
  });

  it("signals channel mismatch when persona preferred channels differ from selected channels", () => {
    const input: PrepareBriefInput = {
      name: "Campagne TikTok",
      objectives: "Tester un nouveau format",
      brief: "Vidéo courte pour Thomas le Responsable Acquisition sur Acme Growth Suite.",
      personaId: "33333333-3333-4333-8333-333333333333",
      productId: "11111111-1111-4111-8111-111111111111",
      channels: ["TikTok", "Instagram"], // Persona prefers LinkedIn, YouTube
    };

    const result = evaluateAndPrepareBrief(sampleContext, input);
    const mismatch = result.missingInformation.find((m) => m.code === "channel_mismatch");
    expect(mismatch).toBeDefined();
    expect(mismatch?.message).toContain("LinkedIn, YouTube");
  });

  it("generates an enriched brief with verified additions when all required brand info is provided", () => {
    const input: PrepareBriefInput = {
      name: "Campagne LeadGen PME",
      objectives: "Démontrer l'accélération des leads sans complexité de configuration",
      brief: "Présenter Acme Growth Suite à Thomas le Responsable Acquisition : triplez vos leads (3x) en 30 jours, sans code ni complexité.",
      productId: "11111111-1111-4111-8111-111111111111",
      personaId: "33333333-3333-4333-8333-333333333333",
      channels: ["LinkedIn", "YouTube"],
    };

    const result = evaluateAndPrepareBrief(sampleContext, input);
    expect(result.matchedProduct?.name).toBe("Acme Growth Suite");
    expect(result.matchedPersona?.name).toBe("Thomas le Responsable Acquisition");
    expect(result.relevantObjections.length).toBeGreaterThanOrEqual(1);
    expect(result.relevantSources.length).toBeGreaterThanOrEqual(1);
    expect(result.recommendedBriefAdditions.length).toBeGreaterThan(0);
    // No error severity
    expect(result.missingInformation.filter((m) => m.severity === "error")).toHaveLength(0);
  });
});
