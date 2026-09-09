import { describe, it, expect } from "vitest";
import { splitGlossary, inlineGlossaryTerms } from "@/lib/glossary-inline";
import { GLOSSARY } from "@/data/glossaire";

const matches = (segs: ReturnType<typeof splitGlossary>) =>
  segs.filter((s): s is Exclude<typeof s, string> => typeof s !== "string");

describe("splitGlossary", () => {
  it("annote un terme au pluriel en conservant le texte source", () => {
    const seen = new Set<string>();
    const segs = splitGlossary("Ce qu'on apprend en recrutant des panels, en relisant des réponses.", seen);
    expect(matches(segs)).toEqual([expect.objectContaining({ slug: "panel", text: "panels" })]);
    expect(segs.map((s) => (typeof s === "string" ? s : s.text)).join("")).toBe(
      "Ce qu'on apprend en recrutant des panels, en relisant des réponses.",
    );
  });

  it("ne reconnaît pas un terme à l'intérieur d'un mot (marque earlypanel)", () => {
    const seen = new Set<string>();
    expect(matches(splitGlossary("Avec earlypanel, rien à configurer.", seen))).toEqual([]);
    expect(matches(splitGlossary("Le panel earlypanel.", seen)).map((m) => m.text)).toEqual(["panel"]);
  });

  it("n'annote que la première occurrence, y compris entre deux appels", () => {
    const seen = new Set<string>();
    const a = splitGlossary("Un scénario, puis un autre scénario.", seen);
    expect(matches(a)).toHaveLength(1);
    const b = splitGlossary("Encore un scénario dans un autre paragraphe.", seen);
    expect(matches(b)).toHaveLength(0);
    expect(seen.has("scenario")).toBe(true);
  });

  it("laisse les mots-clés des pages piliers intacts", () => {
    const seen = new Set<string>();
    const segs = splitGlossary("Un test utilisateur à distance avec un testeur rémunéré.", seen);
    expect(matches(segs)).toEqual([]);
    expect(segs).toEqual(["Un test utilisateur à distance avec un testeur rémunéré."]);
  });

  it("préfère l'alias le plus long", () => {
    const seen = new Set<string>();
    const segs = splitGlossary("Sur un prototype cliquable ou en test non modéré.", seen);
    expect(matches(segs).map((m) => [m.slug, m.text])).toEqual([
      ["prototype", "prototype cliquable"],
      ["test-non-modere", "test non modéré"],
    ]);
  });

  it("ignore la casse et tolère l'espace insécable", () => {
    const seen = new Set<string>();
    const segs = splitGlossary("Le NDA est signé. Un Taux de complétion élevé.", seen);
    expect(matches(segs).map((m) => m.slug)).toEqual(["nda", "taux-de-completion"]);
  });

  it("gère les alias avec ponctuation (A/B testing) et les tirets (pré-prod)", () => {
    const seen = new Set<string>();
    const segs = splitGlossary("L'A/B testing sur la pré-prod.", seen);
    expect(matches(segs).map((m) => m.slug)).toEqual(["ab-testing", "staging"]);
  });

  it("renvoie le texte tel quel quand rien ne correspond", () => {
    expect(splitGlossary("Bonjour.", new Set())).toEqual(["Bonjour."]);
    expect(splitGlossary("", new Set())).toEqual([""]);
  });
});

describe("GLOSSARY", () => {
  it("a des slugs uniques et des alias uniques entre termes", () => {
    const slugs = GLOSSARY.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const all = GLOSSARY.flatMap((t) => (t.aliases ?? []).map((a) => a.toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
  });

  it("expose uniquement les termes annotables", () => {
    const inline = inlineGlossaryTerms().map((t) => t.slug);
    expect(inline).not.toContain("test-utilisateur");
    expect(inline).not.toContain("testeur-remunere");
    expect(inline).toContain("panel");
  });
});
