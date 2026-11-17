export type DistributionChannelType =
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "x"
  | "webhook"
  | "cms";

export type DistributionChannelStatus = "active" | "paused" | "error";

export interface DistributionChannel {
  id: string;
  companyId: string;
  channelType: DistributionChannelType;
  name: string;
  status: DistributionChannelStatus;
  endpointUrl?: string | null;
  authConfig?: Record<string, any> | null;
  headers?: Record<string, string> | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DistributionLogStatus = "pending" | "success" | "failed";

export interface DistributionLog {
  id: string;
  companyId: string;
  calendarItemId: string;
  channelId?: string | null;
  channelType: string;
  status: DistributionLogStatus;
  requestPayload?: Record<string, any> | null;
  responsePayload?: Record<string, any> | null;
  httpStatus?: number | null;
  externalPostId?: string | null;
  externalPostUrl?: string | null;
  errorMessage?: string | null;
  dispatchedAt: string;
  dispatchedBy?: string | null;
}

export interface PublishItemInput {
  channelId?: string;
  scheduledAt?: string;
  customCopy?: string;
  tags?: string[];
}

export interface PublishItemResult {
  calendarItemId: string;
  channelType: string;
  status: DistributionLogStatus;
  externalPostId?: string;
  externalPostUrl: string;
  dispatchedAt: string;
  logId: string;
}
