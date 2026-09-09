/**
 * Detection des termes du glossaire dans un texte, pour l'infobulle
 * automatique (composant GlossaryTerm).
 *
 * Regles :
 *  - seuls les termes qui declarent des `aliases` sont detectes ; les mots
 *    cles que les pages piliers possedent (« test utilisateur », « testeur
 *    remunere ») n'ont pas d'alias et ne sont jamais annotes ;
 *  - premiere occurrence seulement : l'appelant fournit un Set `seen`
 *    partage pour toute la page, un slug deja vu n'est plus annote ;
 *  - un terme n'est reconnu qu'entoure de non-lettres : « earlypanel » ne
 *    contient pas « panel » ;
 *  - l'alias le plus long gagne (« prototype cliquable » avant « prototype »).
 *
 * Fonction pure, sans React : testee dans tests/unit/glossary-inline.test.ts.
 */
import { GLOSSARY, type GlossaryTerm } from "@/data/glossaire";

export interface GlossaryMatch {
  slug: string;
  term: string;
  definition: string;
  /** Texte tel qu'il apparait dans la source (casse et pluriel conserves). */
  text: string;
}
export type GlossarySegment = string | GlossaryMatch;

interface Alias {
  slug: string;
  pattern: RegExp;
}

const WORD_GAP = "[\\s\\u00a0]+";

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/** « critère de réussite » -> /critères?[\s ]+des?[\s ]+réussites?/ */
function aliasSource(alias: string): string {
  return alias
    .split(/\s+/)
    .map((w) => escape(w) + "s?")
    .join(WORD_GAP);
}

let cache: { combined: RegExp; aliases: Alias[]; bySlug: Map<string, GlossaryTerm> } | null = null;

function build() {
  if (cache) return cache;
  const bySlug = new Map<string, GlossaryTerm>();
  const list: { slug: string; alias: string }[] = [];
  for (const t of GLOSSARY) {
    bySlug.set(t.slug, t);
    for (const a of t.aliases ?? []) list.push({ slug: t.slug, alias: a });
  }
  list.sort((a, b) => b.alias.length - a.alias.length);
  const aliases: Alias[] = list.map((l) => ({
    slug: l.slug,
    pattern: new RegExp(`^${aliasSource(l.alias)}$`, "iu"),
  }));
  const combined = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${list.map((l) => aliasSource(l.alias)).join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  cache = { combined, aliases, bySlug };
  return cache;
}

function resolveSlug(text: string, aliases: Alias[]): string | null {
  for (const a of aliases) if (a.pattern.test(text)) return a.slug;
  return null;
}

/**
 * Decoupe `text` en segments : chaines brutes et correspondances glossaire.
 * Mute `seen` (ajoute chaque slug annote) pour que les appels suivants sur
 * la meme page n'annotent plus ce terme.
 */
export function splitGlossary(text: string, seen: Set<string>): GlossarySegment[] {
  if (!text) return [text];
  const { combined, aliases, bySlug } = build();
  const out: GlossarySegment[] = [];
  let last = 0;
  combined.lastIndex = 0;
  for (let m = combined.exec(text); m; m = combined.exec(text)) {
    const slug = resolveSlug(m[0], aliases);
    if (!slug || seen.has(slug)) continue;
    const t = bySlug.get(slug)!;
    seen.add(slug);
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ slug, term: t.term, definition: t.definition, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
}

/** Termes annotables (avec alias), pour les pages qui les listent. */
export function inlineGlossaryTerms(): GlossaryTerm[] {
  return GLOSSARY.filter((t) => (t.aliases?.length ?? 0) > 0);
}
