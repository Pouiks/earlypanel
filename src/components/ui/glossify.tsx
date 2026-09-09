/**
 * `glossify(text)` : annote la premiere occurrence de chaque terme du
 * glossaire dans un texte (lien + infobulle), et laisse le reste intact.
 *
 * Utilisable dans les composants serveur : la portee « une fois par page »
 * est tenue par un Set memoise par requete via React `cache`. Les composants
 * client (ArticleBody) passent leur propre Set.
 *
 * Ne jamais appliquer sur un titre (h1/h2/h3), un bouton, la navigation ou
 * le pied de page : uniquement sur des paragraphes et des listes.
 */
import { cache, type ReactNode } from "react";
import GlossaryTerm from "@/components/ui/GlossaryTerm";
import { splitGlossary } from "@/lib/glossary-inline";

export const pageGlossaryScope = cache(() => new Set<string>());

export function glossify(text: string, seen: Set<string> = pageGlossaryScope()): ReactNode {
  const segments = splitGlossary(text, seen);
  if (segments.length === 1 && typeof segments[0] === "string") return text;
  return segments.map((s, i) =>
    typeof s === "string" ? s : (
      <GlossaryTerm key={`${s.slug}-${i}`} slug={s.slug} term={s.term} definition={s.definition}>
        {s.text}
      </GlossaryTerm>
    ),
  );
}
