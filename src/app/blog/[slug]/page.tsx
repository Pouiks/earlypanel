import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostArticle from "@/components/blog/PostArticle";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

// Tout est genere au build : un slug inconnu (ou un guide testeur, qui vit
// sous /testeurs/guides) renvoie 404, aucune lecture disque au runtime.
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getAllPosts({ includeDrafts: true, audience: "entreprise" });
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.audience !== "entreprise") return {};
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
      // og:image : fournie par opengraph-image.tsx (couverture generee, ou le fichier `cover` du frontmatter).
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.audience !== "entreprise") notFound();
  const others = (await getAllPosts({ audience: "entreprise" })).filter((p) => p.slug !== post.slug).slice(0, 3);
  return <PostArticle post={post} others={others} />;
}
