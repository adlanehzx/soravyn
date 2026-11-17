export type MarketingPlanStatus = "draft" | "pending_validation" | "approved" | "rejected" | "active" | "completed";
export type ProposalStatus = "suggested" | "accepted" | "converted" | "dismissed";

export type MarketingPlan = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  periodMonth: string;
  commercialGoal: string;
  targetAudience: string;
  totalBudget: number;
  currency: string;
  priorities: string[];
  primaryChannels: string[];
  status: MarketingPlanStatus;
  approvalId: string | null;
  rejectionReason: string | null;
  kpiTargets: Record<string, string | number>;
  createdByUserId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type MarketingPlanTheme = {
  id: string;
  planId: string;
  companyId: string;
  weekNumber: number;
  title: string;
  description: string;
  focusPersonaId: string | null;
  focusProductId: string | null;
  allocatedBudget: number;
  targetKpi: string;
  orderIndex: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type MarketingPlanProposal = {
  id: string;
  planId: string;
  themeId: string | null;
  companyId: string;
  title: string;
  channel: string;
  format: string;
  angle: string;
  hook: string;
  callToAction: string;
  estimatedCost: number;
  targetAudience: string;
  campaignId: string | null;
  status: ProposalStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type MarketingPlanWithDetails = MarketingPlan & {
  themes: MarketingPlanTheme[];
  proposals: MarketingPlanProposal[];
  allocatedBudgetSum: number;
  remainingBudget: number;
  approval?: {
    id: string;
    status: string;
    decisionNote?: string | null;
  } | null;
};

export type GenerateMarketingPlanInput = {
  periodMonth: string;
  commercialGoal: string;
  targetAudience?: string;
  totalBudget: number;
  currency?: string;
  priorities?: string[];
  primaryChannels?: string[];
  focusProductIds?: string[];
  focusPersonaIds?: string[];
};

export type MarketingPlanSummary = {
  id: string;
  title: string;
  periodMonth: string;
  commercialGoal: string;
  totalBudget: number;
  currency: string;
  status: MarketingPlanStatus;
  themesCount: number;
  proposalsCount: number;
  convertedCampaignsCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};
