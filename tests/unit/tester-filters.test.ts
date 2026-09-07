import { describe, it, expect } from "vitest";
import { emptyTesterFilters, appendTesterFiltersToParams, countActiveTesterFilters } from "@/lib/tester-filters";
import { LEGACY_GENDER_MAP, LEGACY_CSP_MAP, GENDER_VALUES, MOBILE_OS, DEVICES } from "@/lib/tester-vocab";
import { CSPS } from "@/lib/taxonomy";

// Les filtres staff et le ciblage projet doivent parler le vocabulaire des
// colonnes testeurs. On verrouille : mode strict par defaut, mapping des
// anciens libelles projet vers des valeurs qui existent vraiment.

describe("tester-filters", () => {
  it("strict par defaut : pas de include_unknown dans l'URL", () => {
    const p = new URLSearchParams();
    appendTesterFiltersToParams(p, emptyTesterFilters());
    expect(p.has("include_unknown")).toBe(false);
  });

  it("include_unknown=1 quand la case est cochee, et n'est pas compte comme un filtre", () => {
    const f = { ...emptyTesterFilters(), includeUnknown: true };
    const p = new URLSearchParams();
    appendTesterFiltersToParams(p, f);
    expect(p.get("include_unknown")).toBe("1");
    expect(countActiveTesterFilters(f)).toBe(0);
  });

  it("location est ajoute (append) pour cumuler avec les villes du projet", () => {
    const p = new URLSearchParams();
    p.append("location", "Paris");
    appendTesterFiltersToParams(p, { ...emptyTesterFilters(), location: "Lyon" });
    expect(p.getAll("location")).toEqual(["Paris", "Lyon"]);
  });
});

describe("tester-vocab : anciens libelles projet -> valeurs DB", () => {
  it("genres FR -> male/female/non_binary", () => {
    for (const v of Object.values(LEGACY_GENDER_MAP)) expect(GENDER_VALUES).toContain(v);
    expect(LEGACY_GENDER_MAP["Femme"]).toBe("female");
  });

  it("CSP ProjectForm -> taxonomy CSPS", () => {
    for (const v of Object.values(LEGACY_CSP_MAP)) expect(CSPS as readonly string[]).toContain(v);
  });

  it("OS mobile et appareils couvrent les valeurs de l'onboarding", () => {
    expect(MOBILE_OS).toContain("HarmonyOS");
    expect(MOBILE_OS).toContain("Aucun smartphone");
    expect(DEVICES).toContain("Autre tablette");
  });
});
