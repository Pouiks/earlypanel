import type { Metadata } from "next";
import SituationLanding from "@/components/b2b/SituationLanding";

export const metadata: Metadata = {
  title: "Pourquoi mon funnel ne convertit pas · Test utilisateur post-lancement",
  description:
    "Vos analytics disent où les utilisateurs partent, pas pourquoi. Des testeurs proches de votre base utilisateur refont le parcours et expliquent ce qui bloque. Rapport en 5 jours.",
  alternates: { canonical: "/test-conversion-funnel" },
  openGraph: {
    title: "Comprendre pourquoi un funnel ne convertit pas · earlypanel",
    description: "Test utilisateur ciblé sur la zone qui décroche : checkout, onboarding, dashboard. Rapport rédigé en 5 jours.",
    url: "/test-conversion-funnel",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "earlypanel · Tests utilisateurs livrés en 5 jours", type: "image/png" }],
  },
};

const faq = [
  {
    q: "Quelle est la différence entre un test utilisateur et un A/B test pour améliorer la conversion ?",
    a: "L'A/B test mesure quelle variante convertit le mieux, à condition d'avoir assez de trafic pour un résultat significatif. Il ne dit pas pourquoi. Le test utilisateur fait verbaliser 8 à 15 personnes sur ce qui les a bloquées ou fait hésiter. Dans la pratique : test utilisateur d'abord pour trouver les frictions et formuler des hypothèses, A/B test ensuite pour valider la correction sur le trafic réel.",
  },
  {
    q: "Peut-on tester un produit en production sans toucher aux données réelles ?",
    a: "Oui. Les testeurs utilisent des comptes créés pour la mission, ou parcourent le tunnel jusqu'à l'étape de paiement sans le finaliser (ou avec un moyen de paiement de test si vous le fournissez). On cible la zone précise qui décroche, pas l'ensemble du produit.",
  },
  {
    q: "Comment choisissez-vous les testeurs pour un test de conversion ?",
    a: "On part de votre base utilisateur réelle : métier, taille d'entreprise, niveau digital, équipement, contexte d'usage. On pioche à la main dans notre panel les profils qui y ressemblent. Tester un checkout B2B avec des testeurs grand public donnerait des frictions qui ne sont pas les vôtres.",
  },
  {
    q: "En combien de temps a-t-on des résultats ?",
    a: "Cinq jours ouvrés après le lancement des tests, une fois le questionnaire validé et les testeurs sélectionnés. Le rapport arrive rédigé et priorisé, avec restitution en visio. Comptez 7 à 10 jours entre le premier appel et la restitution.",
  },
  {
    q: "Combien coûte un test utilisateur sur un funnel de conversion ?",
    a: "Forfait fixe chiffré après l'atelier de cadrage offert, généralement entre 1 500 et 6 000 € HT selon le nombre de testeurs (8 à 15 pour un funnel) et la rareté des profils. À comparer au coût d'un mois supplémentaire de trafic payant qui décroche au même endroit.",
  },
];

export default function TestConversionFunnelPage() {
  return (
    <SituationLanding
      path="/test-conversion-funnel"
      breadcrumbName="Comprendre un funnel qui ne convertit pas"
      eyebrow="Optimisation post-lancement · Produit en production"
      h1={<>Votre funnel ne convertit pas. <em>Demandez pourquoi</em> à des utilisateurs, pas à vos analytics.</>}
      lede="Vous savez à quelle étape les utilisateurs partent. Vous ne savez pas ce qu'ils ont vécu à ce moment-là. Huit à quinze testeurs proches de votre base refont le parcours et vous l'expliquent, verbatims à l'appui, en cinq jours."
      problem={{
        title: "Le problème : les chiffres montrent le où, jamais le pourquoi.",
        paragraphs: [
          "Le funnel décroche à l'étape 3. Vous avez regardé les heatmaps, les enregistrements de session, les taux de rebond. Vous avez cinq hypothèses en réunion, et chacun défend la sienne. La roadmap du trimestre se construit sur une supposition.",
          "Un A/B test tranchera entre deux variantes, mais il ne vous dira pas laquelle des cinq hypothèses est la bonne, et il exige un trafic que vous n'avez peut-être pas.",
          "Un test earlypanel cible précisément la zone qui décroche (checkout, onboarding, écran de configuration, page tarifaire), y envoie des profils qui ressemblent à vos utilisateurs réels, et leur demande de décrire ce qu'ils ont compris, cherché et ressenti à chaque étape.",
        ],
      }}
      method={{
        title: "Comment on teste un funnel qui décroche.",
        intro: "Huit à quinze testeurs, un parcours ciblé sur la zone à problème, un rapport en cinq jours ouvrés après lancement.",
        steps: [
          { title: "Cadrage sur vos données", body: "On part de vos analytics pour isoler l'étape qui décroche et lister vos hypothèses. Le questionnaire est écrit pour les mettre à l'épreuve sans orienter les réponses." },
          { title: "Sélection et parcours", body: "On choisit à la main des testeurs proches de votre base utilisateur réelle. Ils exécutent le parcours en production ou sur un compte de test, sur leur propre équipement." },
          { title: "Lecture et priorisation", body: "Chaque réponse est relue par un humain. Le rapport rattache chaque friction à vos hypothèses, les confirme ou les écarte, et priorise ce qui débloque la conversion." },
        ],
      }}
      deliverable={{
        title: "Ce que vous recevez.",
        bullets: [
          "Pour chaque hypothèse : confirmée, écartée ou nuancée, avec les verbatims qui le montrent.",
          "Les frictions que vous n'aviez pas anticipées, souvent les plus coûteuses.",
          "Une priorisation des corrections par impact estimé sur la conversion et par effort.",
          "Des recommandations concrètes prêtes à passer en ticket produit ou en A/B test.",
          "Une restitution en visio avec l'équipe produit, growth et design.",
        ],
      }}
      faq={faq}
      ctaTitle="Vous voulez arrêter de spéculer en réunion ?"
    />
  );
}
