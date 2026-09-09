import type { Metadata } from "next";
import SituationLanding from "@/components/b2b/SituationLanding";

export const metadata: Metadata = {
  title: "Test utilisateur fintech, assurance et juridique",
  description:
    "Test UX de votre produit fintech, plateforme de facturation ou service réglementé par des DAF, experts-comptables, courtiers, juristes. Rapport en 5 jours.",
  alternates: { canonical: "/test-utilisateur-fintech" },
  openGraph: {
    title: "Test utilisateur fintech, assurance et juridique · earlypanel",
    description: "Des utilisateurs qui vivent KYC, TVA et conformité au quotidien. Rapport UX rédigé en 5 jours.",
    url: "/test-utilisateur-fintech",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "earlypanel · Tests utilisateurs livrés en 5 jours", type: "image/png" }],
  },
};

const faq = [
  {
    q: "Qui sont les testeurs d'un test utilisateur fintech ?",
    a: "Selon votre produit : directeurs administratifs et financiers, contrôleurs de gestion, experts-comptables, courtiers, juristes d'entreprise, gérants de PME ou indépendants qui tiennent leur facturation. On les sélectionne à la main dans notre panel et par recrutement ciblé pour votre mission. Chacun signe un NDA avant tout accès.",
  },
  {
    q: "Peut-on tester une application bancaire ou un parcours KYC sans compte réel ?",
    a: "Oui, et c'est la règle : environnement de démonstration, identités et documents fictifs, aucun mouvement d'argent réel. Vous fournissez les comptes de test, on distribue les accès aux seuls testeurs retenus après signature du NDA, et vous les révoquez à la fin de la mission.",
  },
  {
    q: "Quels parcours financiers se testent le mieux ?",
    a: "L'ouverture de compte et la vérification d'identité, la première facture ou le premier virement, un tableau de bord de trésorerie, un export comptable, un parcours de souscription d'assurance, la signature d'un contrat. Tout parcours où une erreur coûte de l'argent ou de la conformité, donc où les utilisateurs sont exigeants.",
  },
  {
    q: "Le test couvre-t-il la conformité réglementaire ?",
    a: "Non. Le test mesure la compréhension et l'utilisabilité d'un parcours avec des utilisateurs réels. Il ne remplace ni un audit de conformité, ni une revue juridique, ni un test de sécurité. Il vous dit, par exemple, où un utilisateur abandonne votre parcours KYC et pourquoi, ce qui est précisément ce que ces audits ne mesurent pas.",
  },
  {
    q: "Quel délai pour un test UX d'application bancaire ou fintech ?",
    a: "Cinq jours ouvrés entre le lancement et la restitution, pour des profils courants (gérants, indépendants, comptables). Pour un profil rare, on annonce le délai de recrutement au cadrage, avant engagement.",
  },
];

export default function TestUtilisateurFintechPage() {
  return (
    <SituationLanding
      path="/test-utilisateur-fintech"
      breadcrumbName="Test utilisateur fintech"
      eyebrow="Fintech · Facturation · Assurance · Juridique et réglementé"
      h1={<>Test utilisateur fintech : des utilisateurs qui vivent <em>KYC, TVA et conformité</em> au quotidien.</>}
      lede="Un test utilisateur fintech réussi tient à ses testeurs : un DAF qui a déjà migré trois outils, un expert-comptable qui sait ce qu'un export doit contenir, un gérant qui fait ses factures le dimanche soir. Pour tester votre application bancaire, votre plateforme de facturation ou votre service réglementé, on recrute ces profils à la main."
      problem={{
        title: "Le problème d'un test utilisateur fintech avec les mauvais testeurs.",
        paragraphs: [
          "Sur un produit financier, les utilisateurs ne pardonnent rien : une mention ambiguë sur des frais, une étape de vérification d'identité mal expliquée, un export qui ne rentre pas dans le logiciel du comptable, et ils partent. Un panel grand public ne voit pas ces frictions, parce qu'il ne sait pas ce qu'il devrait trouver.",
          "Vos utilisateurs existants, eux, ont déjà passé les obstacles et ne s'en souviennent plus. Et votre équipe conformité, qui connaît chaque règle, ne sait plus lire un écran comme un nouveau client.",
          "Il faut des professionnels du chiffre et des gérants qui découvrent votre produit avec une vraie tâche à accomplir. On les sélectionne selon le rôle, la taille de structure, les outils déjà utilisés et l'équipement, sous NDA, sur un environnement sans argent réel.",
        ],
      }}
      method={{
        title: "Comment on teste un produit fintech ou réglementé.",
        intro: "Même déroulé que toutes nos missions, avec un cadrage précis des environnements de test.",
        steps: [
          { title: "Cadrage des rôles et de l'environnement", body: "Une heure de visio pour définir les profils (DAF, comptable, courtier, gérant), les parcours critiques et l'environnement de démonstration : identités fictives, comptes de test, aucun mouvement réel. NDA signé avant tout échange." },
          { title: "Recrutement et scénarios en situation", body: "On sélectionne huit à douze professionnels correspondant à votre cible, on écrit avec vous des scénarios ancrés dans leur réalité (« vous devez justifier un virement de 12 000 € à votre expert-comptable »), et ils les exécutent seuls, sur leur propre équipement." },
          { title: "Relecture et rapport", body: "Chaque réponse est relue par un humain, les réponses bâclées sont refusées et non comptabilisées. Vous recevez un rapport rédigé : résultats par scénario, frictions priorisées, verbatims, captures d'écran, puis une restitution en visio." },
        ],
      }}
      deliverable={{
        title: "Ce que vous recevez.",
        intro: "Un livrable lisible par l'équipe produit, la direction et la conformité.",
        bullets: [
          "Un panel décrit par rôle, taille de structure et outils utilisés, anonymisé.",
          "Les résultats par scénario : qui a atteint l'objectif, où les autres se sont arrêtés.",
          "Les frictions de compréhension (frais, statuts, vérifications) distinguées des bugs, avec captures d'écran.",
          "Les verbatims rattachés à la question posée, dans les mots d'un comptable ou d'un gérant.",
          "Des recommandations priorisées par impact et effort, et une restitution en visio.",
        ],
      }}
      faq={faq}
      ctaTitle="Vos utilisateurs abandonnent au KYC et vous ne savez pas pourquoi ?"
    />
  );
}
