import { env } from "cloudflare:workers";

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}
function base64ToBytes(value: string) {
  const raw = atob(value);
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
}
async function key() {
  const secret = env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY is not configured");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret).slice(0, 32), "AES-GCM", false, ["encrypt","decrypt"]);
}
export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(value));
  return bytesToBase64(iv) + "." + bytesToBase64(new Uint8Array(encrypted));
}
export async function decryptSecret(value: string) {
  const [ivText, dataText] = value.split(".");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(ivText) }, await key(), base64ToBytes(dataText));
  return new TextDecoder().decode(decrypted);
}
