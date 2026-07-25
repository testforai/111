const sensitive = /secret|token|authorization|password|app[_-]?secret/i;
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 7) return "[max depth]";
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitive.test(key) ? "***REDACTED***" : redact(item, depth + 1)
    ]));
  }
  if (typeof value === "string" && value.length > 10000) return value.slice(0, 10000) + "…";
  return value;
}
