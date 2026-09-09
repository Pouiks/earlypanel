import { describe, it, expect } from "vitest";
import {
  retentionStage,
  anonymizationDate,
  anonymizedTesterPatch,
  buildRetentionWarningEmail,
  RETENTION_WARN_AFTER_DAYS,
  RETENTION_WARNING_DAYS,
} from "@/lib/tester-retention";

const NOW = new Date("2026-09-09T09:00:00.000Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
const base = { id: "11111111-2222-3333-4444-555555555555", created_at: ago(2000) };

describe("retentionStage — 3 ans après la dernière activité, avertissement 90 j avant", () => {
  it("constantes alignées sur la politique de confidentialité", () => {
    expect(RETENTION_WARN_AFTER_DAYS).toBe(1095 - 90);
    expect(RETENTION_WARNING_DAYS).toBe(90);
  });

  it("actif récemment → rien", () => {
    expect(retentionStage({ ...base, last_seen_at: ago(10) }, NOW)).toBe("none");
    expect(retentionStage({ ...base, last_seen_at: ago(1004) }, NOW)).toBe("none");
  });

  it("inactif depuis 2 ans 9 mois, jamais averti → warn", () => {
    expect(retentionStage({ ...base, last_seen_at: ago(1005) }, NOW)).toBe("warn");
  });

  it("averti récemment mais échéance pas atteinte → rien (on attend)", () => {
    expect(retentionStage({ ...base, last_seen_at: ago(1010), retention_warning_sent_at: ago(5) }, NOW)).toBe("none");
  });

  it("échéance atteinte et averti il y a ≥ 90 j → anonymize", () => {
    expect(retentionStage({ ...base, last_seen_at: ago(1100), retention_warning_sent_at: ago(95) }, NOW)).toBe("anonymize");
  });

  it("échéance atteinte mais averti il y a moins de 90 j → on attend la fin du préavis", () => {
    expect(retentionStage({ ...base, last_seen_at: ago(1100), retention_warning_sent_at: ago(30) }, NOW)).toBe("none");
  });

  it("avertissement antérieur à la dernière activité : le testeur est revenu, on ré-avertit au lieu d'anonymiser", () => {
    expect(retentionStage({ ...base, last_seen_at: ago(1100), retention_warning_sent_at: ago(1500) }, NOW)).toBe("warn");
  });

  it("jamais connecté : la date d'inscription fait foi", () => {
    expect(retentionStage({ id: base.id, created_at: ago(1010), last_seen_at: null, last_login_at: null }, NOW)).toBe("warn");
    expect(retentionStage({ id: base.id, created_at: ago(100), last_seen_at: null, last_login_at: null }, NOW)).toBe("none");
  });

  it("déjà anonymisé → plus jamais rien", () => {
    expect(retentionStage({ ...base, last_seen_at: ago(2000), retention_warning_sent_at: ago(500), anonymized_at: ago(100) }, NOW)).toBe("none");
  });
});

describe("anonymizationDate", () => {
  it("au moins 90 j après l'avertissement, et jamais avant les 3 ans d'inactivité", () => {
    const soon = anonymizationDate({ ...base, last_seen_at: ago(1100) }, NOW);
    expect(soon.getTime()).toBe(NOW.getTime() + 90 * DAY);
    const later = anonymizationDate({ ...base, last_seen_at: ago(1005) }, NOW);
    expect(later.getTime()).toBe(new Date(ago(1005)).getTime() + 1095 * DAY);
  });
});

describe("anonymizedTesterPatch", () => {
  it("efface l'identité, garde un email unique non routable, passe inactive", () => {
    const p = anonymizedTesterPatch(base.id, NOW);
    expect(p.email).toBe("anonyme-111111112222@earlypanel.invalid");
    expect(p.first_name).toBe("Compte");
    expect(p.phone).toBeNull();
    expect(p.birth_date).toBeNull();
    expect(p.address).toBeNull();
    expect(p.status).toBe("inactive");
    expect(p.anonymized_at).toBe(NOW.toISOString());
    // Jamais touché : l'historique de paiement et les missions restent rattachés à l'id.
    expect(p).not.toHaveProperty("missions_completed");
    expect(p).not.toHaveProperty("total_earned");
  });
});

describe("buildRetentionWarningEmail", () => {
  it("date en clair, lien de connexion, échappement HTML du prénom", () => {
    const { subject, html } = buildRetentionWarningEmail({
      firstName: "<b>Léa</b>",
      anonymizeOn: new Date("2026-12-08T09:00:00.000Z"),
      loginUrl: "https://www.earlypanel.fr/app/login",
    });
    expect(subject).toContain("90 jours");
    expect(html).toContain("8 décembre 2026");
    expect(html).toContain('href="https://www.earlypanel.fr/app/login"');
    expect(html).toContain("&lt;b&gt;Léa&lt;/b&gt;");
    expect(html).not.toContain("<b>Léa</b>");
  });
});
