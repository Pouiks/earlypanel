/**
 * BreadcrumbList Schema.org JSON-LD pour les rich snippets Google.
 *
 * Apparait dans les SERP sous le titre de la page comme un fil d'Ariane
 * (Accueil > Entreprises > ...) au lieu de l'URL brute. Augmente le CTR
 * et signale a Google la hierarchie du site.
 *
 * Doc : https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 *
 * Usage :
 *   <BreadcrumbJsonLd
 *     items={[
 *       { name: "Accueil", url: "https://earlypanel.fr" },
 *       { name: "Entreprises", url: "https://earlypanel.fr/entreprises" },
 *     ]}
 *   />
 */

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export default function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
