/**
 * Validation des documents de projet deposes par le staff (brief client).
 *
 * Meme principe que image-validation : on ne fait pas confiance au
 * Content-Type du navigateur, on regarde les octets. Formats acceptes :
 *   - PDF        : commence par "%PDF-"
 *   - texte      : UTF-8 valide sans octet nul (txt / md, decide par l'extension)
 * Tout le reste (docx, zip, images...) est refuse : le brief se convertit
 * en PDF avant depot, ca evite d'ouvrir le bucket a des formats executables.
 */

export type AllowedDocumentMime = "application/pdf" | "text/plain" | "text/markdown";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_DOCUMENTS_PER_PROJECT = 10;

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

function looksLikePdf(b: Uint8Array): boolean {
  if (b.length < PDF_MAGIC.length) return false;
  return PDF_MAGIC.every((v, i) => b[i] === v);
}

function looksLikeUtf8Text(b: Uint8Array): boolean {
  if (b.length === 0) return false;
  // Octet nul = binaire deguise.
  const probe = b.subarray(0, Math.min(b.length, 64 * 1024));
  for (let i = 0; i < probe.length; i++) if (probe[i] === 0) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(b);
    return true;
  } catch {
    return false;
  }
}

/** Extension en minuscules, sans point, ou "" si absente. */
export function fileExtension(name: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/**
 * Detecte le type reel. `fileName` ne sert qu'a distinguer md / txt pour
 * un contenu texte ; il ne peut pas transformer un binaire en texte.
 */
export function detectDocumentMime(buffer: Uint8Array, fileName: string): AllowedDocumentMime | null {
  if (looksLikePdf(buffer)) return "application/pdf";
  const ext = fileExtension(fileName);
  if ((ext === "txt" || ext === "md" || ext === "markdown") && looksLikeUtf8Text(buffer)) {
    return ext === "txt" ? "text/plain" : "text/markdown";
  }
  return null;
}

export function extensionForDocumentMime(mime: AllowedDocumentMime): string {
  switch (mime) {
    case "application/pdf": return "pdf";
    case "text/markdown": return "md";
    default: return "txt";
  }
}

/** Nom d'origine nettoye pour l'affichage et le Content-Disposition. */
export function sanitizeFileName(name: string): string {
  const base = name.trim().split(/[\\/]/).pop() ?? "";
  // Garde lettres (accents compris), chiffres, espace, point, tiret, underscore.
  const cleaned = base.replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim();
  return (cleaned || "document").slice(0, 120);
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
