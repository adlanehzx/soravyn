export interface PerformanceMetricInput {
  calendarItemId?: string;
  externalPostId?: string;
  channel: string;
  impressions: number;
  views?: number;
  clicks?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  conversions?: number;
  spendCents?: number;
  revenueCents?: number;
  recordedAt?: string;
}

export interface ContentPerformanceMetric {
  id: string;
  companyId: string;
  calendarItemId?: string | null;
  externalPostId?: string | null;
  channel: string;
  impressions: number;
  views: number;
  clicks: number;
  likes: number;
  shares: number;
  comments: number;
  conversions: number;
  spendCents: number;
  revenueCents: number;
  engagementRate: number; // calculated percentage e.g. 4.2
  roiPercent?: number | null;
  recordedAt: string;
  createdAt: string;
}

export interface AnalyticsOverview {
  totalImpressions: number;
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
  totalSpendCents: number;
  totalRevenueCents: number;
  averageEngagementRate: number;
  topPerformingChannel: string;
  channelBreakdown: Array<{
    channel: string;
    impressions: number;
    clicks: number;
    engagementRate: number;
  }>;
}

export interface StrategicInsight {
  id: string;
  companyId: string;
  category: "persona" | "channel" | "format" | "angle";
  title: string;
  observation: string;
  recommendation: string;
  confidenceScore: number; // 0.0 - 1.0
  impactLevel: "high" | "medium" | "low";
  appliedToBrandMemory: boolean;
  createdAt: string;
}

export interface FeedbackLoopResult {
  insightsGenerated: number;
  brandMemoryUpdated: boolean;
  insights: StrategicInsight[];
}
