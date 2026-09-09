/**
 * Blog : parsing du frontmatter et helpers purs (sans acces disque).
 * Les articles vivent dans content/blog/<slug>.md. Teste dans
 * tests/unit/blog-content.test.ts. L'acces fichiers est dans src/lib/blog.ts.
 */

export interface PostFrontmatter {
  title: string;
  description: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** ISO date, optionnelle */
  updated?: string;
  tags: string[];
  /** Brouillon : exclu de la liste, du sitemap et du RSS (mais l'URL existe). */
  draft: boolean;
  /** Image de couverture, chemin public absolu (ex. /blog/mon-slug/cover.webp), 16:9. */
  cover?: string;
  /** Texte alternatif de la couverture (obligatoire si cover). */
  cover_alt?: string;
}

export interface ParsedPost {
  frontmatter: PostFrontmatter;
  body: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugFromFileName(fileName: string): string | null {
  if (!fileName.endsWith(".md")) return null;
  const slug = fileName.slice(0, -3);
  return SLUG_RE.test(slug) ? slug : null;
}

function stripQuotes(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

function parseList(v: string): string[] {
  const t = v.trim();
  if (t.startsWith("[") && t.endsWith("]")) {
    return t.slice(1, -1).split(",").map(stripQuotes).map((s) => s.trim()).filter(Boolean);
  }
  return t ? [stripQuotes(t)] : [];
}

/**
 * Frontmatter YAML minimal : `cle: valeur` sur une ligne, listes `[a, b]`,
 * booleens true/false. Volontairement sans dependance : on controle le format
 * des fichiers que l'on ecrit.
 */
export function parseFrontmatter(raw: string): ParsedPost {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("Frontmatter manquant (bloc --- en tete de fichier)");
  const fields: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  const title = stripQuotes(fields.title ?? "");
  const description = stripQuotes(fields.description ?? "");
  const date = stripQuotes(fields.date ?? "");
  if (!title) throw new Error("Frontmatter : title requis");
  if (!description) throw new Error("Frontmatter : description requise");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Frontmatter : date au format YYYY-MM-DD requise");
  const updated = fields.updated ? stripQuotes(fields.updated) : undefined;
  if (updated && !/^\d{4}-\d{2}-\d{2}$/.test(updated)) throw new Error("Frontmatter : updated au format YYYY-MM-DD");
  const cover = fields.cover ? stripQuotes(fields.cover) : undefined;
  if (cover && !cover.startsWith("/blog/")) throw new Error("Frontmatter : cover doit etre un chemin public sous /blog/ (fichier dans public/blog/)");
  const cover_alt = fields.cover_alt ? stripQuotes(fields.cover_alt) : undefined;
  if (cover && !cover_alt) throw new Error("Frontmatter : cover_alt requis quand cover est defini");
  return {
    frontmatter: {
      title,
      description,
      date,
      updated,
      tags: fields.tags ? parseList(fields.tags) : [],
      draft: stripQuotes(fields.draft ?? "false") === "true",
      cover,
      cover_alt,
    },
    body: m[2].trim(),
  };
}

/** Temps de lecture en minutes, 200 mots/min, minimum 1. */
export function estimateReadingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()!-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Extrait les titres ## pour un sommaire. */
export function extractHeadings(markdown: string): { text: string; id: string }[] {
  const out: { text: string; id: string }[] = [];
  for (const line of markdown.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) out.push({ text: m[1], id: headingId(m[1]) });
  }
  return out;
}

/** Id d'ancre stable pour un titre (accents retires, minuscules, tirets). */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Jetons de contenu : `{{NOM}}` remplace par une valeur du site (ex. la
 * fourchette de prix, source unique dans src/lib/cta-links.ts). Un jeton
 * inconnu est laisse tel quel pour etre repere a la relecture.
 */
export function applyContentTokens(markdown: string, tokens: Record<string, string>): string {
  return markdown.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (m, key: string) => (key in tokens ? tokens[key] : m));
}

export function formatPostDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
