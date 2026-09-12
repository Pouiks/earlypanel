import type { Metadata } from "next";
import SectorLanding from "@/components/b2b/SectorLanding";

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
    <SectorLanding
      path="/test-maquette-figma"
      breadcrumbName="Tester une maquette Figma"
      badge="Validation early-stage · Avant la première ligne de code"
      h1={<>Tester une maquette Figma avant de développer : validez <em>le parcours</em>, pas seulement le design.</>}
      sub="Tester une maquette Figma avec de vrais utilisateurs, c'est répondre à la question qui brûle avant de payer six mois de développement : est-ce qu'on construit le bon produit ? Un test utilisateur sur prototype cliquable, avec cinq à dix profils qui ressemblent à votre cible, vous le dit en cinq jours."
      stats={[
        { n: "5 j", l: "Rapport rédigé et restitué, pas des vidéos brutes" },
        { n: "100%", l: "Réponses relues par un humain, bâclées refusées" },
        { n: "5 à 10", l: "Testeurs sélectionnés à la main" },
        { n: "NDA", l: "Signé avant de recevoir le lien du prototype" },
      ]}
      problem={{
        title: "Le problème quand vous voulez tester une maquette Figma : tout le monde autour de vous connaît déjà le produit.",
        paragraphs: [
          "Votre équipe a passé des semaines sur la maquette. Vos associés l'ont vue dix fois. Vos amis trouvent ça « super clair ». Aucun d'eux ne peut plus vous dire si un utilisateur qui découvre l'écran comprend ce qu'il doit faire.",
          "Envoyer le lien Figma à dix clients est tentant, mais ils sont déjà convaincus par vous, ils veulent vous faire plaisir, et ils ne prennent pas le temps d'écrire ce qui les a perdus. Vous récupérez trois « c'est bien » et un tableur vide.",
          "Un test de maquette earlypanel met devant votre prototype des gens qui ne vous connaissent pas, qui exercent le métier de votre cible, et qui sont payés pour dire précisément où ils ont bloqué.",
        ],
      }}
      profiles={{
        eyebrow: "Qui teste votre maquette",
        title: "Des inconnus qui exercent le métier de votre cible.",
        sub: "Pas vos associés, pas vos amis, pas vos premiers clients : des profils qui découvrent l'écran et qui sont payés pour dire où ils ont bloqué.",
        cards: [
          { title: "Le métier de votre cible", desc: "Responsable RH, gérant, acheteur, infirmier : on part de la fiche de votre utilisateur idéal et on pioche à la main dans le panel.", example: "Sélection manuelle" },
          { title: "Des découvreurs, pas des convaincus", desc: "Aucun testeur ne connaît votre produit ni votre pitch. Ils voient la maquette comme la verra votre premier utilisateur.", example: "Regard neuf" },
          { title: "Le niveau digital qui vous ressemble", desc: "Des profils à l'aise ou non avec les outils, selon votre cible réelle. Un expert ne bloque pas au même endroit qu'un débutant.", example: "Novice · Intermédiaire · Expert" },
          { title: "Le contexte d'usage", desc: "Bureau, mobile dans le train, poste partagé : on retient les testeurs dont le quotidien correspond à la situation où votre produit sera utilisé.", example: "Desktop · Mobile" },
          { title: "Deux groupes pour deux variantes", desc: "Si vous hésitez entre deux versions de la maquette, on répartit dix à douze testeurs en deux groupes comparables.", example: "Variante A · Variante B" },
          { title: "Recrutés pour la mission si besoin", desc: "Un profil rare qui n'est pas dans le panel ? On l'annonce au cadrage et on le recrute pour vous, délai annoncé avant engagement.", example: "Recrutement ciblé" },
        ],
      }}
      parcours={{
        eyebrow: "Ce qu'on teste sur une maquette Figma",
        title: "Trois à cinq écrans, le chemin critique, rien d'autre.",
        sub: "On ne teste pas la finition du prototype : on mesure si un utilisateur comprend ce qu'il doit faire et y arrive.",
        cards: [
          { title: "Inscription et premier écran", desc: "La promesse est-elle comprise en dix secondes ? Que croit-on pouvoir faire ici, et par quoi commence-t-on ?", example: "Onboarding" },
          { title: "Configuration initiale", desc: "Les choix demandés sont-ils compréhensibles ? Quels champs font hésiter, lesquels semblent inutiles ?", example: "Paramétrage" },
          { title: "L'action principale", desc: "Le geste qui fait la valeur du produit : créer, envoyer, réserver. Trouvé ? Compris ? Terminé sans aide ?", example: "Cœur du produit" },
          { title: "Navigation et vocabulaire", desc: "Les libellés de menu et de boutons parlent-ils à la cible ? Ce qu'ils ont cherché et n'ont pas trouvé.", example: "Libellés · Menus" },
          { title: "Page tarifaire ou offre", desc: "Ce que le testeur comprend de l'offre et ce qu'il pense payer, avant tout engagement.", example: "Pricing" },
          { title: "Comparaison de deux maquettes", desc: "Deux variantes d'un même parcours, deux groupes de testeurs, et une réponse : laquelle est comprise.", example: "Test comparatif" },
        ],
      }}
      steps={{
        eyebrow: "Déroulé d'un test de maquette Figma",
        title: "Comment on teste une maquette Figma.",
        sub: "Le format est court : un parcours de trois à cinq écrans, cinq à dix testeurs, un rapport en cinq jours ouvrés après lancement.",
        items: [
          { title: "Cadrage du parcours", body: "Une heure de visio pour identifier le chemin critique à tester (inscription, configuration, première action) et la question à laquelle vous devez répondre : lance-t-on le dev ou pas ?", pill: "1h de visio · NDA" },
          { title: "Sélection et scénario", body: "On choisit à la main cinq à dix testeurs qui ressemblent à votre cible, on écrit le scénario avec vous, et on intègre le lien de prototype dans le questionnaire.", pill: "Sélection manuelle" },
          { title: "Lecture et rapport", body: "Chaque réponse est relue par un humain. Les réponses bâclées sont refusées, non payées, non facturées. Vous recevez un rapport rédigé et une restitution en visio.", pill: "Rapport sous 5 jours ouvrés" },
        ],
      }}
      deliverable={{
        title: "Ce que vous recevez.",
        items: [
          { title: "Écran par écran", body: "Ce qui a été compris, ce qui a été cherché sans être trouvé, ce qui était attendu à la place." },
          { title: "Les verbatims exacts", body: "Les mots des testeurs, rattachés à chaque friction." },
          { title: "Une priorisation en trois niveaux", body: "Bloque le parcours, gêne, cosmétique." },
          { title: "Une recommandation claire", body: "Lancer le développement, corriger d'abord, ou retester une variante." },
          { title: "Une restitution en visio", body: "Avec votre équipe produit et design." },
        ],
      }}
      guarantees={{
        title: "Ce que vous pouvez exiger",
        items: [
          { title: "Lien en lecture seule, révocable", body: "Vous partagez le prototype en « peut voir ». Les testeurs le reçoivent après signature du NDA, vous coupez le partage à la clôture." },
          { title: "Aucun proche, aucun client", body: "Les testeurs ne vous connaissent pas et n'ont rien à vous prouver. Ils sont payés pour décrire, pas pour plaire." },
          { title: "Réponses refusées, non facturées", body: "Une réponse bâclée n'est ni payée au testeur, ni comptée dans votre rapport, ni facturée." },
          { title: "Le format le moins cher de l'offre", body: "Parcours court, cinq à huit testeurs : forfait fixe dans le bas de la fourchette, chiffré après le cadrage offert." },
        ],
      }}
      faq={faq}
      faqTitle="Vos questions sur ce cas précis."
      related={[
        { href: "/blog/tester-maquette-figma-preparer-prototype", label: "Préparer une maquette Figma pour un test" },
        { href: "/blog/combien-de-testeurs-test-utilisateur", label: "Combien de testeurs pour un test utilisateur ?" },
        { href: "/blog/quand-faire-un-test-utilisateur", label: "Quand faire un test utilisateur ?" },
      ]}
    />
  );
}
