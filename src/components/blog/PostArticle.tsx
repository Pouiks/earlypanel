import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/ui/JsonLd";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
import FaqJsonLd from "@/components/ui/FaqJsonLd";
import ArticleBody from "@/components/blog/ArticleBody";
import PostList from "@/components/blog/PostList";
import { postHref, type BlogPost } from "@/lib/blog";
import { formatPostDate } from "@/lib/blog-content";
import { articleJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/site";
import { BOOKING_URL, BOOKING_DURATION_MIN } from "@/lib/cta-links";

/**
 * Page article, commune au blog entreprise (/blog/<slug>) et aux guides
 * testeurs (/testeurs/guides/<slug>). L'audience change la navigation, le
 * fil d'Ariane, l'appel a l'action et les articles suivants : les deux
 * univers ne se melangent jamais.
 */
export default function PostArticle({ post, others }: { post: BlogPost; others: BlogPost[] }) {
  const tester = post.audience === "testeur";
  const url = `${SITE_URL}${postHref(post)}`;
  const section = tester
    ? { name: "Guides testeurs", url: `${SITE_URL}/testeurs/guides`, href: "/testeurs/guides" }
    : { name: "Blog", url: `${SITE_URL}/blog`, href: "/blog" };
  const crumbs = tester
    ? [{ name: "Accueil", url: SITE_URL }, { name: "Devenir testeur", url: `${SITE_URL}/testeurs` }, { name: section.name, url: section.url }, { name: post.title, url }]
    : [{ name: "Accueil", url: SITE_URL }, { name: section.name, url: section.url }, { name: post.title, url }];

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
        section: { name: section.name, url: section.url },
      })} />
      <BreadcrumbJsonLd items={crumbs} />
      {post.faq.length > 0 && <FaqJsonLd items={post.faq} />}
      <Nav audience={tester ? "tester" : "business"} />
      <main className="blog-main">
        <article className="blog-article">
          <header className="blog-article-header">
            <nav className="blog-crumbs" aria-label="Fil d'Ariane">
              <Link href={section.href}>{section.name}</Link>
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

          {post.keyPoints.length > 0 && (
            <section className="blog-keypoints" aria-label="En bref">
              <div className="blog-toc-title">En bref</div>
              <ul>
                {post.keyPoints.map((k) => <li key={k}>{k}</li>)}
              </ul>
            </section>
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

          {tester ? (
            <aside className="blog-cta">
              <h2>Envie de tester des produits et d&apos;être payé pour votre avis ?</h2>
              <p>
                Inscription gratuite en cinq minutes. Vous êtes sélectionné selon votre profil, vous acceptez ou non chaque mission, et vous êtes payé par virement une fois la mission validée.
              </p>
              <div className="blog-cta-btns">
                <Link href="/testeurs#register" className="btn-dark">Rejoindre le panel →</Link>
                <Link href="/testeurs" className="btn-outline">Comment ça marche</Link>
              </div>
            </aside>
          ) : (
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
          )}
        </article>

        {others.length > 0 && (
          <section className="blog-more">
            <h2>À lire ensuite</h2>
            <PostList posts={others} headingLevel="h3" />
          </section>
        )}
      </main>
      <Footer variant={tester ? "b2c" : "b2b"} />
    </>
  );
}
