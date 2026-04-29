/**
 * Validation IBAN (MOD-97-10) + helpers (last4, country, BIC pour FR).
 *
 * Reference : ISO 13616 / ECBS EBS204.
 * Algorithme MOD-97-10 :
 *   1) Deplacer les 4 premiers caracteres a la fin
 *   2) Convertir lettres en chiffres (A=10 ... Z=35)
 *   3) Calculer le reste modulo 97 : doit etre egal a 1.
 *
 * Longueurs IBAN par pays (whitelist des pays SEPA + UK/CH).
 */

const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22,
  DK: 18, EE: 20, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GI: 23,
  GL: 18, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21,
  LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28,
  PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27,
};

/**
 * Normalise une saisie IBAN : majuscules, sans espace, sans tiret.
 */
export function normalizeIban(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Formatte un IBAN par groupes de 4 pour affichage (ex: "FR76 3000 ...").
 */
export function formatIban(iban: string): string {
  const clean = normalizeIban(iban);
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Verifie qu'un IBAN est syntaxiquement et mathematiquement valide.
 * Retourne le code pays si valide, null sinon.
 */
export function validateIban(raw: string): { valid: true; country: string; clean: string } | { valid: false; reason: string } {
  const clean = normalizeIban(raw);

  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(clean)) {
    return { valid: false, reason: "Format IBAN invalide" };
  }

  const country = clean.slice(0, 2);
  const expectedLength = IBAN_LENGTHS[country];
  if (!expectedLength) {
    return { valid: false, reason: `Pays IBAN non supporte (${country})` };
  }
  if (clean.length !== expectedLength) {
    return { valid: false, reason: `Longueur IBAN invalide pour ${country} (attendu ${expectedLength}, recu ${clean.length})` };
  }

  if (!mod97Check(clean)) {
    return { valid: false, reason: "Cle de controle IBAN invalide" };
  }

  return { valid: true, country, clean };
}

/**
 * MOD-97-10 sur un IBAN normalise.
 * On bouge les 4 premiers caracteres a la fin, on convertit les lettres
 * en chiffres (A=10..Z=35), puis on calcule le reste modulo 97 par chunks
 * pour eviter les overflows (numbers JS = float 64 bits).
 */
function mod97Check(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numeric = "";
  for (const ch of rearranged) {
    if (ch >= "0" && ch <= "9") {
      numeric += ch;
    } else {
      // A=10, B=11, ..., Z=35
      numeric += (ch.charCodeAt(0) - 55).toString();
    }
  }

  // Calcul mod 97 par chunks de 9 chiffres pour rester dans Number.MAX_SAFE_INTEGER.
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 9) {
    const chunk = remainder.toString() + numeric.slice(i, i + 9);
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder === 1;
}

/**
 * Extrait les 4 derniers caracteres alphanumeriques pour affichage masque.
 * Ex: "FR7630001007941234567890185" -> "0185".
 */
export function getIbanLast4(iban: string): string {
  const clean = normalizeIban(iban);
  return clean.slice(-4);
}

/**
 * Pour les IBAN francais, deduit le BIC a partir du code banque.
 * Pour les autres pays, retourne null : le testeur doit le fournir.
 *
 * NOTE : on ne maintient PAS la table complete des BIC FR (5000+ entrees).
 * On retourne null pour le moment et on demande au testeur. Une vraie
 * deduction necessiterait une table externe ou une API Banque de France.
 */
export function deriveBicFromIban(_iban: string): string | null {
  return null;
}

/**
 * Whitelist pays de residence fiscale supportes (SEPA + EEE + UK/CH).
 * Pour DAS-2 / non-residents, on filtrera dans le rapport.
 */
export const FISCAL_RESIDENCE_COUNTRIES = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "LU", label: "Luxembourg" },
  { code: "DE", label: "Allemagne" },
  { code: "ES", label: "Espagne" },
  { code: "IT", label: "Italie" },
  { code: "PT", label: "Portugal" },
  { code: "NL", label: "Pays-Bas" },
  { code: "AT", label: "Autriche" },
  { code: "IE", label: "Irlande" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "OTHER", label: "Autre" },
] as const;

export function isValidFiscalCountry(code: string): boolean {
  return FISCAL_RESIDENCE_COUNTRIES.some((c) => c.code === code);
}

/**
 * Validation BIC (optionnel) : 8 ou 11 caracteres alphanumeriques.
 */
export function validateBic(raw: string): boolean {
  if (!raw) return true; // optionnel
  const clean = raw.replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean);
}
