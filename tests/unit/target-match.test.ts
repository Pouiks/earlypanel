import { describe, it, expect } from "vitest";
import { buildTarget, evaluateTester, activeCriteria, requiredServerParams } from "@/lib/target-match";
import { parseTargetCriteria } from "@/lib/target-criteria";

// Cible projet -> score par testeur. Principe : les « souhaites » notent,
// seuls les « obligatoires » excluent ; une valeur absente = non satisfait
// mais marquee unknown (affichee en gris, pas en rouge).

const project = {
  target_gender: ["female"],
  target_age_min: 30, target_age_max: 50,
  target_csp: [],
  target_sector: "Santé / Pharma", target_sector_restricted: true,
  target_locations: ["Montpellier", "34"],
  target_headcount: 8,
  target_criteria: {
    required: ["devices"],
    job_title: "kiné, kinésithérapeute",
    devices: ["iPhone", "Smartphone Android"],
    tools: ["Doctolib"],
  },
};

const kine = {
  gender: "female", birth_date: "1985-01-01", sector: "Santé / Pharma", city: "Montpellier", postal_code: "34000",
  job_title: "Kinésithérapeute libérale", devices: ["iPhone", "Mac"], tools: ["Doctolib", "WhatsApp"],
};

describe("target-match", () => {
  it("buildTarget fusionne colonnes et JSON, secteur seulement si restreint", () => {
    const t = buildTarget(project);
    expect(t.sector).toBe("Santé / Pharma");
    expect(t.required).toEqual(["devices"]);
    expect(t.headcount).toBe(8);
    expect(buildTarget({ ...project, target_sector_restricted: false }).sector).toBeNull();
    expect(activeCriteria(t)).toEqual(["job_title", "sector", "gender", "age", "locations", "devices", "tools"]);
  });

  it("profil parfait : score plein, obligatoires ok", () => {
    const e = evaluateTester(kine, buildTarget(project));
    expect(e.requiredOk).toBe(true);
    expect(e.total).toBe(6);
    expect(e.score).toBe(6);
  });

  it("profil proche : obligatoire ok, score partiel avec le detail du manque", () => {
    const e = evaluateTester({ ...kine, tools: ["Notion"], city: "Lyon", postal_code: "69001" }, buildTarget(project));
    expect(e.requiredOk).toBe(true);
    expect(e.score).toBe(4);
    expect(e.details.filter((d) => !d.ok).map((d) => d.key)).toEqual(["locations", "tools"]);
  });

  it("obligatoire non satisfait -> requiredOk false meme avec un bon score", () => {
    const e = evaluateTester({ ...kine, devices: ["PC Windows"] }, buildTarget(project));
    expect(e.requiredOk).toBe(false);
    expect(e.score).toBe(6);
  });

  it("valeur absente = ko mais unknown", () => {
    const e = evaluateTester({ ...kine, birth_date: null, tools: [] }, buildTarget(project));
    const age = e.details.find((d) => d.key === "age")!;
    expect(age.ok).toBe(false);
    expect(age.unknown).toBe(true);
    expect(age.actual).toBe("Non renseigné");
  });

  it("metier : mots-cles OR, insensible aux accents et a la casse", () => {
    const t = buildTarget(project);
    expect(evaluateTester({ ...kine, job_title: "KINE du sport" }, t).details.find((d) => d.key === "job_title")!.ok).toBe(true);
    expect(evaluateTester({ ...kine, job_title: "Infirmière" }, t).details.find((d) => d.key === "job_title")!.ok).toBe(false);
  });

  it("localisation : ville (accents ignores) ou prefixe de code postal", () => {
    const t = buildTarget(project);
    expect(evaluateTester({ ...kine, city: "montpellier", postal_code: "" }, t).details.find((d) => d.key === "locations")!.ok).toBe(true);
    expect(evaluateTester({ ...kine, city: "Sète", postal_code: "34200" }, t).details.find((d) => d.key === "locations")!.ok).toBe(true);
    expect(evaluateTester({ ...kine, city: "Paris", postal_code: "75001" }, t).details.find((d) => d.key === "locations")!.ok).toBe(false);
  });

  it("requiredServerParams n'envoie que les obligatoires filtrables", () => {
    const p = new URLSearchParams();
    requiredServerParams(buildTarget(project), p);
    expect(p.getAll("devices")).toEqual(["iPhone", "Smartphone Android"]);
    expect(p.has("gender")).toBe(false);
    const p2 = new URLSearchParams();
    requiredServerParams(buildTarget({ ...project, target_criteria: { ...project.target_criteria, required: ["gender", "tools", "job_title"] } }), p2);
    expect(p2.getAll("gender")).toEqual(["female"]);
    expect(p2.has("tools")).toBe(false);
    expect(p2.has("job_title")).toBe(false);
  });

  it("parseTargetCriteria ignore les cles inconnues et les types invalides", () => {
    const c = parseTargetCriteria({ required: ["devices", "foo"], devices: ["Mac", 3], job_title: 42 });
    expect(c.required).toEqual(["devices"]);
    expect(c.devices).toEqual(["Mac"]);
    expect(c.job_title).toBe("");
  });
});
