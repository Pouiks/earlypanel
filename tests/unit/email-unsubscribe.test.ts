import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// sendEmail est remplacé : on vérifie ce qui PARTIRAIT (en-têtes, ligne de
// pied), sans réseau. La base est remplacée pour le contrôle des adresses.
const sendEmailMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const optOutRow = vi.hoisted(() => ({ value: null as { email_hash: string } | null }));
vi.mock("@/lib/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email")>()),
  sendEmail: sendEmailMock,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: optOutRow.value, error: null }) }),
      }),
    }),
  }),
}));

import { verifyActionToken } from "@/lib/action-token";
import {
  buildUnsubscribeLinks,
  EmailOptOutError,
  emailHash,
  hasOptedOutOfEmails,
  sendUserEmail,
  unsubscribeHeaders,
  withUnsubscribeFooter,
} from "@/lib/email-unsubscribe";
import { isTesterEligibleForInvitation, REQUIRED_FIELDS } from "@/lib/profile-completeness";

// Désabonnement de l'ensemble des communications : chaque email testeur ou
// prospect porte la ligne de pied et les en-têtes one-click (RFC 8058), une
// personne désabonnée ne reçoit plus rien hors lien demandé, et aucun email
// ne contourne sendUserEmail.

const SECRET = "test-secret-unsubscribe-4f1c2a9b8e7d6c5b4a3";
const APP = "https://www.earlypanel.fr";
const LINE = "Si vous souhaitez vous désabonner de l'ensemble des communications";

function tokenOf(url: string): string {
  return decodeURIComponent(new URL(url).searchParams.get("token") ?? "");
}

type SentArg = { to: string; html: string; headers?: Record<string, string> };
const lastSent = () => (sendEmailMock.mock.calls.at(-1) as unknown[])[0] as SentArg;

describe("email-unsubscribe", () => {
  beforeEach(() => {
    process.env.ACTION_TOKEN_SECRET = SECRET;
    sendEmailMock.mockClear();
    optOutRow.value = null;
  });
  afterEach(() => {
    delete process.env.ACTION_TOKEN_SECRET;
    vi.useRealTimers();
  });

  describe("liens", () => {
    it("testeur : page /desabonnement + cible one-click, token lié à l'id", () => {
      const links = buildUnsubscribeLinks(APP, { kind: "tester", id: "tester-42", email: "a@b.fr", email_opt_out_at: null });
      expect(links.pageUrl.startsWith(`${APP}/desabonnement?token=`)).toBe(true);
      expect(links.oneClickUrl.startsWith(`${APP}/api/unsubscribe?token=`)).toBe(true);
      expect(tokenOf(links.pageUrl)).toBe(tokenOf(links.oneClickUrl));
      const payload = verifyActionToken(tokenOf(links.pageUrl));
      expect(payload?.act).toBe("email_unsubscribe");
      expect(payload?.tid).toBe("tester-42");
    });

    it("adresse : token lié à l'empreinte, jamais l'adresse en clair", () => {
      const links = buildUnsubscribeLinks(APP, { kind: "address", email: " Camille@Exemple.FR " });
      const token = tokenOf(links.pageUrl);
      const payload = verifyActionToken(token);
      expect(payload?.act).toBe("email_unsubscribe_address");
      expect(payload?.tid).toBe(emailHash("camille@exemple.fr"));
      expect(Buffer.from(token.split(".")[0], "base64url").toString("utf8")).not.toMatch(/camille/i);
    });

    it("le lien marche encore 4 ans après l'envoi, plus au-delà de 5 ans", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = tokenOf(buildUnsubscribeLinks(APP, { kind: "address", email: "a@b.fr" }).pageUrl);
      vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
      expect(verifyActionToken(token)).not.toBeNull();
      vi.setSystemTime(new Date("2031-06-01T00:00:00Z"));
      expect(verifyActionToken(token)).toBeNull();
    });

    it("en-têtes RFC 8058", () => {
      expect(unsubscribeHeaders("https://x.fr/api/unsubscribe?token=abc")).toEqual({
        "List-Unsubscribe": "<https://x.fr/api/unsubscribe?token=abc>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });
    });
  });

  describe("withUnsubscribeFooter", () => {
    const url = `${APP}/desabonnement?token=AAA`;

    it("insère la ligne juste avant </body>", () => {
      const html = withUnsubscribeFooter("<html><body><p>corps</p></body></html>", url);
      expect(html).toContain(LINE);
      expect(html).toContain(`<a href="${url}"`);
      expect(html).toContain(">cliquez ici</a>");
      expect(html.indexOf(LINE)).toBeGreaterThan(html.indexOf("corps"));
      expect(html.endsWith("</body></html>")).toBe(true);
    });

    it("ajoute la ligne à la fin d'un fragment sans <body>", () => {
      const html = withUnsubscribeFooter("<div>corps</div>", url);
      expect(html.startsWith("<div>corps</div>")).toBe(true);
      expect(html).toContain(LINE);
    });
  });

  it("hasOptedOutOfEmails", () => {
    expect(hasOptedOutOfEmails({ email_opt_out_at: "2026-09-16T10:00:00Z" })).toBe(true);
    expect(hasOptedOutOfEmails({ email_opt_out_at: null })).toBe(false);
    expect(hasOptedOutOfEmails(null)).toBe(false);
  });

  describe("sendUserEmail", () => {
    const base = { appUrl: APP, subject: "Sujet", html: "<html><body><p>corps</p></body></html>" };
    const tester = (opt: string | null | undefined) =>
      ({ kind: "tester", id: "t1", email: "a@b.fr", email_opt_out_at: opt }) as const;

    it("ajoute la ligne de pied et les en-têtes one-click", async () => {
      await sendUserEmail({ ...base, recipient: tester(null) });
      const sent = lastSent();
      expect(sent.to).toBe("a@b.fr");
      expect(sent.html).toContain(LINE);
      expect(sent.html).toContain(`${APP}/desabonnement?token=`);
      expect(sent.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
      expect(sent.headers?.["List-Unsubscribe"]).toMatch(/^<https:\/\/www\.earlypanel\.fr\/api\/unsubscribe\?token=.+>$/);
    });

    it("testeur désabonné : rien ne part", async () => {
      await expect(sendUserEmail({ ...base, recipient: tester("2026-09-16T10:00:00Z") })).rejects.toBeInstanceOf(EmailOptOutError);
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("testeur désabonné : un email demandé (lien de connexion) part quand même, avec la ligne", async () => {
      await sendUserEmail({ ...base, recipient: tester("2026-09-16T10:00:00Z"), requested: true });
      expect(lastSent().html).toContain(LINE);
    });

    it("colonne email_opt_out_at non sélectionnée : envoi refusé", async () => {
      await expect(sendUserEmail({ ...base, recipient: tester(undefined) })).rejects.toThrow(/email_opt_out_at/);
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("adresse désabonnée : rien ne part, sauf email demandé", async () => {
      optOutRow.value = { email_hash: emailHash("p@x.fr") };
      await expect(sendUserEmail({ ...base, recipient: { kind: "address", email: "p@x.fr" } })).rejects.toBeInstanceOf(EmailOptOutError);
      expect(sendEmailMock).not.toHaveBeenCalled();
      await sendUserEmail({ ...base, recipient: { kind: "address", email: "p@x.fr" }, requested: true });
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it("sans ACTION_TOKEN_SECRET : refusé, sauf email demandé qui part sans la ligne", async () => {
      delete process.env.ACTION_TOKEN_SECRET;
      await expect(sendUserEmail({ ...base, recipient: tester(null) })).rejects.toThrow();
      expect(sendEmailMock).not.toHaveBeenCalled();
      await sendUserEmail({ ...base, recipient: tester(null), requested: true });
      expect(lastSent().html).not.toContain(LINE);
    });
  });

  describe("isTesterEligibleForInvitation", () => {
    const complete: Record<string, unknown> = { status: "active", profile_completed: true, email_opt_out_at: null };
    for (const f of REQUIRED_FIELDS) complete[f.key] = f.isArray ? ["x"] : "x";

    it("actif au profil complet : invitable ; désabonné : non", () => {
      expect(isTesterEligibleForInvitation(complete)).toBe(true);
      expect(isTesterEligibleForInvitation({ ...complete, email_opt_out_at: "2026-09-16T10:00:00Z" })).toBe(false);
    });
  });
});

/**
 * Garde : tout email à un testeur ou à un prospect passe par sendUserEmail
 * (ligne de désabonnement + opposition). sendEmail en direct n'est autorisé
 * que pour les emails internes au staff, fichier par fichier et en nombre.
 * Ajouter un email interne ici exige de vérifier qu'il ne part jamais à un
 * testeur ou à un prospect.
 */
const DIRECT_SEND_ALLOWED: Record<string, number> = {
  "src/app/api/brief/route.ts": 1, // notification staff : nouveau brief
  "src/app/api/staff/forgot/route.ts": 1, // récupération mot de passe staff
  "src/app/api/staff/login/magic/route.ts": 1, // connexion staff
  "src/app/api/staff/recover-owner/route.ts": 1, // break-glass owner
  "src/app/api/testers/register/route.ts": 1, // notification staff : nouvelle inscription
};

describe("garde : aucun email testeur ou prospect hors sendUserEmail", () => {
  it("sendEmail( n'apparaît que dans les envois internes autorisés", () => {
    const root = process.cwd();
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
      });
    const found: Record<string, number> = {};
    for (const file of walk(join(root, "src"))) {
      const rel = relative(root, file).split(sep).join("/");
      if (rel === "src/lib/email.ts" || rel === "src/lib/email-unsubscribe.ts") continue;
      const count = (readFileSync(file, "utf8").match(/\bsendEmail\(/g) ?? []).length;
      if (count > 0) found[rel] = count;
    }
    expect(found).toEqual(DIRECT_SEND_ALLOWED);
  });
});
