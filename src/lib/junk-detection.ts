/**
 * Detection de valeurs poubelles dans les champs profil testeur.
 *
 * Cas d'usage : un visiteur s'inscrit avec "azerty / qwerty / Test Test /
 * 12345 / aaa" pour explorer la plateforme sans donner de vraies infos.
 * Ces comptes polluent le panel et faussent les statistiques. On bloque
 * en amont (cote API) avec un message clair.
 *
 * Strategie volontairement simple :
 *   1) Liste de mots/sequences obviously faux (ASCII fold + lowercase).
 *   2) Patterns clavier evidents (azerty, qwerty, etc.).
 *   3) Repetition mono-caractere (aaaa, 1111).
 *   4) Trop court (1-2 chars) — pas un nom plausible.
 *
 * On NE veut PAS :
 *   - Bloquer les vrais noms courts (Le, Ng, Vu...) → seuil mini = 2 chars
 *     mais on autorise 2 chars sans pattern repetitif.
 *   - Bloquer les noms a particules ou accentues (D'Aubigne, Müller, Nguyen).
 *   - Faire de la regex "no profanity" : pas notre role.
 *
 * Faux positif accepte vs faux negatif : on prefere bloquer un nom suspect
 * et que le testeur reessaie (le message est explicite). Si quelqu'un
 * s'appelle vraiment "Test" comme nom de famille, c'est statistiquement
 * negligeable, et il pourra contacter le support.
 */

// Mots-cles bidons (ASCII, lowercase, trim).
const JUNK_WORDS = new Set([
  "test", "tests", "testing", "testeur", "testeur1",
  "azerty", "qwerty", "qwertz", "asdf", "asdfgh", "asdfghjkl",
  "demo", "essai", "fake", "false", "anonyme", "anonymous",
  "user", "utilisateur", "admin", "root",
  "exemple", "example", "sample",
  "abc", "abcd", "xyz", "xxx", "yyy", "zzz",
  "toto", "tata", "titi", "tutu", "tete",
  "foo", "bar", "baz", "foobar",
  "lorem", "ipsum",
  "nom", "prenom", "name", "firstname", "lastname",
  "asdfgh", "qsdfgh", "wxcvbn",
  "null", "undefined", "none", "void",
]);

// Sequences clavier en sous-chaine (suffisent partielles : "azertyuiop" matche "azerty").
const KEYBOARD_SEQUENCES = [
  "azerty", "qwerty", "qwertz",
  "asdfgh", "qsdfgh", "zxcvbn", "wxcvbn",
  "12345", "123456", "1234567",
  "abcdef",
];

/**
 * Normalise une string pour comparaison :
 *  - lowercase
 *  - retire les accents (NFD + filter combining marks)
 *  - retire les espaces, tirets, apostrophes, chiffres en queue
 *  - trim
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s\-'.]/g, "")
    .trim();
}

export interface JunkCheckResult {
  ok: boolean;
  reason?: string;
}

/**
 * Verifie qu'une valeur (nom, prenom...) ne ressemble pas a une saisie
 * poubelle. Retourne { ok: true } si ok, ou { ok: false, reason } sinon.
 *
 * Le `fieldLabel` sert a personnaliser le message d'erreur ("Le prenom
 * 'azerty' n'est pas valide.").
 */
export function checkJunkValue(
  value: string,
  fieldLabel: string = "Cette valeur"
): JunkCheckResult {
  if (!value || typeof value !== "string") {
    return { ok: true }; // champs optionnels : on laisse passer le vide.
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true };

  // Trop court (1 char, hors initiale type "C." qu'on accepte plutot dans le nom).
  if (trimmed.length < 2) {
    return { ok: false, reason: `${fieldLabel} est trop court.` };
  }

  const normalized = normalize(trimmed);

  // 1) Mot-cle bidon exact (apres normalisation).
  if (JUNK_WORDS.has(normalized)) {
    return {
      ok: false,
      reason: `${fieldLabel} ne semble pas valide. Merci de saisir une vraie valeur.`,
    };
  }

  // 2) Sequence clavier en sous-chaine (>= 5 chars consecutifs).
  for (const seq of KEYBOARD_SEQUENCES) {
    if (normalized.includes(seq)) {
      return {
        ok: false,
        reason: `${fieldLabel} contient une sequence clavier evidente. Merci de saisir une vraie valeur.`,
      };
    }
  }

  // 3) Repetition mono-caractere (aaaa, 1111, xxxx).
  if (/^(.)\1{2,}$/.test(normalized)) {
    return {
      ok: false,
      reason: `${fieldLabel} ne semble pas valide.`,
    };
  }

  // 4) Que des chiffres.
  if (/^\d+$/.test(normalized)) {
    return {
      ok: false,
      reason: `${fieldLabel} ne peut pas etre uniquement compose de chiffres.`,
    };
  }

  // 5) Caracteres non-alphabetiques majoritaires (>50%).
  const letterCount = (normalized.match(/[a-z]/g) || []).length;
  if (letterCount * 2 < normalized.length) {
    return {
      ok: false,
      reason: `${fieldLabel} ne semble pas valide.`,
    };
  }

  return { ok: true };
}

/**
 * Verifie un set de couples { fieldKey, fieldLabel, value } et retourne
 * la premiere erreur rencontree (ou ok). Pratique cote API pour valider
 * d'un coup first_name + last_name + city.
 */
export function checkJunkFields(
  fields: Array<{ label: string; value: string | null | undefined }>
): JunkCheckResult {
  for (const f of fields) {
    if (f.value == null || f.value === "") continue;
    const res = checkJunkValue(f.value, f.label);
    if (!res.ok) return res;
  }
  return { ok: true };
}
