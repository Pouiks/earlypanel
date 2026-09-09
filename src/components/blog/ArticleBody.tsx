"use client";

/**
 * Corps d'article de blog : Markdown -> HTML avec ancres sur les titres,
 * liens internes en <Link>, liens externes en nouvel onglet. Pas de HTML
 * brut (react-markdown v10 ne le parse pas), pas de rehype-raw.
 *
 * Les termes du glossaire sont annotes (lien + infobulle) a leur premiere
 * occurrence dans les paragraphes, listes, gras et italiques ; jamais dans
 * les titres ni dans les liens. `skip` : slugs deja annotes plus haut dans
 * la page (lede, En bref), pour tenir la regle « une fois par page ».
 */
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import type { ReactNode } from "react";
import { headingId } from "@/lib/blog-content";
import { glossify } from "@/components/ui/glossify";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/** Annote les enfants texte d'un noeud inline, sans toucher aux elements. */
function glossifyChildren(children: ReactNode, seen: Set<string>): ReactNode {
  if (typeof children === "string") return glossify(children, seen);
  if (Array.isArray(children)) {
    return children.map((c, i) => (typeof c === "string" ? <span key={i}>{glossify(c, seen)}</span> : c));
  }
  return children;
}

export default function ArticleBody({ children, skip = [] }: { children: string; skip?: string[] }) {
  // Cree a chaque rendu : l'ordre des noeuds est identique cote serveur et
  // cote client, donc le resultat aussi (pas de decalage d'hydratation).
  const seen = new Set<string>(skip);
  return (
    <div className="blog-prose">
      <ReactMarkdown
        components={{
          h2: ({ children: c }) => <h2 id={headingId(textOf(c))}>{c}</h2>,
          h3: ({ children: c }) => <h3 id={headingId(textOf(c))}>{c}</h3>,
          p: ({ children: c }) => <p>{glossifyChildren(c, seen)}</p>,
          li: ({ children: c }) => <li>{glossifyChildren(c, seen)}</li>,
          strong: ({ children: c }) => <strong>{glossifyChildren(c, seen)}</strong>,
          em: ({ children: c }) => <em>{glossifyChildren(c, seen)}</em>,
          img: ({ src, alt, title }) => {
            const s = typeof src === "string" ? src : "";
            const caption = title || "";
            return (
              <span className="blog-figure">
                {/* eslint-disable-next-line @next/next/no-img-element -- image d'article, dimensions inconnues au build */}
                <img src={s} alt={alt ?? ""} loading="lazy" decoding="async" />
                {caption && <span className="blog-caption">{caption}</span>}
              </span>
            );
          },
          a: ({ href, children: c }) => {
            const h = href ?? "#";
            if (h.startsWith("/")) return <Link href={h}>{c}</Link>;
            if (h.startsWith("#")) return <a href={h}>{c}</a>;
            return <a href={h} target="_blank" rel="noopener noreferrer">{c}</a>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
