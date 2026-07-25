import { headers } from "next/headers";
export async function requireUserEmail(): Promise<string> {
  const h = await headers();
  const email = h.get("oai-authenticated-user-email");
  if (!email) throw new Error("UNAUTHENTICATED");
  return email.toLowerCase();
}
