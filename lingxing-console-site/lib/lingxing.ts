import CryptoJS from "crypto-js";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { apiCallLogs, credentials, tokens } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/secret";
import { redact } from "@/lib/redact";

export type EndpointDefinition = {
  id: string;
  module: string;
  moduleName: string;
  name: string;
  title: string;
  method: "GET" | "POST";
  route: string;
  risk: "read" | "review" | "write";
  riskText: string;
  params: Array<{ name: string; type: string; required: boolean; default: unknown; description: string }>;
};

const OFFICIAL_HOST = "https://openapi.lingxing.com";
const TOKEN_MARGIN_MS = 5 * 60 * 1000;

function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stable(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function canonical(params: Record<string, unknown>) {
  return Object.keys(params).sort().flatMap((key) => {
    const value = params[key];
    if (value === "") return [];
    const encoded = value && typeof value === "object"
      ? stable(value)
      : typeof value === "boolean"
        ? String(value).toLowerCase()
        : String(value);
    return [key + "=" + encoded];
  }).join("&");
}

function aesKey(value: string) {
  let bytes = new TextEncoder().encode(value);
  if (bytes.length > 32) bytes = bytes.slice(0, 32);
  else if (bytes.length < 16) {
    const next = new Uint8Array(16);
    next.set(bytes);
    bytes = next;
  } else if (bytes.length % 16) {
    const length = bytes.length + (16 - bytes.length % 16);
    const next = new Uint8Array(length);
    next.set(bytes);
    bytes = next;
  }
  return CryptoJS.lib.WordArray.create(bytes as unknown as number[]);
}

function sign(appId: string, params: Record<string, unknown>) {
  const md5 = CryptoJS.MD5(canonical(params)).toString().toUpperCase();
  return CryptoJS.AES.encrypt(md5, aesKey(appId), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
}

async function profile(userEmail: string) {
  const db = getDb();
  const rows = await db.select().from(credentials).where(eq(credentials.userEmail, userEmail)).limit(1);
  if (!rows[0]) throw new Error("请先保存领星 App ID 和 App Secret");
  if (rows[0].host !== OFFICIAL_HOST) throw new Error("仅允许访问领星官方 OpenAPI 域名");
  return { ...rows[0], appSecret: await decryptSecret(rows[0].encryptedSecret) };
}

async function requestToken(host: string, fields: Record<string, string>) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.set(key, value));
  const response = await fetch(host, { method: "POST", body: form, signal: AbortSignal.timeout(30000) });
  const text = await response.text();
  if (!response.ok) throw new Error("Token接口 HTTP " + response.status);
  let payload: Record<string, any>;
  try { payload = JSON.parse(text); }
  catch { throw new Error("Token接口返回的不是JSON"); }
  if (![200, "200"].includes(payload.code)) throw new Error(String(payload.msg || payload.message || "Token申请失败"));
  const data = payload.data || {};
  if (!data.access_token) throw new Error("Token响应缺少 access_token");
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    expiresIn: Number(data.expires_in || 7200)
  };
}

async function validToken(userEmail: string, force = false) {
  const db = getDb();
  if (!force) {
    const cached = await db.select().from(tokens).where(eq(tokens.userEmail, userEmail)).limit(1);
    if (cached[0] && cached[0].expiresAt > Date.now() + TOKEN_MARGIN_MS) {
      return decryptSecret(cached[0].encryptedAccessToken);
    }
  }
  const p = await profile(userEmail);
  const cached = await db.select().from(tokens).where(eq(tokens.userEmail, userEmail)).limit(1);
  let token;
  if (cached[0]?.encryptedRefreshToken) {
    try {
      token = await requestToken(p.host + "/api/auth-server/oauth/refresh", {
        appId: p.appId,
        refreshToken: await decryptSecret(cached[0].encryptedRefreshToken)
      });
    } catch {
      token = await requestToken(p.host + "/api/auth-server/oauth/access-token", {
        appId: p.appId,
        appSecret: p.appSecret
      });
    }
  } else {
    token = await requestToken(p.host + "/api/auth-server/oauth/access-token", {
      appId: p.appId,
      appSecret: p.appSecret
    });
  }
  const row = {
    userEmail,
    encryptedAccessToken: await encryptSecret(token.accessToken),
    encryptedRefreshToken: token.refreshToken ? await encryptSecret(token.refreshToken) : null,
    expiresAt: Date.now() + token.expiresIn * 1000,
    updatedAt: Date.now()
  };
  await db.insert(tokens).values(row).onConflictDoUpdate({
    target: tokens.userEmail,
    set: {
      encryptedAccessToken: row.encryptedAccessToken,
      encryptedRefreshToken: row.encryptedRefreshToken,
      expiresAt: row.expiresAt,
      updatedAt: row.updatedAt
    }
  });
  return token.accessToken;
}

export async function testConnection(userEmail: string) {
  await validToken(userEmail, true);
  return { ok: true, message: "领星 OpenAPI 认证成功" };
}

export async function callEndpoint(userEmail: string, endpoint: EndpointDefinition, input: Record<string, unknown>) {
  const started = Date.now();
  const db = getDb();
  let status = "success";
  let responseCode: string | null = null;
  let errorMessage: string | null = null;
  try {
    const p = await profile(userEmail);
    let accessToken = await validToken(userEmail);
    const execute = async (token: string) => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const auth: Record<string, unknown> = { app_key: p.appId, access_token: token, timestamp };
      const signing = { ...input, ...auth };
      const signature = sign(p.appId, signing);
      const queryValues = endpoint.method === "GET" ? { ...input, ...auth, sign: signature } : { ...auth, sign: signature };
      const query = new URLSearchParams(Object.entries(queryValues).map(([k, v]) => [k, v && typeof v === "object" ? stable(v) : String(v)]));
      const response = await fetch(p.host + endpoint.route + "?" + query.toString(), {
        method: endpoint.method,
        headers: endpoint.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: endpoint.method === "POST" ? stable(input) : undefined,
        signal: AbortSignal.timeout(120000)
      });
      const text = await response.text();
      if (!response.ok) throw new Error("业务接口 HTTP " + response.status);
      try { return JSON.parse(text); }
      catch { throw new Error("业务接口返回的不是JSON"); }
    };
    let payload = await execute(accessToken);
    if ([401, 3001003, "401", "3001003"].includes(payload?.code)) {
      accessToken = await validToken(userEmail, true);
      payload = await execute(accessToken);
    }
    responseCode = payload?.code == null ? null : String(payload.code);
    if (payload?.code === 3001008 || payload?.code === "3001008") status = "rate_limited";
    return { ok: status === "success", payload: redact(payload), durationMs: Date.now() - started };
  } catch (error) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message : "调用失败";
    throw error;
  } finally {
    await db.insert(apiCallLogs).values({
      id: crypto.randomUUID(),
      userEmail,
      endpointId: endpoint.id,
      module: endpoint.module,
      route: endpoint.route,
      method: endpoint.method,
      requestSummary: JSON.stringify(redact(input)),
      responseCode,
      status,
      durationMs: Date.now() - started,
      errorMessage,
      createdAt: Date.now()
    });
  }
}
