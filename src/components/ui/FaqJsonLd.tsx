/**
 * Injection JSON-LD schema.org `FAQPage` pour Google rich snippets.
 *
 * Place ce composant dans une page Next.js (server component) en lui
 * passant la meme liste d'items que `<FaqAccordion>`. Le balisage
 * structure permet a Google d'afficher la FAQ directement dans la SERP
 * (gain CTR de +20-30% en moyenne).
 *
 * Pas de dependance front : c'est juste une balise <script type="application/ld+json">.
 *
 * Spec : https://developers.google.com/search/docs/appearance/structured-data/faqpage
 */

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqJsonLd({ items }: { items: FaqItem[] }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // dangerouslySetInnerHTML est volontaire ici : c'est l'API standard
      // pour injecter du JSON-LD en SSR. Le contenu est genere cote serveur
      // a partir de notre liste contrôlée, pas d'input utilisateur.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
