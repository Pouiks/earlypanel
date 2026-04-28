import type { MetadataRoute } from "next";

/**
 * sitemap.xml genere automatiquement par Next.js a /sitemap.xml.
 *
 * Convention Next.js 13+ : exporter un default avec MetadataRoute.Sitemap.
 * Doc : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 *
 * Inclure UNIQUEMENT les pages publiques indexables. Exclure :
 *   - /app/* (espace tester, derriere auth)
 *   - /staff/* (espace staff, derriere auth)
 *   - /api/* (endpoints, jamais a indexer)
 *   - Pages d'erreur
 */

const BASE_URL = "https://earlypanel.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    // Pages principales : haute priorite
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/entreprises`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/testeurs`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // Pages legales : priorite faible mais doivent etre crawlees
    {
      url: `${BASE_URL}/mentions-legales`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/confidentialite`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cgu`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cgv`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
