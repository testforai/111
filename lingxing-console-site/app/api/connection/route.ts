import { NextResponse } from "next/server";
import { testConnection } from "@/lib/lingxing";
import { requireUserEmail } from "@/lib/user";
export async function POST() {
  try {
    const email = await requireUserEmail();
    return NextResponse.json(await testConnection(email));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "认证失败" }, { status: 400 });
  }
}
