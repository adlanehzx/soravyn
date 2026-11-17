import { describe, it, expect } from "vitest";
import {
  generateMarketingPlanInputSchema,
  marketingPlanInputSchema,
  marketingPlanThemeInputSchema,
  marketingPlanProposalInputSchema,
  type MarketingPlanWithDetails,
} from "@soravyn/shared";

describe("Marketing Plan Contracts & Domain Logic", () => {
  it("validates generate marketing plan inputs with constraints", () => {
    // Valid input
    const valid = generateMarketingPlanInputSchema.safeParse({
      periodMonth: "2026-11",
      commercialGoal: "+30% démos qualifiées et 50k€ ARR",
      totalBudget: 10000,
      currency: "EUR",
      priorities: ["Acquisition B2B", "Notoriété"],
      primaryChannels: ["LinkedIn", "YouTube"],
    });
    expect(valid.success).toBe(true);

    // Negative budget rejected
    const invalidBudget = generateMarketingPlanInputSchema.safeParse({
      periodMonth: "2026-11",
      commercialGoal: "Objectif valide",
      totalBudget: -500,
    });
    expect(invalidBudget.success).toBe(false);

    // Empty commercial goal rejected
    const emptyGoal = generateMarketingPlanInputSchema.safeParse({
      periodMonth: "2026-11",
      commercialGoal: "123", // under min 5 chars
      totalBudget: 1000,
    });
    expect(emptyGoal.success).toBe(false);
  });

  it("validates weekly theme schema constraints", () => {
    const validTheme = marketingPlanThemeInputSchema.safeParse({
      weekNumber: 2,
      title: "Semaine 2 : Démonstration de valeur",
      description: "Focus sur la proposition différentiatrice",
      allocatedBudget: 2500,
      targetKpi: "500 clics qualifiés",
      orderIndex: 1,
    });
    expect(validTheme.success).toBe(true);

    // Week number out of bounds
    const invalidWeek = marketingPlanThemeInputSchema.safeParse({
      weekNumber: 0,
      title: "Semaine invalide",
    });
    expect(invalidWeek.success).toBe(false);
  });

  it("validates campaign proposal schema and status enum", () => {
    const validProposal = marketingPlanProposalInputSchema.safeParse({
      title: "Vidéo Démo Produit 60s",
      channel: "YouTube",
      format: "Video 16:9",
      angle: "Preuve par la vitesse d'exécution",
      hook: "Pourquoi perdre 10h par semaine ?",
      callToAction: "Réservez votre démo",
      estimatedCost: 1500,
      status: "suggested",
    });
    expect(validProposal.success).toBe(true);

    // Unknown status rejected
    const invalidStatus = marketingPlanProposalInputSchema.safeParse({
      title: "Vidéo Test",
      channel: "YouTube",
      format: "Video",
      status: "non_existent_status",
    });
    expect(invalidStatus.success).toBe(false);
  });

  it("ensures remaining budget calculation matches total minus theme allocations", () => {
    const mockPlan: MarketingPlanWithDetails = {
      id: "11111111-1111-4111-8111-111111111111",
      companyId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      title: "Plan Test",
      description: "Test",
      periodMonth: "2026-11",
      commercialGoal: "50k ARR",
      targetAudience: "B2B SaaS",
      totalBudget: 10000,
      currency: "EUR",
      priorities: ["Growth"],
      primaryChannels: ["LinkedIn"],
      status: "draft",
      approvalId: null,
      rejectionReason: null,
      kpiTargets: {},
      createdByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      themes: [
        {
          id: "t1",
          planId: "11111111-1111-4111-8111-111111111111",
          companyId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
          weekNumber: 1,
          title: "S1",
          description: "",
          focusPersonaId: null,
          focusProductId: null,
          allocatedBudget: 3000,
          targetKpi: "",
          orderIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "t2",
          planId: "11111111-1111-4111-8111-111111111111",
          companyId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
          weekNumber: 2,
          title: "S2",
          description: "",
          focusPersonaId: null,
          focusProductId: null,
          allocatedBudget: 4000,
          targetKpi: "",
          orderIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      proposals: [],
      allocatedBudgetSum: 7000,
      remainingBudget: 3000,
      approval: null,
    };

    expect(mockPlan.allocatedBudgetSum).toBe(7000);
    expect(mockPlan.remainingBudget).toBe(3000);
    expect(mockPlan.allocatedBudgetSum + mockPlan.remainingBudget).toBe(mockPlan.totalBudget);
  });
});
