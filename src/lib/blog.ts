import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  parseFrontmatter,
  slugFromFileName,
  estimateReadingMinutes,
  extractHeadings,
  applyContentTokens,
  splitKeyPoints,
  extractFaq,
  type PostFaqItem,
  type PostFrontmatter,
  type PostAudience,
} from "@/lib/blog-content";
import { PRICE_RANGE_LABEL, BOOKING_DURATION_MIN } from "@/lib/cta-links";

/** Valeurs du site injectables dans un article via {{NOM}}. */
const CONTENT_TOKENS: Record<string, string> = {
  PRICE_RANGE_LABEL,
  BOOKING_DURATION_MIN: String(BOOKING_DURATION_MIN),
};

/**
 * Acces aux articles du blog (content/blog/*.md). Lu au build uniquement :
 * /blog et /blog/[slug] sont statiques (generateStaticParams + dynamicParams
 * false), le sitemap et le RSS aussi. Aucune lecture disque au runtime.
 */

export interface BlogPost extends PostFrontmatter {
  slug: string;
  body: string;
  readingMinutes: number;
  headings: { text: string; id: string }[];
  /** Encart « En bref » (section ## En bref, retiree du corps). */
  keyPoints: string[];
  /** FAQ de l'article (section ## Questions fréquentes), balisee FAQPage. */
  faq: PostFaqItem[];
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/** URL publique d'un article selon son univers. */
export function postHref(post: Pick<BlogPost, "slug" | "audience">): string {
  return post.audience === "testeur" ? `/testeurs/guides/${post.slug}` : `/blog/${post.slug}`;
}

export async function getAllPosts(opts: { includeDrafts?: boolean; audience?: PostAudience } = {}): Promise<BlogPost[]> {
  let files: string[] = [];
  try {
    files = await readdir(BLOG_DIR);
  } catch {
    return [];
  }
  const posts: BlogPost[] = [];
  for (const file of files) {
    const slug = slugFromFileName(file);
    if (!slug) continue;
    const raw = await readFile(path.join(BLOG_DIR, file), "utf8");
    const parsed = parseFrontmatter(raw);
    const frontmatter = parsed.frontmatter;
    const full = applyContentTokens(parsed.body, CONTENT_TOKENS);
    const { keyPoints, body } = splitKeyPoints(full);
    if (frontmatter.draft && !opts.includeDrafts) continue;
    if (opts.audience && frontmatter.audience !== opts.audience) continue;
    posts.push({
      ...frontmatter,
      slug,
      body,
      readingMinutes: estimateReadingMinutes(full),
      headings: extractHeadings(body),
      keyPoints,
      faq: extractFaq(body),
    });
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
  return posts;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts({ includeDrafts: true });
  return posts.find((p) => p.slug === slug) ?? null;
}
