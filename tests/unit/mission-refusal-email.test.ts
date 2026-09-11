import { describe, it, expect } from "vitest";
import { buildMissionRefusedEmail, formatReason, REFUSAL_REASONS } from "@/lib/mission-refusal-email";

const base = {
  firstName: "Léa",
  projectTitle: "Parcours de création de devis (v2)",
  contactEmail: "contact@earlypanel.fr",
  guideUrl: "https://www.earlypanel.fr/testeurs/guides/bien-repondre-test-utilisateur",
};

describe("buildMissionRefusedEmail", () => {
  it("nomme la mission dans le sujet et annonce l'absence de paiement", () => {
    const { subject, html } = buildMissionRefusedEmail({ ...base, note: null });
    expect(subject).toBe("Votre mission « Parcours de création de devis (v2) » n'a pas été validée");
    expect(html).toContain("Bonjour Léa,");
    expect(html).toContain("n'est donc pas rémunérée");
    expect(html).toContain("mailto:contact@earlypanel.fr");
    expect(html).toContain(base.guideUrl);
  });

  it("affiche le motif du staff, échappé, avec ses sauts de ligne", () => {
    const { html } = buildMissionRefusedEmail({
      ...base,
      note: "Réponses en 2 mots.\nQuestion 3 : <copié> de la question 2.",
    });
    expect(html).toContain("Motif indiqué par l'équipe");
    expect(html).toContain("Réponses en 2 mots.<br>Question 3 : &lt;copié&gt; de la question 2.");
    expect(html).not.toContain("<copié>");
    expect(html).not.toContain("Ce qui fait refuser une mission");
  });

  it("liste les motifs génériques quand le staff n'a rien écrit", () => {
    const { html } = buildMissionRefusedEmail({ ...base, note: "   " });
    expect(html).toContain("Ce qui fait refuser une mission");
    for (const r of REFUSAL_REASONS) expect(html).toContain(r.replace(/'/g, "&#39;"));
  });

  it("salue sans prénom et échappe le titre", () => {
    const { html } = buildMissionRefusedEmail({ ...base, firstName: null, projectTitle: "A & B <test>", note: null });
    expect(html).toContain("Bonjour,");
    expect(html).toContain("« A &amp; B &lt;test&gt; »");
  });
});

describe("formatReason", () => {
  it("renvoie null pour une note vide", () => {
    expect(formatReason(null)).toBeNull();
    expect(formatReason("")).toBeNull();
    expect(formatReason("  \n ")).toBeNull();
  });
});
