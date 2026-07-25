import { NextResponse } from "next/server";
import catalog from "@/generated/endpoints.json";
import { callEndpoint, type EndpointDefinition } from "@/lib/lingxing";
import { requireUserEmail } from "@/lib/user";

const endpoints = new Map((catalog.endpoints as EndpointDefinition[]).map((item) => [item.id, item]));
export async function POST(request: Request) {
  try {
    const email = await requireUserEmail();
    const body = await request.json() as {
      endpointId?: string;
      input?: Record<string, unknown>;
      confirmedWrite?: boolean;
    };
    const endpoint = endpoints.get(body.endpointId || "");
    if (!endpoint) return NextResponse.json({ error: "接口不存在或目录版本不一致" }, { status: 404 });
    if (endpoint.risk === "write" && body.confirmedWrite !== true) {
      return NextResponse.json({ error: "该接口可能修改领星数据，需要二次确认" }, { status: 409 });
    }
    const input = body.input && typeof body.input === "object" ? body.input : {};
    const serialized = JSON.stringify(input);
    if (serialized.length > 500000) return NextResponse.json({ error: "请求参数超过500KB限制" }, { status: 413 });
    for (const param of endpoint.params.filter((item) => item.required)) {
      if (input[param.name] === undefined || input[param.name] === null || input[param.name] === "") {
        return NextResponse.json({ error: "缺少必填参数：" + param.name }, { status: 400 });
      }
    }
    return NextResponse.json(await callEndpoint(email, endpoint, input));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "调用失败" }, { status: 400 });
  }
}
