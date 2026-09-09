import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostArticle from "@/components/blog/PostArticle";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

// Guides testeurs : memes fichiers Markdown que le blog (content/blog),
// audience: testeur. Generes au build, 404 pour un slug inconnu.
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getAllPosts({ includeDrafts: true, audience: "testeur" });
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.audience !== "testeur") return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/testeurs/guides/${post.slug}` },
    robots: post.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/testeurs/guides/${post.slug}`,
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

export default async function TesterGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.audience !== "testeur") notFound();
  const others = (await getAllPosts({ audience: "testeur" })).filter((p) => p.slug !== post.slug).slice(0, 3);
  return <PostArticle post={post} others={others} />;
}
