import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { credentials, tokens } from "@/db/schema";
import { encryptSecret } from "@/lib/secret";
import { requireUserEmail } from "@/lib/user";

const HOST = "https://openapi.lingxing.com";
export async function GET() {
  try {
    const email = await requireUserEmail();
    const rows = await getDb().select({
      host: credentials.host,
      appId: credentials.appId,
      updatedAt: credentials.updatedAt
    }).from(credentials).where(eq(credentials.userEmail, email)).limit(1);
    return NextResponse.json({ configured: Boolean(rows[0]), profile: rows[0] || null });
  } catch { return NextResponse.json({ error: "请先登录" }, { status: 401 }); }
}
export async function POST(request: Request) {
  try {
    const email = await requireUserEmail();
    const body = await request.json() as { appId?: string; appSecret?: string };
    const appId = body.appId?.trim() || "";
    const appSecret = body.appSecret?.trim() || "";
    if (appId.length < 4 || appSecret.length < 8) {
      return NextResponse.json({ error: "App ID 或 App Secret 格式不完整" }, { status: 400 });
    }
    const encryptedSecret = await encryptSecret(appSecret);
    const db = getDb();
    await db.insert(credentials).values({
      userEmail: email, host: HOST, appId, encryptedSecret, updatedAt: Date.now()
    }).onConflictDoUpdate({
      target: credentials.userEmail,
      set: { host: HOST, appId, encryptedSecret, updatedAt: Date.now() }
    });
    await db.delete(tokens).where(eq(tokens.userEmail, email));
    return NextResponse.json({ ok: true, configured: true, appId, host: HOST });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 });
  }
}
export async function DELETE() {
  try {
    const email = await requireUserEmail();
    const db = getDb();
    await db.delete(tokens).where(eq(tokens.userEmail, email));
    await db.delete(credentials).where(eq(credentials.userEmail, email));
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "删除失败" }, { status: 500 }); }
}
