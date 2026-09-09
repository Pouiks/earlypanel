import type { Metadata } from "next";
import SituationLanding from "@/components/b2b/SituationLanding";

export const metadata: Metadata = {
  title: "Test utilisateur SaaS B2B avec des professionnels",
  description:
    "Test UX de votre SaaS B2B par des PM, RH, comptables ou commerciaux qui vivent dans un CRM. Onboarding, dashboard, facturation. Rapport rédigé en 5 jours.",
  alternates: { canonical: "/test-utilisateur-saas-b2b" },
  openGraph: {
    title: "Test utilisateur SaaS B2B avec des professionnels · earlypanel",
    description: "Des testeurs qui utilisent vraiment un outil métier, pas le grand public. Rapport UX rédigé en 5 jours.",
    url: "/test-utilisateur-saas-b2b",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "earlypanel · Tests utilisateurs livrés en 5 jours", type: "image/png" }],
  },
};

const faq = [
  {
    q: "Qui sont les testeurs d'un test utilisateur SaaS B2B ?",
    a: "Des professionnels sélectionnés à la main selon le rôle que vise votre produit : product managers, responsables RH, comptables, chefs de projet, commerciaux, gérants de PME. On les choisit dans notre panel et, pour un rôle rare, on recrute spécifiquement pour votre mission. Chacun signe un NDA avant de voir quoi que ce soit.",
  },
  {
    q: "Peut-on tester un logiciel métier qui demande un compte ou des données ?",
    a: "Oui. Vous nous fournissez des comptes de démonstration ou un environnement de test avec des données fictives réalistes. On distribue les accès aux seuls testeurs retenus, après signature du NDA, et on vous recommande de les révoquer à la fin de la mission. Aucune donnée client réelle n'est nécessaire.",
  },
  {
    q: "Quels parcours d'un SaaS B2B se testent le mieux ?",
    a: "L'onboarding et la première valeur (le moment où l'utilisateur comprend à quoi sert l'outil), la configuration initiale, un dashboard, un flux de facturation ou d'export, et tout parcours où vos utilisateurs décrochent selon vos données. On cadre ensemble deux à quatre scénarios, pas plus, pour garder des réponses de qualité.",
  },
  {
    q: "Combien de testeurs pour un test UX de logiciel métier ?",
    a: "Huit à douze en général. Sur un outil métier, la cible est souvent composée de plusieurs rôles (celui qui configure, celui qui utilise au quotidien, celui qui consulte) : on prévoit trois ou quatre testeurs par rôle pour qu'une friction observée ne soit pas un cas isolé.",
  },
  {
    q: "Quel délai pour un test utilisateur SaaS B2B ?",
    a: "Cinq jours ouvrés entre le lancement du test et la restitution, pour des profils courants. Pour un rôle très spécifique, on annonce le délai de recrutement au cadrage, avant tout engagement.",
  },
];

export default function TestUtilisateurSaasB2BPage() {
  return (
    <SituationLanding
      path="/test-utilisateur-saas-b2b"
      breadcrumbName="Test utilisateur SaaS B2B"
      eyebrow="SaaS B2B · Outils métier · Logiciels d'entreprise"
      h1={<>Test utilisateur SaaS B2B : des testeurs qui utilisent vraiment <em>un outil métier</em>, pas le grand public.</>}
      lede="Un test utilisateur SaaS B2B n'a de valeur que si les testeurs ressemblent à vos clients : des gens qui passent leurs journées dans un CRM, un outil de facturation ou un tableau de bord, et qui savent dire pourquoi un onboarding les perd au deuxième écran. C'est ce qu'on recrute, à la main, pour chaque mission."
      problem={{
        title: "Le problème d'un test utilisateur SaaS B2B avec un panel grand public.",
        paragraphs: [
          "Un panel généraliste vous envoie des testeurs qui n'ont jamais tenu une comptabilité, jamais géré un pipeline commercial, jamais paramétré un outil RH. Ils butent sur le vocabulaire de votre métier, pas sur votre produit, et leurs retours vous font corriger des choses que vos vrais clients comprennent très bien.",
          "À l'inverse, vos utilisateurs existants connaissent trop le produit. Ils compensent les défauts sans les voir, et ils ne retrouveront jamais le regard de quelqu'un qui découvre l'outil un lundi matin avec une tâche à finir.",
          "Il faut des professionnels du rôle visé, qui n'ont jamais vu votre produit. On les sélectionne un par un selon le métier, la taille d'entreprise, les outils déjà utilisés et l'équipement réel. Vous testez avec les bonnes personnes, ou vous ne testez pas.",
        ],
      }}
      method={{
        title: "Comment on teste un SaaS B2B.",
        intro: "Le déroulé est celui de toutes nos missions, avec une attention particulière au rôle des testeurs et aux accès.",
        steps: [
          { title: "Cadrage des rôles et des accès", body: "Une heure de visio pour définir les rôles à recruter (qui configure, qui utilise, qui consulte), les parcours à tester et le mode d'accès : comptes de démonstration, environnement de test, données fictives. NDA signé avant tout échange." },
          { title: "Recrutement et scénarios", body: "On sélectionne huit à douze professionnels du rôle visé, on écrit avec vous des scénarios en situation réelle (« vous devez sortir la facturation du mois »), et chaque testeur exécute le parcours seul, sur son propre équipement." },
          { title: "Relecture et rapport", body: "Chaque réponse est relue par un humain. Les réponses bâclées sont refusées, non payées et non comptabilisées. Vous recevez un rapport rédigé, avec les résultats par scénario, les frictions priorisées et les verbatims, puis une restitution en visio." },
        ],
      }}
      deliverable={{
        title: "Ce que vous recevez.",
        intro: "Un rapport que votre équipe produit peut utiliser en comité dès réception.",
        bullets: [
          "Un panel décrit rôle par rôle (métier, taille d'entreprise, outils utilisés, équipement), anonymisé.",
          "Les résultats par scénario : qui a atteint l'objectif, où les autres se sont arrêtés.",
          "Les bugs et les frictions, distingués et priorisés, avec captures d'écran quand elles existent.",
          "Les verbatims rattachés à la question qui les a provoqués.",
          "Des recommandations classées par impact et effort technique, et une restitution en visio.",
        ],
      }}
      faq={faq}
      ctaTitle="Votre onboarding SaaS perd des utilisateurs sans que vous sachiez où ?"
    />
  );
}
