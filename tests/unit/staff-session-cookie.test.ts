import { describe, it, expect, beforeAll } from "vitest";
import { signStaffCookie, verifyStaffCookie } from "@/lib/staff-session-cookie";

// Le cookie tp-staff remplace une lecture DB par requete : il doit etre
// infalsifiable (HMAC), lie a un uid, et expirer vite.

beforeAll(() => { process.env.ACTION_TOKEN_SECRET = "test-secret-0123456789"; });

describe("staff session cookie", () => {
  it("signe puis verifie un payload", async () => {
    const v = await signStaffCookie({ sid: "s1", email: "a@b.fr", uid: "u1" });
    expect(v).toBeTruthy();
    const p = await verifyStaffCookie(v!);
    expect(p).toMatchObject({ sid: "s1", email: "a@b.fr", uid: "u1" });
    expect(p!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejette une signature alteree et un payload modifie", async () => {
    const v = (await signStaffCookie({ sid: "s1", email: "a@b.fr", uid: "u1" }))!;
    const [body, sig] = v.split(".");
    expect(await verifyStaffCookie(`${body}.${sig.slice(0, -2)}xx`)).toBeNull();
    const forged = Buffer.from(JSON.stringify({ sid: "admin", email: "x", uid: "u1", exp: 9999999999 })).toString("base64url");
    expect(await verifyStaffCookie(`${forged}.${sig}`)).toBeNull();
  });

  it("rejette un cookie expire", async () => {
    const v = (await signStaffCookie({ sid: "s1", email: "a@b.fr", uid: "u1" }, -1))!;
    expect(await verifyStaffCookie(v)).toBeNull();
  });

  it("sans secret : ne signe pas, ne verifie pas", async () => {
    const saved = process.env.ACTION_TOKEN_SECRET;
    delete process.env.ACTION_TOKEN_SECRET;
    expect(await signStaffCookie({ sid: "s1", email: "a@b.fr", uid: "u1" })).toBeNull();
    expect(await verifyStaffCookie("abc.def")).toBeNull();
    process.env.ACTION_TOKEN_SECRET = saved;
  });
});
