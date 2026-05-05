import { describe, it, expect } from "vitest";
import { checkJunkValue, checkJunkFields } from "@/lib/junk-detection";

describe("checkJunkValue — valeurs autorisees", () => {
  it.each([
    "Virgile",
    "Joinville",
    "Le Bel",
    "D'Aubigne",
    "Müller",
    "Nguyen",
    "O'Brien",
    "Jean-Pierre",
    "Henri",
    "Le", // nom court mais legitime (vietnamien)
    "Vu",
    "Ng",
  ])("accepte %s", (value) => {
    expect(checkJunkValue(value).ok).toBe(true);
  });

  it("accepte vide / null / undefined (champ optionnel)", () => {
    expect(checkJunkValue("").ok).toBe(true);
    expect(checkJunkValue("   ").ok).toBe(true);
    expect(checkJunkValue(null as unknown as string).ok).toBe(true);
    expect(checkJunkValue(undefined as unknown as string).ok).toBe(true);
  });
});

describe("checkJunkValue — valeurs rejetees", () => {
  it.each([
    "test",
    "Test",
    "TEST",
    "tests",
    "azerty",
    "qwerty",
    "qwertz",
    "admin",
    "user",
    "demo",
    "fake",
    "lorem",
    "ipsum",
    "foo",
    "bar",
    "toto",
    "tata",
    "null",
    "undefined",
    "exemple",
  ])("rejette le mot bidon %s", (value) => {
    expect(checkJunkValue(value).ok).toBe(false);
  });

  it("rejette les sequences clavier en sous-chaine", () => {
    expect(checkJunkValue("azertyuiop").ok).toBe(false);
    expect(checkJunkValue("qwerty123").ok).toBe(false);
    expect(checkJunkValue("abcdef").ok).toBe(false);
  });

  it("rejette les repetitions mono-caractere", () => {
    expect(checkJunkValue("aaa").ok).toBe(false);
    expect(checkJunkValue("AAAAA").ok).toBe(false);
    expect(checkJunkValue("xxxxx").ok).toBe(false);
  });

  it("rejette les valeurs uniquement chiffrees", () => {
    expect(checkJunkValue("12345").ok).toBe(false);
    expect(checkJunkValue("0000").ok).toBe(false);
  });

  it("rejette les valeurs trop courtes (1 char)", () => {
    expect(checkJunkValue("a").ok).toBe(false);
  });

  it("rejette si <50% de lettres", () => {
    expect(checkJunkValue("a1234").ok).toBe(false);
  });
});

describe("checkJunkValue — message d'erreur", () => {
  it("inclut le fieldLabel dans le message", () => {
    const r = checkJunkValue("azerty", "Le prenom");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("Le prenom");
  });

  it("utilise le label par defaut si non fourni", () => {
    const r = checkJunkValue("azerty");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("Cette valeur");
  });
});

describe("checkJunkFields", () => {
  it("ok si tous les champs sont valides", () => {
    const r = checkJunkFields([
      { label: "Prenom", value: "Virgile" },
      { label: "Nom", value: "Joinville" },
    ]);
    expect(r.ok).toBe(true);
  });

  it("retourne le premier champ invalide", () => {
    const r = checkJunkFields([
      { label: "Prenom", value: "Virgile" },
      { label: "Nom", value: "azerty" },
      { label: "Ville", value: "qwerty" },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("Nom");
  });

  it("ignore les champs null/empty", () => {
    const r = checkJunkFields([
      { label: "Prenom", value: "Virgile" },
      { label: "MiddleName", value: null },
      { label: "Suffix", value: "" },
    ]);
    expect(r.ok).toBe(true);
  });
});
