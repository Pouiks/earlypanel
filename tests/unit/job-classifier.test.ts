import { describe, it, expect } from "vitest";
import { classifyJobTitle, deriveJobFamily, deriveSeniority } from "@/lib/job-classifier";
import type { JobFamily, Seniority } from "@/lib/job-taxonomy";

/**
 * Verrou de non-régression du classifieur métier. Ces cas encodent des
 * décisions produit (cf. barème personas) : un « syndic » n'est pas un profil
 * rare, un « senior dev » est un pro confirmé, un « facteur » est grand public,
 * et surtout les faux positifs de l'ancien matching (« budget » ⊃ « dg ») ne
 * doivent JAMAIS reclasser quelqu'un en dirigeant.
 */

type Case = { title: string; family: JobFamily; seniority: Seniority };

const CASES: Case[] = [
  // --- Réglementés rares (Niche Premium) ---
  { title: "Médecin", family: "health-regulated", seniority: "confirmed" },
  { title: "Chirurgien orthopédiste", family: "health-regulated", seniority: "confirmed" },
  { title: "Avocat", family: "legal-regulated", seniority: "confirmed" },
  { title: "Notaire", family: "legal-regulated", seniority: "confirmed" },
  { title: "Pharmacien", family: "health-regulated", seniority: "confirmed" },
  // Collision santé : préparateur EN pharmacie ≠ pharmacien
  { title: "Préparateur en pharmacie", family: "health-support", seniority: "none" },
  { title: "Aide-soignant", family: "health-support", seniority: "junior" },

  // --- Direction / C-level ---
  { title: "CEO", family: "executive", seniority: "executive" },
  { title: "Président", family: "executive", seniority: "executive" },
  { title: "DSI", family: "executive", seniority: "executive" },
  { title: "Directeur des systèmes d'information", family: "executive", seniority: "executive" },
  { title: "DAF", family: "executive", seniority: "executive" },
  { title: "Directeur Marketing", family: "executive", seniority: "executive" },
  { title: "Chef d'entreprise, freelance ingénieur logiciel / électronique", family: "executive", seniority: "executive" },
  // Pièges "directeur X" NON dirigeants
  { title: "Directrice Artistique", family: "creative", seniority: "management" },
  { title: "Directeur de production multimédia", family: "creative", seniority: "management" },
  { title: "Directeur de projet", family: "ops", seniority: "management" },

  // --- Tech / Produit ---
  { title: "Senior Full Stack Developer", family: "tech-product", seniority: "confirmed" },
  { title: "Développeur", family: "tech-product", seniority: "confirmed" },
  { title: "développeur", family: "tech-product", seniority: "confirmed" },
  { title: "Developpeur FullStack", family: "tech-product", seniority: "confirmed" },
  { title: "Ingénieur DevOps", family: "tech-product", seniority: "confirmed" },
  { title: "Network and voice administrator", family: "tech-product", seniority: "confirmed" },
  { title: "Software engineer", family: "tech-product", seniority: "confirmed" },
  { title: "Alternant Cybersécurité", family: "tech-product", seniority: "student" },
  { title: "Chef de projet web", family: "tech-product", seniority: "management" },

  // --- Autres fonctions cadres ---
  { title: "Chef de Projet", family: "ops", seniority: "management" },
  { title: "Project manager", family: "ops", seniority: "management" },
  { title: "Comptable", family: "finance", seniority: "confirmed" },
  { title: "Chef de projet Monétique", family: "finance", seniority: "management" },
  { title: "Juriste d'entreprise", family: "legal", seniority: "confirmed" },
  { title: "Conseiller recrutement", family: "hr", seniority: "confirmed" },
  { title: "Consultant", family: "consulting", seniority: "confirmed" },
  { title: "Responsable communication", family: "marketing", seniority: "management" },
  { title: "Chargé d'affaires", family: "sales", seniority: "confirmed" },

  // --- Grand public ---
  { title: "Webdesign", family: "creative", seniority: "none" },
  { title: "Gestionnaire de copropriété (syndic)", family: "real-estate", seniority: "none" },
  { title: "Factrice", family: "transport", seniority: "none" },
  { title: "Agricultrice", family: "agriculture", seniority: "none" },
  { title: "Caissier", family: "hospitality-retail", seniority: "none" },
  { title: "Vendeuse boulangerie", family: "hospitality-retail", seniority: "none" },
  { title: "Second de cuisine", family: "trades", seniority: "none" },
  { title: "Formateur", family: "education", seniority: "none" },
  { title: "Ingénieur acoustique", family: "industry", seniority: "none" },
  { title: "Adjoint technique", family: "admin", seniority: "junior" },
  { title: "Étudiant en droit", family: "student", seniority: "student" },
  { title: "Sans activité", family: "inactive", seniority: "none" },
];

describe("classifyJobTitle — batterie de cas réels", () => {
  for (const c of CASES) {
    it(`"${c.title}" → ${c.family} / ${c.seniority}`, () => {
      expect(classifyJobTitle(c.title)).toEqual({ job_family: c.family, seniority: c.seniority });
    });
  }
});

describe("anti faux-positifs (l'ancien bug 'budget' ⊃ 'dg')", () => {
  const NOT_EXEC = ["Responsable budget", "Chargé de badges", "Chef de projet budget"];
  for (const t of NOT_EXEC) {
    it(`"${t}" n'est PAS dirigeant`, () => {
      const { job_family, seniority } = classifyJobTitle(t);
      expect(job_family).not.toBe("executive");
      expect(seniority).not.toBe("executive");
    });
  }
});

describe("robustesse entrées vides / bruit", () => {
  it("null / vide → other / none", () => {
    expect(classifyJobTitle(null)).toEqual({ job_family: "other", seniority: "none" });
    expect(classifyJobTitle("")).toEqual({ job_family: "other", seniority: "none" });
    expect(classifyJobTitle("....")).toEqual({ job_family: "other", seniority: "none" });
  });
  it("deriveJobFamily et deriveSeniority sont cohérents avec classifyJobTitle", () => {
    const fam = deriveJobFamily("Développeur");
    expect(deriveSeniority("Développeur", fam)).toBe("confirmed");
  });
});
