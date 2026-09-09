"use client";

/**
 * Corps d'article de blog : Markdown -> HTML avec ancres sur les titres,
 * liens internes en <Link>, liens externes en nouvel onglet. Pas de HTML
 * brut (react-markdown v10 ne le parse pas), pas de rehype-raw.
 */
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import type { ReactNode } from "react";
import { headingId } from "@/lib/blog-content";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

export default function ArticleBody({ children }: { children: string }) {
  return (
    <div className="blog-prose">
      <ReactMarkdown
        components={{
          h2: ({ children: c }) => <h2 id={headingId(textOf(c))}>{c}</h2>,
          h3: ({ children: c }) => <h3 id={headingId(textOf(c))}>{c}</h3>,
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
