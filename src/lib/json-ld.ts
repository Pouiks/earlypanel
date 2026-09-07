/**
 * Builders JSON-LD (schema.org). Fonctions pures, testees dans
 * tests/unit/json-ld.test.ts. Le rendu passe par <JsonLd data={...} />.
 *
 * A verifier apres modification sur https://validator.schema.org (coller
 * le HTML rendu d'une page) et dans Search Console > Ameliorations.
 */
import { SITE_URL } from "@/lib/site";
import { PRICE_RANGE_LABEL } from "@/lib/cta-links";

export interface FaqItem { q: string; a: string }
export interface BreadcrumbItem { name: string; url: string }

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "earlypanel",
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.png`,
    email: "contact@earlypanel.fr",
    description:
      "Service français de tests utilisateurs B2B clés en main. Testeurs sélectionnés à la main, NDA signé, rapport rédigé et restitué en 5 jours.",
    foundingDate: "2026",
    founder: {
      "@type": "Person",
      name: "Virgile Joinville",
      sameAs: "https://www.linkedin.com/in/virgilejoinville/",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Montpellier",
      addressCountry: "FR",
    },
    areaServed: { "@type": "Country", name: "France" },
    knowsAbout: [
      "Tests utilisateurs",
      "User testing",
      "UX research",
      "Tests qualitatifs",
      "Audit utilisateur",
      "Test SaaS",
      "Test produit B2B",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: "contact@earlypanel.fr",
        contactType: "customer support",
        availableLanguage: ["French", "English"],
        areaServed: "FR",
      },
    ],
    sameAs: ["https://www.linkedin.com/company/earlypanel/"],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "earlypanel",
    alternateName: "earlypanel.fr",
    url: SITE_URL,
    inLanguage: "fr-FR",
    publisher: { "@id": ORGANIZATION_ID },
    // Pas de SearchAction : il n'y a pas de moteur de recherche public.
  };
}

export function serviceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/entreprises#service`,
    name: "Tests utilisateurs clés en main",
    serviceType: "Tests utilisateurs",
    description:
      `Tests utilisateurs clés en main pour équipes produit, startups et agences. Testeurs sélectionnés à la main selon la cible, questionnaire co-construit, relecture humaine de chaque réponse, NDA signé avant tout échange, rapport rédigé et restitution en visio sous 5 jours ouvrés. Devis sous 48h après un atelier de cadrage offert, généralement ${PRICE_RANGE_LABEL}.`,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: "FR" },
    url: `${SITE_URL}/entreprises`,
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
      url: `${SITE_URL}/entreprises#brief`,
    },
  };
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Serialisation sure pour <script type="application/ld+json"> (anti </script>). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\u003c");
}
