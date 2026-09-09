import type { Metadata } from "next";
import SituationLanding from "@/components/b2b/SituationLanding";

export const metadata: Metadata = {
  title: "Tester une maquette Figma avec de vrais utilisateurs",
  description:
    "Test utilisateur sur maquette Figma ou prototype cliquable, avant la moindre ligne de code. 5 à 10 profils ciblés, rapport UX en 5 jours. Devis sous 48h.",
  alternates: { canonical: "/test-maquette-figma" },
  openGraph: {
    title: "Tester une maquette Figma avec de vrais utilisateurs · earlypanel",
    description: "5 à 10 testeurs sélectionnés à la main naviguent dans votre prototype. Rapport rédigé en 5 jours, NDA inclus.",
    url: "/test-maquette-figma",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "earlypanel · Tests utilisateurs livrés en 5 jours", type: "image/png" }],
  },
};

const faq = [
  {
    q: "Peut-on tester une maquette Figma qui n'est pas entièrement cliquable ?",
    a: "Oui, à condition que le parcours à tester le soit. On cadre ensemble les 3 à 5 écrans clés (inscription, configuration, action principale) et on prépare le questionnaire pour que les testeurs sachent où s'arrêter. Les écrans hors parcours peuvent rester statiques : ce qu'on mesure, c'est la compréhension et les blocages sur le chemin critique, pas la finition du prototype.",
  },
  {
    q: "Combien de testeurs faut-il pour valider une maquette Figma ?",
    a: "5 à 8 testeurs suffisent pour détecter environ 80 % des problèmes d'utilisabilité majeurs sur un parcours (recherche de Jakob Nielsen). Au-delà, les frictions se répètent. Si vous voulez comparer deux variantes de maquette, on passe à 10-12 testeurs répartis en deux groupes.",
  },
  {
    q: "Comment les testeurs accèdent-ils au prototype Figma ?",
    a: "Vous partagez un lien de prototype en lecture seule (Figma « Anyone with the link, can view »). On l'intègre dans le questionnaire earlypanel avec le scénario à exécuter. Les testeurs ont signé un NDA avant de recevoir le lien, et vous pouvez révoquer le partage à la clôture de la mission.",
  },
  {
    q: "Que contient le rapport d'un test de maquette ?",
    a: "Pour chaque écran du parcours : ce que les testeurs ont compris, ce qu'ils ont cherché sans trouver, ce qu'ils attendaient à la place, avec les verbatims exacts. Puis une priorisation : ce qui bloque le parcours (à corriger avant le dev), ce qui gêne (à corriger en v1), ce qui est cosmétique. On le présente à votre équipe en visio.",
  },
  {
    q: "Combien coûte un test de maquette Figma ?",
    a: "C'est généralement le format le moins cher de notre offre parce que le parcours est court et que 5 à 8 testeurs suffisent. Forfait fixe chiffré après l'atelier de cadrage offert, dans le bas de la fourchette 1 500 à 6 000 € HT. Corriger un problème de parcours en phase Figma coûte environ 10 fois moins cher qu'après déploiement.",
  },
];

export default function TestMaquetteFigmaPage() {
  return (
    <SituationLanding
      path="/test-maquette-figma"
      breadcrumbName="Tester une maquette Figma"
      eyebrow="Validation early-stage · Avant la première ligne de code"
      h1={<>Tester une maquette Figma avant de développer : validez <em>le parcours</em>, pas seulement le design.</>}
      lede="Tester une maquette Figma avec de vrais utilisateurs, c'est répondre à la question qui brûle avant de payer six mois de développement : est-ce qu'on construit le bon produit ? Un test utilisateur sur prototype cliquable, avec cinq à dix profils qui ressemblent à votre cible, vous le dit en cinq jours."
      problem={{
        title: "Le problème quand vous voulez tester une maquette Figma : tout le monde autour de vous connaît déjà le produit.",
        paragraphs: [
          "Votre équipe a passé des semaines sur la maquette. Vos associés l'ont vue dix fois. Vos amis trouvent ça « super clair ». Aucun d'eux ne peut plus vous dire si un utilisateur qui découvre l'écran comprend ce qu'il doit faire.",
          "Envoyer le lien Figma à dix clients est tentant, mais ils sont déjà convaincus par vous, ils veulent vous faire plaisir, et ils ne prennent pas le temps d'écrire ce qui les a perdus. Vous récupérez trois « c'est bien » et un tableur vide.",
          "Un test de maquette earlypanel met devant votre prototype des gens qui ne vous connaissent pas, qui exercent le métier de votre cible, et qui sont payés pour dire précisément où ils ont bloqué.",
        ],
      }}
      method={{
        title: "Comment on teste une maquette Figma.",
        intro: "Le format est court : un parcours de trois à cinq écrans, cinq à dix testeurs, un rapport en cinq jours ouvrés après lancement.",
        steps: [
          { title: "Cadrage du parcours", body: "Une heure de visio pour identifier le chemin critique à tester (inscription, configuration, première action) et la question à laquelle vous devez répondre : lance-t-on le dev ou pas ?" },
          { title: "Sélection et scénario", body: "On choisit à la main cinq à dix testeurs qui ressemblent à votre cible, on écrit le scénario avec vous, et on intègre le lien de prototype dans le questionnaire." },
          { title: "Lecture et rapport", body: "Chaque réponse est relue par un humain. Les réponses bâclées sont refusées, non payées, non facturées. Vous recevez un rapport rédigé et une restitution en visio." },
        ],
      }}
      deliverable={{
        title: "Ce que vous recevez.",
        bullets: [
          "Écran par écran : ce qui a été compris, ce qui a été cherché sans être trouvé, ce qui était attendu à la place.",
          "Les verbatims exacts des testeurs, rattachés à chaque friction.",
          "Une priorisation en trois niveaux : bloque le parcours, gêne, cosmétique.",
          "Une recommandation claire : lancer le développement, corriger d'abord, ou retester une variante.",
          "Une restitution en visio avec votre équipe produit et design.",
        ],
      }}
      faq={faq}
      ctaTitle="Vous voulez savoir si votre maquette est comprise avant de la coder ?"
    />
  );
}
