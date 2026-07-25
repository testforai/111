import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const credentials = sqliteTable("credentials", {
  userEmail: text("user_email").primaryKey(),
  host: text("host").notNull().default("https://openapi.lingxing.com"),
  appId: text("app_id").notNull(),
  encryptedSecret: text("encrypted_secret").notNull(),
  updatedAt: integer("updated_at").notNull()
});
export const tokens = sqliteTable("tokens", {
  userEmail: text("user_email").primaryKey(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  expiresAt: integer("expires_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});
export const apiCallLogs = sqliteTable("api_call_logs", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  endpointId: text("endpoint_id").notNull(),
  module: text("module").notNull(),
  route: text("route").notNull(),
  method: text("method").notNull(),
  requestSummary: text("request_summary").notNull(),
  responseCode: text("response_code"),
  status: text("status").notNull(),
  durationMs: integer("duration_ms").notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at").notNull()
});
