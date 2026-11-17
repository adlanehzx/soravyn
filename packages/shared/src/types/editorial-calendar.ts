export type EditorialContentType =
  | "video"
  | "social_post"
  | "email"
  | "article";

export type EditorialStatus =
  | "draft"
  | "scheduled"
  | "in_production"
  | "ready_for_review"
  | "approved"
  | "published"
  | "cancelled";

export interface EditorialCalendarItem {
  id: string;
  companyId: string;
  planId: string | null;
  themeId: string | null;
  proposalId: string | null;
  campaignId: string | null;
  title: string;
  contentType: EditorialContentType;
  channel: string;
  scheduledAt: Date;
  status: EditorialStatus;
  contentBrief: string | null;
  copyText: string | null;
  targetAudience: string | null;
  assignedAgentId: string | null;
  assignedUserId: string | null;
  publishedUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditorialCalendarItemInput {
  title: string;
  contentType: EditorialContentType;
  channel: string;
  scheduledAt: string; // ISO date-time string
  status?: EditorialStatus;
  contentBrief?: string;
  copyText?: string;
  targetAudience?: string;
  planId?: string | null;
  themeId?: string | null;
  proposalId?: string | null;
  campaignId?: string | null;
  assignedAgentId?: string | null;
  assignedUserId?: string | null;
  publishedUrl?: string | null;
}

export interface EditorialCalendarItemUpdate {
  title?: string;
  contentType?: EditorialContentType;
  channel?: string;
  scheduledAt?: string;
  status?: EditorialStatus;
  contentBrief?: string;
  copyText?: string;
  targetAudience?: string;
  assignedAgentId?: string | null;
  assignedUserId?: string | null;
  publishedUrl?: string | null;
}

export interface GenerateCalendarFromPlanInput {
  planId: string;
  startDate?: string; // YYYY-MM-DD, defaults to first Monday of the plan's month
  preferredPostTimes?: Record<string, string>; // e.g. { "LinkedIn": "09:00", "YouTube": "18:00" }
}

export interface EditorialCalendarFilter {
  periodMonth?: string; // YYYY-MM
  startDate?: string;
  endDate?: string;
  contentType?: EditorialContentType;
  channel?: string;
  status?: EditorialStatus;
  planId?: string;
}

export interface EditorialCalendarStats {
  totalItems: number;
  byStatus: Record<EditorialStatus, number>;
  byType: Record<EditorialContentType, number>;
  byChannel: Record<string, number>;
}
