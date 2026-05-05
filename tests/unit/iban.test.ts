import { describe, it, expect } from "vitest";
import {
  normalizeIban,
  formatIban,
  validateIban,
  getIbanLast4,
  isValidFiscalCountry,
  validateBic,
} from "@/lib/iban";

// IBANs de test reels et MOD-97-10 valides (sources : ECBS / Wikipedia IBAN).
// Ne JAMAIS y mettre un IBAN reel d'un testeur ou client.
const VALID = {
  FR: "FR1420041010050500013M02606",
  DE: "DE89370400440532013000",
  CH: "CH9300762011623852957",
  GB: "GB82WEST12345698765432",
  BE: "BE68539007547034",
  ES: "ES9121000418450200051332",
};

describe("normalizeIban", () => {
  it("retire espaces et tirets, met en majuscules", () => {
    expect(normalizeIban("fr14 2004 1010-0505 0001 3m02 606")).toBe(
      "FR1420041010050500013M02606",
    );
  });

  it("idempotent sur un IBAN deja propre", () => {
    expect(normalizeIban(VALID.FR)).toBe(VALID.FR);
  });
});

describe("formatIban", () => {
  it("groupe par 4 caracteres", () => {
    expect(formatIban(VALID.FR)).toBe("FR14 2004 1010 0505 0001 3M02 606");
  });
});

describe("validateIban — succes", () => {
  it.each(Object.entries(VALID))("accepte un IBAN %s valide", (country, iban) => {
    const r = validateIban(iban);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.country).toBe(country);
      expect(r.clean).toBe(iban);
    }
  });

  it("accepte une saisie avec espaces", () => {
    const r = validateIban("FR14 2004 1010 0505 0001 3M02 606");
    expect(r.valid).toBe(true);
  });

  it("accepte une saisie en minuscules", () => {
    const r = validateIban(VALID.FR.toLowerCase());
    expect(r.valid).toBe(true);
  });
});

describe("validateIban — echecs", () => {
  it("rejette un format invalide (chiffres au debut)", () => {
    const r = validateIban("1414141414141414");
    expect(r.valid).toBe(false);
  });

  it("rejette un pays non supporte", () => {
    // BR (Bresil) : pays valide ISO mais pas dans notre whitelist SEPA+UK+CH.
    const r = validateIban("BR1800360305000010009795493C1");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/pays/i);
  });

  it("rejette une longueur incorrecte pour le pays", () => {
    const r = validateIban("FR142004101005050001"); // FR doit faire 27
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/longueur/i);
  });

  it("rejette une cle de controle MOD-97 invalide", () => {
    // FR mais cle de controle 99 (improbable correcte) → mod97 != 1
    const r = validateIban("FR9920041010050500013M02606");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/cle de controle/i);
  });

  it("rejette une string vide", () => {
    expect(validateIban("").valid).toBe(false);
  });

  it("rejette des caracteres speciaux", () => {
    expect(validateIban("FR!!2004101005050001!!").valid).toBe(false);
  });
});

describe("getIbanLast4", () => {
  it("retourne les 4 derniers caracteres", () => {
    expect(getIbanLast4(VALID.FR)).toBe("2606");
    expect(getIbanLast4(VALID.DE)).toBe("3000");
  });

  it("normalise avant extraction", () => {
    expect(getIbanLast4("FR14 2004 1010 0505 0001 3M02 606")).toBe("2606");
  });
});

describe("isValidFiscalCountry", () => {
  it.each(["FR", "BE", "CH", "LU", "DE", "ES", "IT", "PT", "NL", "AT", "IE", "GB", "OTHER"])(
    "accepte %s",
    (code) => {
      expect(isValidFiscalCountry(code)).toBe(true);
    },
  );

  it.each(["US", "BR", "JP", "", "fr"])("rejette %s", (code) => {
    expect(isValidFiscalCountry(code)).toBe(false);
  });
});

describe("validateBic", () => {
  it("accepte un BIC vide (optionnel)", () => {
    expect(validateBic("")).toBe(true);
  });

  it("accepte un BIC 8 caracteres", () => {
    expect(validateBic("BNPAFRPP")).toBe(true);
  });

  it("accepte un BIC 11 caracteres", () => {
    expect(validateBic("BNPAFRPPXXX")).toBe(true);
  });

  it("accepte un BIC avec espaces", () => {
    expect(validateBic("BNPA FRPP")).toBe(true);
  });

  it("rejette un BIC trop court", () => {
    expect(validateBic("BNPA")).toBe(false);
  });

  it("rejette un BIC avec chiffres en position pays", () => {
    expect(validateBic("BNPA12PP")).toBe(false);
  });
});
