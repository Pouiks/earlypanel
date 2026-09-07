/**
 * Hote canonique du site. Une seule source de verite pour les URLs absolues
 * (JSON-LD, sitemap, robots, breadcrumbs). Les metadata Next (canonical,
 * og:url) utilisent des chemins relatifs resolus via `metadataBase`.
 *
 * La redirection apex (earlypanel.fr) -> www est configuree dans
 * Vercel > Domains (308), pas dans le code.
 */
export const SITE_URL = "https://www.earlypanel.fr";
