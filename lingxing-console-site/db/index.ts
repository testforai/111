import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type RuntimeEnv = { DB?: D1Database };

export function getDb() {
  const runtimeEnv = env as unknown as RuntimeEnv;
  if (!runtimeEnv.DB) throw new Error("D1 binding DB is unavailable");
  return drizzle(runtimeEnv.DB, { schema });
}
