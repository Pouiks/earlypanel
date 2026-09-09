/**
 * Couverture OpenGraph generee au build pour chaque article (blog et guides
 * testeurs) : 1200 x 630, titre sur fond blanc, accent vert, marque en bas.
 * Un article qui declare `cover` dans son frontmatter garde son image : on
 * renvoie le fichier de public/ tel quel.
 *
 * Utilise par src/app/blog/[slug]/opengraph-image.tsx et
 * src/app/testeurs/guides/[slug]/opengraph-image.tsx.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BlogPost } from "@/lib/blog";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const GREEN = "#0A7A5A";
const BLACK = "#1d1d1f";
const GRAY = "#6e6e73";

async function fonts() {
  const dir = join(process.cwd(), "src/lib/og");
  const [regular, bold] = await Promise.all([
    readFile(join(dir, "Inter-Regular.woff")),
    readFile(join(dir, "Inter-Bold.woff")),
  ]);
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/** Taille de titre selon sa longueur, pour tenir sur trois lignes au plus. */
function titleSize(title: string): number {
  if (title.length <= 45) return 68;
  if (title.length <= 70) return 58;
  if (title.length <= 95) return 50;
  return 44;
}

export async function postCover(post: BlogPost): Promise<Response> {
  if (post.cover) {
    const rel = post.cover.replace(/^\//, "");
    const ext = rel.split(".").pop()?.toLowerCase() ?? "png";
    const bytes = await readFile(join(process.cwd(), "public", rel));
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": MIME[ext] ?? "image/png" } });
  }

  const tester = post.audience === "testeur";
  const eyebrow = tester ? "Guides testeurs" : "Blog";
  const tag = post.tags[0];
  const meta = [tag, `${post.readingMinutes} min de lecture`].filter(Boolean).join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          padding: "64px 72px 56px",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 10, background: GREEN, display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: GREEN, display: "flex" }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: GREEN, letterSpacing: 3, textTransform: "uppercase" }}>{eyebrow}</div>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            fontSize: titleSize(post.title),
            fontWeight: 700,
            color: BLACK,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            paddingRight: 40,
          }}
        >
          {post.title}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            <span style={{ color: BLACK }}>early</span>
            <span style={{ color: GREEN }}>panel</span>
          </div>
          <div style={{ fontSize: 22, color: GRAY, fontWeight: 400 }}>{meta}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
