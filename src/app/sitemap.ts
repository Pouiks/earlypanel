import type { MetadataRoute } from "next";

/**
 * sitemap.xml genere automatiquement par Next.js a /sitemap.xml.
 *
 * Inclure UNIQUEMENT les pages publiques indexables. Exclure :
 *   - /app/* (espace tester, derriere auth)
 *   - /staff/* (espace staff, derriere auth)
 *   - /api/* (endpoints, jamais a indexer)
 *   - Pages legales tant qu'elles sont en noindex (documents temporaires
 *     de pre-lancement) : les reintegrer quand elles repassent en index.
 *
 * `lastModified` : date fixe mise a jour a la main quand le contenu change
 * reellement. Un `new Date()` a chaque build dit a Google que tout change
 * tous les jours, ce qui degrade la confiance dans le sitemap.
 */

import { SITE_URL } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";

const BASE_URL = SITE_URL;
const CONTENT_UPDATED = new Date("2026-09-07");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const latest = posts[0]?.date ? new Date(posts[0].date) : CONTENT_UPDATED;
  return [
    { url: BASE_URL, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/entreprises`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/testeurs`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.9 },

    // Landings par situation (longue traine B2B)
    { url: `${BASE_URL}/test-maquette-figma`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/test-pre-lancement-staging`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/test-conversion-funnel`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/agences`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },

    // Reassurance (indexable, contrairement aux pages legales)
    { url: `${BASE_URL}/securite`, lastModified: new Date("2026-09-09"), changeFrequency: "yearly", priority: 0.5 },

    // Blog : index + articles (content/blog/*.md, brouillons exclus)
    { url: `${BASE_URL}/blog`, lastModified: latest, changeFrequency: "weekly", priority: 0.7 },
    ...posts.map((p) => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.updated ?? p.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
