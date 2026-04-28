/**
 * JSON-LD Organization + WebSite a injecter UNE FOIS dans le root layout.
 *
 * Pourquoi :
 *   - `Organization` : aide Google et les LLM (ChatGPT, Claude, Perplexity)
 *     a identifier earlypanel comme une entite, son secteur d'activite, ses
 *     coordonnees. Cela conditionne les "Knowledge Panels" Google et les
 *     citations dans les reponses generatives.
 *   - `WebSite` avec `potentialAction.SearchAction` : permet a Google
 *     d'afficher une sitelinks searchbox dans les resultats (premium pour
 *     l'image de marque).
 *
 * A maintenir : si tu changes le nom legal, l'adresse, ou les reseaux sociaux,
 * met a jour cette source de verite.
 */

const ORG_JSON = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "earlypanel",
  legalName: "earlypanel",
  url: "https://earlypanel.fr",
  logo: "https://earlypanel.fr/og_image_variant_a_5jours.svg",
  description:
    "Service français de tests utilisateurs B2B clés en main. Panel humain qualifié, NDA contractualisé, rapport livré en 5 jours.",
  foundingDate: "2025",
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
  sameAs: [
    // Reseaux sociaux a renseigner quand actifs (LinkedIn, X, etc.)
    // "https://www.linkedin.com/company/earlypanel",
  ],
};

const WEBSITE_JSON = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "earlypanel",
  alternateName: "earlypanel.fr",
  url: "https://earlypanel.fr",
  inLanguage: "fr-FR",
  publisher: {
    "@type": "Organization",
    name: "earlypanel",
  },
  // Note : SearchAction Google requiert un endpoint /search?q={query} reel.
  // Comme on n'a pas de moteur de recherche public, on l'omet (mieux que
  // de pointer vers un endpoint qui n'existe pas, ce qui invaliderait le
  // markup).
};

export default function OrganizationJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON) }}
      />
    </>
  );
}
