import type { NextRequest } from "next/server";

// Rate limiter en memoire (per-instance). Acceptable pour des limites
// "anti-abus basique" : si Vercel scale a N instances, un attaquant peut
// faire N x max requetes. Pour un vrai anti-abus distributed, utiliser
// Upstash Ratelimit ou une table Postgres dediee.
//
// La cle peut etre n'importe quelle string (IP, email, IP+route...).

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets: Map<string, Bucket> = new Map();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.max - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= opts.max) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count++;
  return { ok: true, remaining: opts.max - bucket.count, retryAfterMs: 0 };
}

/**
 * Resout l'IP cliente de maniere defensive (Vercel et autres reverse proxies).
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Test helper : permet de purger les buckets entre deux tests.
 * Ne pas appeler en production.
 */
export function _resetRateLimitBuckets() {
  buckets.clear();
}
