import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  parseFrontmatter,
  slugFromFileName,
  estimateReadingMinutes,
  extractHeadings,
  applyContentTokens,
  type PostFrontmatter,
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
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export async function getAllPosts(opts: { includeDrafts?: boolean } = {}): Promise<BlogPost[]> {
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
    const body = applyContentTokens(parsed.body, CONTENT_TOKENS);
    if (frontmatter.draft && !opts.includeDrafts) continue;
    posts.push({
      ...frontmatter,
      slug,
      body,
      readingMinutes: estimateReadingMinutes(body),
      headings: extractHeadings(body),
    });
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
  return posts;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts({ includeDrafts: true });
  return posts.find((p) => p.slug === slug) ?? null;
}
