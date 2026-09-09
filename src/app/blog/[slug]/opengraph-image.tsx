import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { postCover, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/cover";

// Couverture OpenGraph de chaque article, generee au build (voir src/lib/og/cover.tsx).
export const alt = "earlypanel · article du blog";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams() {
  const posts = await getAllPosts({ includeDrafts: true, audience: "entreprise" });
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.audience !== "entreprise") notFound();
  return postCover(post);
}
