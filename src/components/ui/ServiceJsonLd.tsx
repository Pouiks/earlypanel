/**
 * JSON-LD `Service` pour la page B2B.
 *
 * Permet a Google et aux LLM de comprendre la nature du service (tests
 * utilisateurs, France). Le prix est un forfait fixe sur devis ; on expose la
 * fourchette publique (identique a la FAQ) via PriceSpecification pour que
 * les LLM ne citent pas d'anciens packs.
 */
import { PRICE_RANGE_LABEL } from "@/lib/cta-links";

const SERVICE_JSON = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.earlypanel.fr/entreprises#service",
  name: "Tests utilisateurs B2B clés en main",
  description:
    `Tests utilisateurs clés en main pour équipes produit, startups et agences. Testeurs sélectionnés manuellement selon la cible (SaaS, santé, finance, e-commerce), questionnaire co-construit, relecture humaine de chaque réponse, NDA signé avant tout échange, rapport rédigé et restitution en visio sous 5 jours ouvrés. Forfait fixé sur devis après un atelier de cadrage offert, généralement ${PRICE_RANGE_LABEL}.`,
  provider: { "@type": "Organization", name: "earlypanel", url: "https://www.earlypanel.fr" },
  areaServed: { "@type": "Country", name: "France" },
  serviceType: "User Testing",
  url: "https://www.earlypanel.fr/entreprises",
  offers: {
    "@type": "Offer",
    priceCurrency: "EUR",
    priceSpecification: {
      "@type": "PriceSpecification",
      minPrice: 1500,
      maxPrice: 6000,
      priceCurrency: "EUR",
      valueAddedTaxIncluded: false,
    },
    availability: "https://schema.org/LimitedAvailability",
    url: "https://www.earlypanel.fr/entreprises#brief",
  },
};

export default function ServiceJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_JSON) }}
    />
  );
}
