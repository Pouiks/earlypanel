import { describe, it, expect } from "vitest";
import {
  applyContentTokens,
  splitKeyPoints,
  extractFaq,
  parseFrontmatter,
  slugFromFileName,
  estimateReadingMinutes,
  extractHeadings,
  headingId,
  formatPostDate,
} from "@/lib/blog-content";

const SAMPLE = `---
title: "Combien de testeurs : ce que dit la pratique"
description: Un guide court.
date: 2026-09-09
tags: [méthode, panel]
draft: false
---

## Première partie

Texte.

## Deuxième partie : détails

Encore du texte.
`;

describe("parseFrontmatter", () => {
  it("lit titre, description, date, tags, draft et le corps", () => {
    const p = parseFrontmatter(SAMPLE);
    expect(p.frontmatter.title).toBe("Combien de testeurs : ce que dit la pratique");
    expect(p.frontmatter.description).toBe("Un guide court.");
    expect(p.frontmatter.date).toBe("2026-09-09");
    expect(p.frontmatter.tags).toEqual(["méthode", "panel"]);
    expect(p.frontmatter.draft).toBe(false);
    expect(p.body.startsWith("## Première partie")).toBe(true);
  });
  it("tolère CRLF et BOM, draft par défaut false", () => {
    const p = parseFrontmatter("﻿---\r\ntitle: A\r\ndescription: B\r\ndate: 2026-01-02\r\n---\r\nCorps");
    expect(p.frontmatter.draft).toBe(false);
    expect(p.frontmatter.tags).toEqual([]);
    expect(p.body).toBe("Corps");
  });
  it("audience : entreprise par défaut, testeur accepté, autre refusé", () => {
    expect(parseFrontmatter(SAMPLE).frontmatter.audience).toBe("entreprise");
    expect(parseFrontmatter("---\ntitle: A\ndescription: B\ndate: 2026-01-02\naudience: testeur\n---\nx").frontmatter.audience).toBe("testeur");
    expect(() => parseFrontmatter("---\ntitle: A\ndescription: B\ndate: 2026-01-02\naudience: client\n---\nx")).toThrow(/audience/);
  });
  it("cover : chemin public sous /blog/ et cover_alt obligatoire", () => {
    const ok = parseFrontmatter("---\ntitle: A\ndescription: B\ndate: 2026-01-02\ncover: /blog/a/cover.webp\ncover_alt: Schéma\n---\nx");
    expect(ok.frontmatter.cover).toBe("/blog/a/cover.webp");
    expect(ok.frontmatter.cover_alt).toBe("Schéma");
    expect(() => parseFrontmatter("---\ntitle: A\ndescription: B\ndate: 2026-01-02\ncover: /images/x.png\ncover_alt: y\n---\nx")).toThrow(/\/blog\//);
    expect(() => parseFrontmatter("---\ntitle: A\ndescription: B\ndate: 2026-01-02\ncover: /blog/a/c.webp\n---\nx")).toThrow(/cover_alt/);
  });
  it("refuse un fichier sans frontmatter ou une date invalide", () => {
    expect(() => parseFrontmatter("# Pas de frontmatter")).toThrow();
    expect(() => parseFrontmatter("---\ntitle: A\ndescription: B\ndate: 09/09/2026\n---\n")).toThrow(/date/);
    expect(() => parseFrontmatter("---\ndescription: B\ndate: 2026-09-09\n---\n")).toThrow(/title/);
  });
});

describe("applyContentTokens", () => {
  it("remplace les jetons connus, laisse les inconnus visibles", () => {
    expect(applyContentTokens("généralement {{PRICE_RANGE_LABEL}}, appel de {{ BOOKING_DURATION_MIN }} min, {{INCONNU}}", { PRICE_RANGE_LABEL: "1 500 à 6 000 € HT", BOOKING_DURATION_MIN: "15" }))
      .toBe("généralement 1 500 à 6 000 € HT, appel de 15 min, {{INCONNU}}");
  });
});

describe("splitKeyPoints / extractFaq — encart En bref et FAQ balisée", () => {
  const md = `Intro.

## En bref

- Premier point.
- Deuxième point.

## Section

Texte.

## Questions fréquentes

### Combien ça coûte ?

Un forfait **fixe**, voir [prix](/blog/prix).

### Quel délai ?

Cinq jours.
Ouvrés.
`;
  it("retire la section En bref du corps et renvoie les puces", () => {
    const r = splitKeyPoints(md);
    expect(r.keyPoints).toEqual(["Premier point.", "Deuxième point."]);
    expect(r.body).not.toContain("## En bref");
    expect(r.body).toContain("## Section");
  });
  it("extrait les questions ### et leurs réponses en texte brut", () => {
    const faq = extractFaq(md);
    expect(faq).toEqual([
      { q: "Combien ça coûte ?", a: "Un forfait fixe, voir prix." },
      { q: "Quel délai ?", a: "Cinq jours. Ouvrés." },
    ]);
  });
  it("sans sections, rien ne change", () => {
    expect(splitKeyPoints("## A\n\nx").keyPoints).toEqual([]);
    expect(extractFaq("## A\n\nx")).toEqual([]);
  });
});

describe("slugFromFileName", () => {
  it("n'accepte que des slugs kebab-case .md", () => {
    expect(slugFromFileName("test-utilisateur-a-distance.md")).toBe("test-utilisateur-a-distance");
    expect(slugFromFileName("Brouillon.md")).toBeNull();
    expect(slugFromFileName("notes.txt")).toBeNull();
    expect(slugFromFileName("avec espace.md")).toBeNull();
  });
});

describe("lecture, titres, dates", () => {
  it("temps de lecture : 200 mots/min, minimum 1", () => {
    expect(estimateReadingMinutes("un deux trois")).toBe(1);
    expect(estimateReadingMinutes(Array(1000).fill("mot").join(" "))).toBe(5);
  });
  it("extrait les titres de niveau 2 avec des ancres sans accents", () => {
    const h = extractHeadings(parseFrontmatter(SAMPLE).body);
    expect(h).toEqual([
      { text: "Première partie", id: "premiere-partie" },
      { text: "Deuxième partie : détails", id: "deuxieme-partie-details" },
    ]);
    expect(headingId("Étape 1 : l'objectif")).toBe("etape-1-l-objectif");
  });
  it("date en français, indépendante du fuseau", () => {
    expect(formatPostDate("2026-09-09")).toBe("9 septembre 2026");
  });
});
