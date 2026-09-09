import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
import PostList from "@/components/blog/PostList";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";
import { glossify } from "@/components/ui/glossify";

export const metadata: Metadata = {
  title: "Guides pour testeurs rémunérés · Missions, rémunération, conseils",
  description:
    "Tout ce qu'un testeur d'applications doit savoir : comment ça marche, combien on gagne, comment bien répondre à une mission pour être payé, ce que deviennent vos données.",
  alternates: { canonical: "/testeurs/guides" },
  openGraph: {
    title: "Guides pour testeurs rémunérés · earlypanel",
    description: "Comment ça marche, combien on gagne, comment bien répondre à une mission. Sans promesse irréaliste.",
    url: "/testeurs/guides",
    type: "website",
    locale: "fr_FR",
  },
};

export default async function TesterGuidesIndexPage() {
  const posts = await getAllPosts({ audience: "testeur" });
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: "Accueil", url: SITE_URL },
        { name: "Devenir testeur", url: `${SITE_URL}/testeurs` },
        { name: "Guides testeurs", url: `${SITE_URL}/testeurs/guides` },
      ]} />
      <Nav audience="tester" />
      <main className="blog-main blog-index">
        <header className="blog-header">
          <div className="sec-eye">Guides testeurs</div>
          <h1>Tester des produits, <em>être payé</em> pour son avis : le mode d&apos;emploi.</h1>
          <p className="blog-lede">{glossify("Ce qu'on attend d'un testeur, ce qu'on gagne vraiment, comment répondre pour que chaque mission soit validée. Des guides courts, honnêtes, sans promesse de revenu miracle.")}</p>
          <p className="blog-lede">
            Pas encore inscrit ? <Link href="/testeurs#register">Rejoindre le panel</Link> prend cinq minutes.
          </p>
        </header>
        {posts.length === 0 ? (
          <p className="blog-empty">Premiers guides en préparation.</p>
        ) : (
          <PostList posts={posts} layout="grid" />
        )}
      </main>
      <Footer variant="b2c" />
    </>
  );
}
