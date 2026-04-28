/**
 * JSON-LD `Service` pour les 3 packs B2B.
 *
 * Permet a Google et aux LLM de comprendre l'offre commerciale (prix,
 * delais, type de service) et de la citer correctement. Aussi utilise
 * pour des rich results "Service" potentiels en SERP.
 *
 * Source de verite des montants : doit rester aligne avec PricingTable.tsx
 * et CGV (cgv/page.tsx). Si un pack change, met a jour les 3 endroits.
 */

const SERVICES_JSON = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://earlypanel.fr/entreprises#quick-test",
      name: "Quick Test — Tests utilisateurs",
      description:
        "Validation rapide d'une hypothese produit ou d'un parcours unique. 5 testeurs selectionnes, 1 cas d'usage, livraison en 3 jours ouvres, NDA inclus.",
      provider: { "@type": "Organization", name: "earlypanel", url: "https://earlypanel.fr" },
      areaServed: { "@type": "Country", name: "France" },
      offers: {
        "@type": "Offer",
        price: "700",
        priceCurrency: "EUR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "700",
          priceCurrency: "EUR",
          valueAddedTaxIncluded: false,
        },
        availability: "https://schema.org/InStock",
        url: "https://earlypanel.fr/entreprises#tarifs",
      },
      serviceType: "User Testing",
    },
    {
      "@type": "Service",
      "@id": "https://earlypanel.fr/entreprises#standard",
      name: "Standard — Tests utilisateurs",
      description:
        "Le pack le plus utilise. Ideal pour valider un MVP ou un produit en croissance. 10 testeurs, jusqu'a 3 cas d'usage, livraison en 5 jours ouvres, atelier de cadrage offert, NDA inclus.",
      provider: { "@type": "Organization", name: "earlypanel", url: "https://earlypanel.fr" },
      areaServed: { "@type": "Country", name: "France" },
      offers: {
        "@type": "Offer",
        price: "1200",
        priceCurrency: "EUR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "1200",
          priceCurrency: "EUR",
          valueAddedTaxIncluded: false,
        },
        availability: "https://schema.org/InStock",
        url: "https://earlypanel.fr/entreprises#tarifs",
      },
      serviceType: "User Testing",
    },
    {
      "@type": "Service",
      "@id": "https://earlypanel.fr/entreprises#expert",
      name: "Expert — Tests utilisateurs profils niches",
      description:
        "Pour les produits complexes et les profils niches (sante, finance, juridique). 20 testeurs cibles, 5 cas d'usage, analyse IA pre-test incluse, livraison en 5 jours ouvres, NDA inclus.",
      provider: { "@type": "Organization", name: "earlypanel", url: "https://earlypanel.fr" },
      areaServed: { "@type": "Country", name: "France" },
      offers: {
        "@type": "Offer",
        price: "2200",
        priceCurrency: "EUR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "2200",
          priceCurrency: "EUR",
          valueAddedTaxIncluded: false,
        },
        availability: "https://schema.org/InStock",
        url: "https://earlypanel.fr/entreprises#tarifs",
      },
      serviceType: "User Testing",
    },
  ],
};

export default function ServiceJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICES_JSON) }}
    />
  );
}
