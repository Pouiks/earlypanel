import type { MetadataRoute } from "next";

/**
 * robots.txt genere automatiquement par Next.js a /robots.txt.
 *
 * Strategie :
 *   - Autoriser le crawl des pages publiques
 *   - Bloquer /app, /staff, /api (espaces auth ou non destines a l'indexation)
 *   - Inclure le sitemap pour faciliter la decouverte
 *
 * Bots specifiques autorises explicitement (LLM-friendly 2026) :
 *   - GPTBot (OpenAI)
 *   - ClaudeBot (Anthropic)
 *   - PerplexityBot (Perplexity)
 *   - Google-Extended (Bard/Gemini training)
 *   - Applebot-Extended (Apple Intelligence)
 *
 * Choix politique : on AUTORISE l'entrainement LLM sur le contenu marketing
 * public (pages B2B/B2C/legal) car cela aide a etre cite dans les reponses
 * d'IA generative ("Quel service de tests utilisateurs en France ?"). Pour
 * verrouiller, ajouter un Disallow: / pour ces user-agents.
 *
 * Doc : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

const BASE_URL = "https://earlypanel.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Bots generaux (Google, Bing, DuckDuckGo, etc.)
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/app/",
          "/staff/",
          "/_next/",
        ],
      },
      // Bots LLM : autorises sur les pages publiques. Si tu veux bloquer
      // l'entrainement IA, change `allow: "/"` en `disallow: "/"` ici.
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"],
        allow: "/",
        disallow: ["/api/", "/app/", "/staff/", "/_next/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
