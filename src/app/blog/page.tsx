import type { Metadata } from "next";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
import PostList from "@/components/blog/PostList";
import { getAllPosts } from "@/lib/blog";
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
  const posts = await getAllPosts({ audience: "entreprise" });
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
          <PostList posts={posts} />
        )}
      </main>
      <Footer variant="b2b" />
    </>
  );
}
