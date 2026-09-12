import type { Metadata } from "next";
import SectorLanding from "@/components/b2b/SectorLanding";

export const metadata: Metadata = {
  title: "Tests utilisateurs en marque blanche pour agences",
  description:
    "Sous-traitez la recherche utilisateur de vos clients : recrutement, questionnaire, rapport UX en 5 jours, en marque blanche. NDA, devis sous 48h.",
  alternates: { canonical: "/agences" },
  openGraph: {
    title: "Tests utilisateurs en marque blanche pour agences · earlypanel",
    description: "Revendez un test utilisateur clés en main dans vos devis. Marque blanche ou apport d'affaires.",
    url: "/agences",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "earlypanel · Tests utilisateurs livrés en 5 jours", type: "image/png" }],
  },
};

const faq = [
  {
    q: "Le rapport peut-il être livré à la marque de mon agence ?",
    a: "Oui. En marque blanche, le rapport et la restitution portent votre identité, earlypanel reste invisible pour votre client final, et vous facturez la prestation dans votre devis. En mode apporteur d'affaires, on contractualise directement avec votre client et vous percevez une commission sur la mission. On choisit le mode ensemble au premier appel.",
  },
  {
    q: "Qui signe le NDA quand il y a un client final ?",
    a: "Chaque testeur signe un NDA avec earlypanel avant tout accès. Entre earlypanel et votre agence, un NDA mutuel couvre les informations de votre client final. Si votre client exige un NDA direct, on le signe aussi. Les preuves de signature (hash, horodatage, IP) sont conservées.",
  },
  {
    q: "Quel volume pouvez-vous absorber ?",
    a: "Chaque mission est relue à la main, donc on limite volontairement le nombre de missions simultanées. Pour un partenariat agence, on réserve des créneaux à l'avance : dites-nous votre rythme prévisionnel (une mission par mois, une par sprint) et on bloque la capacité correspondante.",
  },
  {
    q: "Comment intégrer un test earlypanel dans un devis client ?",
    a: "Le plus simple : une ligne « Test utilisateur avec 8 à 12 profils cibles, rapport et restitution » entre la phase design et le développement, ou avant la mise en production. On vous fournit un descriptif de prestation prêt à coller et un forfait fixe, que vous marginez librement.",
  },
  {
    q: "Peut-on démarrer par une seule mission avant de parler partenariat ?",
    a: "Oui, et c'est ce qu'on recommande. Une première mission sur un projet client en cours, au tarif standard, pour que vous jugiez le livrable. Si ça vous convient, on met en place le cadre partenariat (marque blanche ou apport d'affaires, remise volume, créneaux réservés).",
  },
];

export default function AgencesPage() {
  return (
    <SectorLanding
      path="/agences"
      breadcrumbName="Agences et studios"
      badge="Agences digitales · Studios produit · Freelances"
      h1={<>Tests utilisateurs en marque blanche : livrez de la recherche UX à vos clients <em>sans monter une équipe</em>.</>}
      sub="Un test utilisateur en marque blanche, c'est un prestataire UX research pour agence qui produit le test, le rapport et la restitution sous votre identité. Vous concevez et développez pour des clients finaux. Vous savez qu'un test utilisateur avant le développement ou avant la mise en production éviterait des allers-retours coûteux. Mais recruter des testeurs, écrire le questionnaire, lire les retours et rédiger un rapport n'est pas votre métier. C'est le nôtre."
      stats={[
        { n: "5 j", l: "Rapport rédigé et restitué, à votre marque si vous le souhaitez" },
        { n: "100%", l: "Réponses relues par un humain, bâclées refusées" },
        { n: "8 à 12", l: "Testeurs sélectionnés selon la cible de votre client" },
        { n: "NDA", l: "Mutuel avec l'agence, signé par chaque testeur" },
      ]}
      problem={{
        title: "Le problème sans test utilisateur en marque blanche : il est dans vos recommandations, jamais dans vos devis.",
        paragraphs: [
          "Vous le proposez, le client trouve ça intéressant, puis la ligne saute au premier arbitrage budgétaire parce que personne ne sait exactement ce qu'elle contient ni combien de temps elle mobilise votre équipe.",
          "Quand le test se fait quand même, c'est un chef de projet qui envoie un lien Figma à cinq connaissances et compile des retours dans un Notion. Le client n'y voit pas de valeur, et vous non plus.",
          "Avec earlypanel, le test devient une prestation cadrée, avec un livrable que votre client peut tenir en main : profils sélectionnés selon sa cible, questionnaire co-construit, relecture humaine, rapport rédigé, restitution. Vous la revendez, on la produit.",
        ],
      }}
      profiles={{
        eyebrow: "Pour qui",
        title: "Agences, studios et indépendants qui livrent des produits à des clients finaux.",
        sub: "Vous concevez et développez. Le test utilisateur, on le produit pour vous, sous votre identité ou en apport d'affaires.",
        cards: [
          { title: "Agences digitales", desc: "Sites, plateformes, applications pour des clients finaux. Une ligne test utilisateur dans le devis, entre la maquette et le développement.", example: "Web · Mobile" },
          { title: "Studios produit et design", desc: "Vous livrez des maquettes et des parcours. Le test valide la compréhension avant que le client ne paie le code.", example: "UX · UI" },
          { title: "ESN et intégrateurs", desc: "Refonte, migration, nouvel outil métier : un test avant la mise en production évite les tickets du premier mois.", example: "Refonte · Migration" },
          { title: "Freelances et collectifs", desc: "Vous n'avez pas de pôle recherche. Vous revendez une prestation cadrée, on la produit.", example: "Indépendants" },
          { title: "Agences growth et CRO", desc: "Vos recommandations de conversion appuyées sur des verbatims d'utilisateurs, pas seulement sur des heatmaps.", example: "Conversion" },
          { title: "Vos clients finaux, jamais sollicités", desc: "En marque blanche, votre client ne voit qu'un interlocuteur : vous. earlypanel reste invisible.", example: "Marque blanche" },
        ],
      }}
      parcours={{
        eyebrow: "Ce qu'on teste pour vos clients",
        title: "Les mêmes moments à fort ROI que pour un client direct.",
        sub: "Un test se place là où il évite le plus d'allers-retours : avant le développement, avant la mise en production, ou quand le funnel décroche.",
        cards: [
          { title: "Maquette Figma avant développement", desc: "Le parcours est-il compris avant que le client ne paie six mois de code ? Cinq à dix testeurs, trois à cinq écrans.", example: "Prototype" },
          { title: "Staging avant mise en production", desc: "Dix à vingt profils sur l'environnement de test du client, accès créés pour la mission et supprimés après.", example: "Pré-lancement" },
          { title: "Funnel qui décroche", desc: "La zone précise qui perd des utilisateurs en production, testée avec des profils proches de la base réelle.", example: "Conversion" },
          { title: "Refonte ou migration", desc: "L'ancien parcours contre le nouveau, avec des utilisateurs qui connaissent le métier, pas le produit.", example: "Avant / après" },
          { title: "Application mobile", desc: "Recette d'usage sur le vrai téléphone des testeurs, en complément de votre recette technique.", example: "iOS · Android" },
          { title: "Outil métier interne", desc: "Des testeurs qui exercent le métier des futurs utilisateurs, recrutés pour la mission si le profil est rare.", example: "Métier · Interne" },
        ],
      }}
      steps={{
        eyebrow: "Déroulé d'un partenariat agence",
        title: "Comment ça marche avec une agence.",
        sub: "Deux modes possibles, choisis ensemble au premier appel : marque blanche ou apport d'affaires.",
        items: [
          { title: "Marque blanche", body: "Vous vendez la prestation dans votre devis, à votre marge. On produit le test, le rapport et la restitution sous votre identité. Votre client ne voit qu'un seul interlocuteur : vous.", pill: "Vous facturez, on produit" },
          { title: "Apport d'affaires", body: "Vous nous présentez votre client, on contractualise directement avec lui, vous percevez une commission sur la mission. Utile quand vous ne voulez pas porter la prestation.", pill: "Commission sur mission" },
          { title: "Capacité réservée", body: "Chaque mission est relue à la main, donc la capacité est limitée. Pour un partenariat, on bloque des créneaux selon votre rythme (une mission par sprint, par mois, par projet).", pill: "Créneaux bloqués" },
        ],
      }}
      deliverable={{
        title: "Ce que votre client reçoit, et ce que vous gardez.",
        items: [
          { title: "Un descriptif de prestation", body: "Prêt à intégrer dans vos devis, avec le forfait fixe correspondant." },
          { title: "Des testeurs choisis à la main", body: "Selon la cible de votre client, NDA signé avant tout accès." },
          { title: "Un questionnaire co-construit", body: "Avec votre équipe design ou produit." },
          { title: "Un rapport rédigé et priorisé", body: "Le même que pour un client direct : rédigé, pas des données brutes. À votre marque si vous le souhaitez, avec une restitution en visio." },
          { title: "Un argument de vente concret", body: "Pour la phase de design : « on valide avec de vrais utilisateurs avant de coder »." },
        ],
      }}
      guarantees={{
        title: "Ce que vous pouvez exiger",
        items: [
          { title: "Marque blanche ou apport d'affaires", body: "Vous choisissez au premier appel. En marque blanche, earlypanel reste invisible pour votre client final." },
          { title: "NDA à chaque niveau", body: "Mutuel entre earlypanel et votre agence, signé par chaque testeur, direct avec votre client s'il l'exige. Preuves de signature conservées." },
          { title: "Réponses refusées, non facturées", body: "Une réponse bâclée n'est ni payée au testeur, ni comptée dans le rapport, ni facturée." },
          { title: "Une première mission sans engagement", body: "Au tarif standard, sur un projet client en cours, pour juger le livrable avant de parler partenariat." },
        ],
      }}
      faq={faq}
      faqTitle="Vos questions sur ce cas précis."
      related={[
        { href: "/blog/prix-test-utilisateur", label: "Combien coûte un test utilisateur ?" },
        { href: "/blog/alternative-testapic", label: "Plateforme ou service clé en main ?" },
        { href: "/glossaire", label: "Glossaire des tests utilisateurs" },
      ]}
    />
  );
}
