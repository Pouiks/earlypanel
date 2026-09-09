import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/ui/JsonLd";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
import ArticleBody from "@/components/blog/ArticleBody";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { formatPostDate } from "@/lib/blog-content";
import { articleJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";
import { BOOKING_URL, BOOKING_DURATION_MIN } from "@/lib/cta-links";

// Tout est genere au build : un slug inconnu renvoie 404, aucune lecture
// disque au runtime.
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getAllPosts({ includeDrafts: true });
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: post.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      locale: "fr_FR",
      publishedTime: `${post.date}T09:00:00+02:00`,
      modifiedTime: `${post.updated ?? post.date}T09:00:00+02:00`,
      authors: ["earlypanel"],
      tags: post.tags,
      ...(post.cover ? { images: [{ url: post.cover, alt: post.cover_alt ?? post.title }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const others = (await getAllPosts()).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <JsonLd data={articleJsonLd({
        title: post.title,
        description: post.description,
        url,
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        tags: post.tags,
        image: post.cover ? `${SITE_URL}${post.cover}` : undefined,
      })} />
      <BreadcrumbJsonLd items={[
        { name: "Accueil", url: SITE_URL },
        { name: "Blog", url: `${SITE_URL}/blog` },
        { name: post.title, url },
      ]} />
      <Nav />
      <main className="blog-main">
        <article className="blog-article">
          <header className="blog-article-header">
            <nav className="blog-crumbs" aria-label="Fil d'Ariane">
              <Link href="/blog">Blog</Link>
              {post.tags[0] && <><span aria-hidden>·</span><span>{post.tags[0]}</span></>}
            </nav>
            <h1>{post.title}</h1>
            <p className="blog-lede">{post.description}</p>
            <div className="blog-card-meta">
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              {post.updated && post.updated !== post.date && <><span aria-hidden>·</span><span>mis à jour le {formatPostDate(post.updated)}</span></>}
              <span aria-hidden>·</span>
              <span>{post.readingMinutes} min de lecture</span>
              <span aria-hidden>·</span>
              <span>par earlypanel</span>
            </div>
          </header>

          {post.cover && (
            <figure className="blog-cover">
              <Image src={post.cover} alt={post.cover_alt ?? post.title} fill sizes="(max-width: 760px) 100vw, 760px" priority />
            </figure>
          )}

          {post.headings.length >= 3 && (
            <nav className="blog-toc" aria-label="Sommaire">
              <div className="blog-toc-title">Dans cet article</div>
              <ol>
                {post.headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}
              </ol>
            </nav>
          )}

          <ArticleBody>{post.body}</ArticleBody>

          <aside className="blog-cta">
            <h2>Vous préparez un test utilisateur ?</h2>
            <p>
              Un appel de {BOOKING_DURATION_MIN} minutes suffit pour savoir si un test a du sens dans votre situation, et à quoi il ressemblerait. Pas d&apos;engagement, pas de présentation commerciale.
            </p>
            <div className="blog-cta-btns">
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark">Réserver un appel gratuit →</a>
              <Link href="/entreprises" className="btn-outline">Voir l&apos;offre</Link>
            </div>
          </aside>
        </article>

        {others.length > 0 && (
          <section className="blog-more">
            <h2>À lire ensuite</h2>
            <ul className="blog-list">
              {others.map((p) => (
                <li key={p.slug} className="blog-card">
                  <div className="blog-card-meta">
                    <time dateTime={p.date}>{formatPostDate(p.date)}</time>
                    <span aria-hidden>·</span>
                    <span>{p.readingMinutes} min</span>
                  </div>
                  <h3><Link href={`/blog/${p.slug}`}>{p.title}</Link></h3>
                  <p>{p.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer variant="b2b" />
    </>
  );
}
