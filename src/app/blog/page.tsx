import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
import { getAllPosts } from "@/lib/blog";
import { formatPostDate } from "@/lib/blog-content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog · Méthode et pratique des tests utilisateurs",
  description:
    "Guides pratiques sur les tests utilisateurs à distance : cadrer un test, recruter le bon panel, écrire des scénarios, relire les réponses, restituer un rapport qui fait décider.",
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
  openGraph: {
    title: "Blog earlypanel · Tests utilisateurs, méthode et pratique",
    description: "Guides pratiques pour organiser des tests utilisateurs qui produisent des décisions.",
    url: "/blog",
    type: "website",
    locale: "fr_FR",
  },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Accueil", url: SITE_URL }, { name: "Blog", url: `${SITE_URL}/blog` }]} />
      <Nav />
      <main className="blog-main">
        <header className="blog-header">
          <div className="sec-eye">Blog</div>
          <h1>Tests utilisateurs : <em>la méthode</em>, sans jargon.</h1>
          <p className="blog-lede">
            Ce qu&apos;on apprend en recrutant des panels, en relisant des centaines de réponses et en rédigeant des rapports que des équipes produit utilisent vraiment. Des guides courts, applicables tout de suite.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="blog-empty">Premiers articles en préparation.</p>
        ) : (
          <ul className="blog-list">
            {posts.map((p) => (
              <li key={p.slug} className={p.cover ? "blog-card has-cover" : "blog-card"}>
                {p.cover && (
                  <Link href={`/blog/${p.slug}`} className="blog-card-thumb" aria-hidden tabIndex={-1}>
                    <Image src={p.cover} alt="" fill sizes="(max-width: 640px) 100vw, 220px" />
                  </Link>
                )}
                <div className="blog-card-body">
                <div className="blog-card-meta">
                  <time dateTime={p.date}>{formatPostDate(p.date)}</time>
                  <span aria-hidden>·</span>
                  <span>{p.readingMinutes} min de lecture</span>
                </div>
                <h2><Link href={`/blog/${p.slug}`}>{p.title}</Link></h2>
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
        )}
      </main>
      <Footer variant="b2b" />
    </>
  );
}
