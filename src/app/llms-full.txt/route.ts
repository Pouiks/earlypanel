import { getAllPosts, postHref } from "@/lib/blog";
import { GLOSSARY } from "@/data/glossaire";
import { SITE_URL } from "@/lib/site";
import { PRICE_RANGE_LABEL } from "@/lib/cta-links";

// llms-full.txt : tout le contenu editorial public d'un bloc, en Markdown,
// pour les assistants qui ingerent un site entier (convention llms.txt).
// Statique, genere au build. Complement de /llms.txt (resume et liens).
export const dynamic = "force-static";

export async function GET() {
  const posts = await getAllPosts();
  const parts: string[] = [];

  parts.push(`# earlypanel : contenu complet\n`);
  parts.push(`> Service français de tests utilisateurs à distance, clés en main : testeurs recrutés à la main selon la cible, questionnaire co-construit, relecture humaine de chaque réponse, NDA signé avant tout échange, rapport rédigé et restitution en visio sous 5 jours ouvrés. Forfait fixe par mission, généralement ${PRICE_RANGE_LABEL}. Site : ${SITE_URL}. Résumé et liens : ${SITE_URL}/llms.txt\n`);

  parts.push(`## Glossaire des tests utilisateurs (${SITE_URL}/glossaire)\n`);
  for (const t of GLOSSARY) parts.push(`- **${t.term}** : ${t.definition}`);
  parts.push("");

  const sections: { title: string; audience: "entreprise" | "testeur" }[] = [
    { title: "Blog entreprises : méthode et pratique des tests utilisateurs", audience: "entreprise" },
    { title: "Guides testeurs", audience: "testeur" },
  ];
  for (const s of sections) {
    parts.push(`## ${s.title}\n`);
    for (const p of posts.filter((x) => x.audience === s.audience)) {
      parts.push(`---\n`);
      parts.push(`# ${p.title}\n`);
      parts.push(`URL : ${SITE_URL}${postHref(p)}\nPublié le ${p.date}${p.updated ? `, mis à jour le ${p.updated}` : ""}. ${p.description}\n`);
      if (p.keyPoints.length > 0) {
        parts.push(`En bref :`);
        for (const k of p.keyPoints) parts.push(`- ${k}`);
        parts.push("");
      }
      parts.push(p.body);
      parts.push("");
    }
  }

  return new Response(parts.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
