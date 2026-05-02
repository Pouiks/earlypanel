"use client";

/**
 * Wrapper minimaliste autour de react-markdown.
 *
 * Sert à rendre les `task_wording` (briefs scénarios) écrits par le staff,
 * dans le canvas de création comme dans la vue mission testeur.
 *
 * Sécurité : react-markdown v10 ne parse PAS le HTML brut par défaut, donc
 * un `<script>` collé dans un brief est rendu comme texte. On ne passe pas
 * `rehype-raw` exprès — le périmètre markdown standard suffit largement.
 */

import ReactMarkdown from "react-markdown";

interface MarkdownProps {
  children: string;
  /** Style appliqué au conteneur (typo, couleur, line-height). */
  style?: React.CSSProperties;
  /** Si vrai, applique une typo testeur (plus aéré, plus grand). */
  testerView?: boolean;
}

export default function Markdown({ children, style, testerView = false }: MarkdownProps) {
  const baseStyle: React.CSSProperties = {
    fontSize: testerView ? 15 : 13,
    lineHeight: testerView ? 1.65 : 1.55,
    color: "#1d1d1f",
    ...style,
  };

  return (
    <div style={baseStyle} className="ep-md">
      <ReactMarkdown
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#0A7A5A", textDecoration: "underline" }}>
              {c}
            </a>
          ),
          p: ({ children: c }) => <p style={{ margin: "0 0 10px" }}>{c}</p>,
          ul: ({ children: c }) => <ul style={{ margin: "0 0 10px", paddingLeft: 22 }}>{c}</ul>,
          ol: ({ children: c }) => <ol style={{ margin: "0 0 10px", paddingLeft: 22 }}>{c}</ol>,
          li: ({ children: c }) => <li style={{ margin: "2px 0" }}>{c}</li>,
          strong: ({ children: c }) => <strong style={{ fontWeight: 700, color: "#1d1d1f" }}>{c}</strong>,
          em: ({ children: c }) => <em style={{ fontStyle: "italic" }}>{c}</em>,
          h1: ({ children: c }) => <h3 style={{ fontSize: testerView ? 18 : 15, fontWeight: 700, margin: "8px 0 6px" }}>{c}</h3>,
          h2: ({ children: c }) => <h4 style={{ fontSize: testerView ? 16 : 14, fontWeight: 700, margin: "8px 0 6px" }}>{c}</h4>,
          h3: ({ children: c }) => <h5 style={{ fontSize: testerView ? 15 : 13, fontWeight: 700, margin: "6px 0" }}>{c}</h5>,
          code: ({ children: c }) => (
            <code style={{ background: "#f5f5f7", padding: "1px 6px", borderRadius: 5, fontSize: "0.92em", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
              {c}
            </code>
          ),
          blockquote: ({ children: c }) => (
            <blockquote style={{ borderLeft: "3px solid #d2d2d7", paddingLeft: 12, margin: "8px 0", color: "#6e6e73" }}>
              {c}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
