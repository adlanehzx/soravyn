export type BrandProduct = {
  id: string;
  companyId: string;
  name: string;
  category: string;
  description: string;
  pricing: string;
  currency: string;
  valueProposition: string;
  keyFeatures: string[];
  targetAudience: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type BrandPersona = {
  id: string;
  companyId: string;
  name: string;
  role: string;
  demographics: string;
  painPoints: string[];
  goals: string[];
  objections: string[];
  preferredChannels: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type BrandObjection = {
  id: string;
  companyId: string;
  objection: string;
  category: string;
  recommendedResponse: string;
  verifiableProof: string;
  productId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type BrandSource = {
  id: string;
  companyId: string;
  title: string;
  kind: string;
  content: string;
  sourceUrl: string;
  tags: string[];
  verified: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type MissingInformationFinding = {
  code: string;
  field: string;
  severity: "warning" | "error";
  message: string;
  recommendation: string;
};

export type BriefPreparationResult = {
  version: "deterministic-v1";
  status: "complete" | "incomplete" | "action_required";
  enrichedBrief: {
    campaignName: string;
    objectives: string;
    briefContent: string;
    channels: string[];
    brandTone: string;
    editorialRules: string;
  };
  matchedProduct: BrandProduct | null;
  matchedPersona: BrandPersona | null;
  relevantObjections: BrandObjection[];
  relevantSources: BrandSource[];
  missingInformation: MissingInformationFinding[];
  recommendedBriefAdditions: string[];
};

export type BrandMemoryContext = {
  profile: unknown;
  products: BrandProduct[];
  personas: BrandPersona[];
  objections: BrandObjection[];
  sources: BrandSource[];
  stats: {
    productCount: number;
    personaCount: number;
    objectionCount: number;
    sourceCount: number;
  };
};
