import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { signActionToken, verifyActionToken } from "@/lib/action-token";

// Le token d'action sécurise les liens email cliquables sans login. On
// verrouille : roundtrip, expiration, falsification, secret absent.

const SECRET = "test-secret-ff40f13150a31429ec896986bd0b1f9";

describe("action-token", () => {
  beforeEach(() => {
    process.env.ACTION_TOKEN_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.ACTION_TOKEN_SECRET;
    vi.useRealTimers();
  });

  it("roundtrip : un token signé se vérifie et rend le payload", () => {
    const token = signActionToken("tester-123", "availability_confirm");
    const payload = verifyActionToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.tid).toBe("tester-123");
    expect(payload!.act).toBe("availability_confirm");
    expect(typeof payload!.exp).toBe("number");
  });

  it("l'action est liée au token (deux actions distinctes)", () => {
    expect(verifyActionToken(signActionToken("t1", "availability_manage"))!.act).toBe("availability_manage");
  });

  it("token expiré → null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = signActionToken("t1", "availability_confirm", 60); // 60s
    vi.setSystemTime(new Date("2026-01-01T00:02:00Z")); // +2 min
    expect(verifyActionToken(token)).toBeNull();
  });

  it("token encore valide juste avant expiration → ok", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = signActionToken("t1", "availability_confirm", 120);
    vi.setSystemTime(new Date("2026-01-01T00:01:00Z")); // +1 min < 2 min
    expect(verifyActionToken(token)).not.toBeNull();
  });

  it("signature falsifiée → null", () => {
    const token = signActionToken("t1", "availability_confirm");
    const [body] = token.split(".");
    const forged = `${body}.YWJjZGVm`; // fausse signature
    expect(verifyActionToken(forged)).toBeNull();
  });

  it("payload (body) falsifié → signature ne matche plus → null", () => {
    const token = signActionToken("t1", "availability_confirm");
    const sig = token.split(".")[1];
    const forgedBody = Buffer.from(JSON.stringify({ tid: "attacker", act: "availability_confirm", exp: 9999999999 })).toString("base64url");
    expect(verifyActionToken(`${forgedBody}.${sig}`)).toBeNull();
  });

  it("token malformé → null", () => {
    expect(verifyActionToken("")).toBeNull();
    expect(verifyActionToken("pas-de-point")).toBeNull();
    expect(verifyActionToken(".sigsanbody")).toBeNull();
    expect(verifyActionToken(null)).toBeNull();
  });

  it("action inconnue dans le payload → null", () => {
    const sign = () => {
      const body = Buffer.from(JSON.stringify({ tid: "t1", act: "delete_everything", exp: 9999999999 })).toString("base64url");
      // resigne avec le vrai secret pour isoler la validation d'action
      const { createHmac } = require("node:crypto");
      const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
      return `${body}.${sig}`;
    };
    expect(verifyActionToken(sign())).toBeNull();
  });

  it("secret absent → sign throw, verify renvoie null (fail-closed)", () => {
    delete process.env.ACTION_TOKEN_SECRET;
    expect(() => signActionToken("t1", "availability_confirm")).toThrow();
    // un token signé avec un secret valide n'est plus vérifiable sans secret
    process.env.ACTION_TOKEN_SECRET = SECRET;
    const token = signActionToken("t1", "availability_confirm");
    delete process.env.ACTION_TOKEN_SECRET;
    expect(verifyActionToken(token)).toBeNull();
  });
});
