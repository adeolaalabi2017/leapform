/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * On serverless each instance has its own memory, so limits are per-instance —
 * good enough to blunt abuse for a personal tool; swap for Upstash if this ever
 * needs hard guarantees.
 */

const buckets = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  // opportunistic cleanup so the map can't grow unbounded
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Basic per-IP rates tuned for a personal tool. */
export function checkPublicRate(req: Request, kind: "submit" | "partial" | "mutate"): boolean {
  const ip = clientIp(req);
  switch (kind) {
    case "submit":
      return allow(`submit:${ip}`, 10, 60_000);
    case "partial":
      return allow(`partial:${ip}`, 30, 60_000);
    case "mutate":
      return allow(`mutate:${ip}`, 30, 60_000);
  }
}
