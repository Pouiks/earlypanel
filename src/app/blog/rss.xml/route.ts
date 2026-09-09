import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

// Flux RSS statique, genere au build (aucune lecture disque au runtime).
export const dynamic = "force-static";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const posts = await getAllPosts({ audience: "entreprise" });
  const items = posts.map((p) => {
    const url = `${SITE_URL}/blog/${p.slug}`;
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.description)}</description>
      <pubDate>${new Date(`${p.date}T09:00:00+02:00`).toUTCString()}</pubDate>
${p.tags.map((t) => `      <category>${esc(t)}</category>`).join("\n")}
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>earlypanel · Blog</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Méthode et pratique des tests utilisateurs à distance.</description>
    <language>fr-FR</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
