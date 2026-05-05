import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, getClientIp, _resetRateLimitBuckets } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    _resetRateLimitBuckets();
  });

  it("autorise la premiere requete (count=1)", () => {
    const r = rateLimit("ip:1.2.3.4", { windowMs: 60_000, max: 5 });
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(4);
    expect(r.retryAfterMs).toBe(0);
  });

  it("decrement remaining sur requetes successives", () => {
    const opts = { windowMs: 60_000, max: 3 };
    expect(rateLimit("k", opts).remaining).toBe(2);
    expect(rateLimit("k", opts).remaining).toBe(1);
    expect(rateLimit("k", opts).remaining).toBe(0);
  });

  it("bloque la requete au-dela de max", () => {
    const opts = { windowMs: 60_000, max: 2 };
    rateLimit("k", opts);
    rateLimit("k", opts);
    const blocked = rateLimit("k", opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("isole les buckets par cle", () => {
    const opts = { windowMs: 60_000, max: 1 };
    expect(rateLimit("k1", opts).ok).toBe(true);
    expect(rateLimit("k2", opts).ok).toBe(true); // pas affecte par k1
    expect(rateLimit("k1", opts).ok).toBe(false);
    expect(rateLimit("k2", opts).ok).toBe(false);
  });

  it("reset apres windowMs", () => {
    vi.useFakeTimers();
    const opts = { windowMs: 1000, max: 1 };
    rateLimit("k", opts);
    expect(rateLimit("k", opts).ok).toBe(false);

    vi.advanceTimersByTime(1500);
    expect(rateLimit("k", opts).ok).toBe(true);

    vi.useRealTimers();
  });
});

afterEach(() => {
  _resetRateLimitBuckets();
});

describe("getClientIp", () => {
  function makeReq(headers: Record<string, string>) {
    return {
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
    } as unknown as import("next/server").NextRequest;
  }

  it("priorise x-forwarded-for et prend la premiere IP", () => {
    const ip = getClientIp(makeReq({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }));
    expect(ip).toBe("1.2.3.4");
  });

  it("trim les espaces autour de l'IP", () => {
    const ip = getClientIp(makeReq({ "x-forwarded-for": "  5.6.7.8  ,  10.0.0.1" }));
    expect(ip).toBe("5.6.7.8");
  });

  it("fallback sur x-real-ip si pas de x-forwarded-for", () => {
    const ip = getClientIp(makeReq({ "x-real-ip": "9.9.9.9" }));
    expect(ip).toBe("9.9.9.9");
  });

  it("retourne 'unknown' si aucun header present", () => {
    expect(getClientIp(makeReq({}))).toBe("unknown");
  });
});

describe("rate-limit — scenarios reels du projet (PROJECT_CONTEXT section 13)", () => {
  beforeEach(() => _resetRateLimitBuckets());

  // Convention projet : par IP 5/min, par email 3/heure.
  it("IP : 5 requetes/min OK puis bloque", () => {
    const opts = { windowMs: 60_000, max: 5 };
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("ip:1.1.1.1", opts).ok).toBe(true);
    }
    expect(rateLimit("ip:1.1.1.1", opts).ok).toBe(false);
  });

  it("Email : 3 requetes/heure OK puis bloque", () => {
    const opts = { windowMs: 3_600_000, max: 3 };
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("email:victim@example.fr", opts).ok).toBe(true);
    }
    expect(rateLimit("email:victim@example.fr", opts).ok).toBe(false);
  });

  it("Limite IP epuisee n'affecte pas la limite email d'un autre user", () => {
    const ipOpts = { windowMs: 60_000, max: 5 };
    const emailOpts = { windowMs: 3_600_000, max: 3 };
    for (let i = 0; i < 5; i++) rateLimit("ip:attacker", ipOpts);
    expect(rateLimit("ip:attacker", ipOpts).ok).toBe(false);
    expect(rateLimit("email:innocent@example.fr", emailOpts).ok).toBe(true);
  });
});
