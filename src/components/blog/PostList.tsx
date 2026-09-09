import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@/lib/blog";
import { postHref } from "@/lib/blog";
import { formatPostDate } from "@/lib/blog-content";

/** Liste de cartes d'articles (blog entreprise et guides testeurs). */
/** `grid` : cartes en grille pleine largeur (index) ; `list` : colonne (fin d'article). */
export default function PostList({ posts, headingLevel = "h2", layout = "list" }: { posts: BlogPost[]; headingLevel?: "h2" | "h3"; layout?: "grid" | "list" }) {
  const H = headingLevel;
  return (
    <ul className={layout === "grid" ? "blog-list blog-grid" : "blog-list"}>
      {posts.map((p) => (
        <li key={p.slug} className={p.cover ? "blog-card has-cover" : "blog-card"}>
          {p.cover && (
            <Link href={postHref(p)} className="blog-card-thumb" aria-hidden tabIndex={-1}>
              <Image src={p.cover} alt="" fill sizes="(max-width: 640px) 100vw, 220px" />
            </Link>
          )}
          <div className="blog-card-body">
            <div className="blog-card-meta">
              <time dateTime={p.date}>{formatPostDate(p.date)}</time>
              <span aria-hidden>·</span>
              <span>{p.readingMinutes} min de lecture</span>
            </div>
            <H><Link href={postHref(p)}>{p.title}</Link></H>
            <p>{p.description}</p>
            {p.tags.length > 0 && (
              <div className="blog-tags">
                {p.tags.map((t) => <span key={t} className="blog-tag">{t}</span>)}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
