/**
 * JSON-LD `Service` pour la page B2B.
 *
 * Permet a Google et aux LLM de comprendre la nature du service (tests
 * utilisateurs, France) sans afficher de prix. Les forfaits sont definis
 * en atelier de cadrage avec chaque client : pas de tarification publique
 * (les "prix transparents" ont ete retires car non representatifs).
 */

const SERVICE_JSON = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://earlypanel.fr/entreprises#service",
  name: "Tests utilisateurs B2B sur mesure",
  description:
    "Tests utilisateurs cles en main pour startups, scale-ups et agences. Panel humain de 75+ testeurs selectionnes manuellement (SaaS, fintech, healthtech, e-commerce). NDA contractualise, atelier de cadrage offert, rapport actionnable livre en 5 jours ouvres. Forfait defini sur devis a chaque mission.",
  provider: { "@type": "Organization", name: "earlypanel", url: "https://earlypanel.fr" },
  areaServed: { "@type": "Country", name: "France" },
  serviceType: "User Testing",
  url: "https://earlypanel.fr/entreprises",
};

export default function ServiceJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_JSON) }}
    />
  );
}
