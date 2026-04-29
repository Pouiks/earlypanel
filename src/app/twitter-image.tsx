// Reutilise la meme image OG pour Twitter/X.
// Next 16 file convention : ce fichier produit /twitter-image et est
// automatiquement injecte dans <meta name="twitter:image">.
// `runtime` doit etre declare localement (Next 16 / Turbopack interdit
// le reexport pour les segment options).
export const runtime = "edge";
export { default, alt, size, contentType } from "./opengraph-image";
