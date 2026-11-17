import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { editorialCalendarItems } from "./editorial_calendar.js";

export const distributionChannels = pgTable(
  "distribution_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    channelType: varchar("channel_type", { length: 50 }).notNull(), // "linkedin" | "youtube" | "tiktok" | "x" | "webhook" | "cms"
    name: varchar("name", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("active"), // "active" | "paused" | "error"
    endpointUrl: text("endpoint_url"),
    authConfig: jsonb("auth_config").$type<Record<string, any>>(),
    headers: jsonb("headers").$type<Record<string, string>>(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_dist_channels_company").on(table.companyId),
    index("idx_dist_channels_type").on(table.channelType),
    index("idx_dist_channels_status").on(table.status),
  ]
);

export const distributionLogs = pgTable(
  "distribution_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    calendarItemId: uuid("calendar_item_id")
      .notNull()
      .references(() => editorialCalendarItems.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id").references(() => distributionChannels.id, {
      onDelete: "set null",
    }),
    channelType: varchar("channel_type", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(), // "pending" | "success" | "failed"
    requestPayload: jsonb("request_payload").$type<Record<string, any>>(),
    responsePayload: jsonb("response_payload").$type<Record<string, any>>(),
    httpStatus: integer("http_status"),
    externalPostId: varchar("external_post_id", { length: 255 }),
    externalPostUrl: varchar("external_post_url", { length: 1000 }),
    errorMessage: text("error_message"),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dispatchedBy: varchar("dispatched_by", { length: 255 }),
  },
  (table) => [
    index("idx_dist_logs_company").on(table.companyId),
    index("idx_dist_logs_item").on(table.calendarItemId),
    index("idx_dist_logs_dispatched").on(table.dispatchedAt),
  ]
);
