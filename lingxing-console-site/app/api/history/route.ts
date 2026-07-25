import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { apiCallLogs } from "@/db/schema";
import { requireUserEmail } from "@/lib/user";
export async function GET() {
  try {
    const email = await requireUserEmail();
    const rows = await getDb().select({
      id: apiCallLogs.id,
      endpointId: apiCallLogs.endpointId,
      module: apiCallLogs.module,
      route: apiCallLogs.route,
      method: apiCallLogs.method,
      responseCode: apiCallLogs.responseCode,
      status: apiCallLogs.status,
      durationMs: apiCallLogs.durationMs,
      errorMessage: apiCallLogs.errorMessage,
      createdAt: apiCallLogs.createdAt
    }).from(apiCallLogs).where(eq(apiCallLogs.userEmail, email)).orderBy(desc(apiCallLogs.createdAt)).limit(100);
    return NextResponse.json({ items: rows });
  } catch { return NextResponse.json({ error: "读取调用历史失败" }, { status: 500 }); }
}
