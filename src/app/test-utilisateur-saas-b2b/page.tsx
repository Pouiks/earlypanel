import type { Metadata } from "next";
import SectorLanding from "@/components/b2b/SectorLanding";

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
    <SectorLanding
      path="/test-utilisateur-saas-b2b"
      breadcrumbName="Test utilisateur SaaS B2B"
      badge="SaaS B2B · Outils métier · Logiciels d'entreprise"
      h1={<>Test utilisateur SaaS B2B : des testeurs qui utilisent vraiment <em>un outil métier</em>, pas le grand public.</>}
      sub="Un test utilisateur SaaS B2B n'a de valeur que si les testeurs ressemblent à vos clients : des gens qui passent leurs journées dans un CRM, un outil de facturation ou un tableau de bord. On les recrute à la main pour chaque mission, ils font le parcours depuis leur poste, et vous recevez un rapport UX rédigé."
      profiles={{
        eyebrow: "Qui teste votre logiciel métier",
        title: "Des professionnels du rôle visé, qui découvrent votre produit.",
        sub: "Pas de panel grand public, pas de collègues, pas de clients déjà convaincus. Des personnes qui font déjà la tâche que votre outil veut simplifier, et qui ne l'ont jamais vu.",
        cards: [
          { title: "Product managers et chefs de projet", desc: "Ils vivent dans des outils de gestion, comparent vite, et disent précisément pourquoi un onboarding les perd au deuxième écran.", example: "Roadmap · Suivi · Reporting" },
          { title: "Responsables RH et administratifs", desc: "Paie, congés, notes de frais, entretiens : des utilisateurs exigeants sur la clarté des statuts et des validations.", example: "SIRH · Paie · Congés" },
          { title: "Comptables et gestionnaires", desc: "Ils savent ce qu'un export doit contenir et repèrent une facturation ambiguë en quelques secondes.", example: "Facturation · Export · Devis" },
          { title: "Commerciaux et gérants de PME", desc: "Pipeline, relances, signature : des profils pressés qui abandonnent dès qu'une étape ne sert pas leur objectif.", example: "CRM · Devis · Signature" },
          { title: "Utilisateurs à l'aise, et les autres", desc: "On mélange volontairement des profils qui changent d'outil tous les six mois et d'autres qui n'ont jamais quitté leur logiciel installé.", example: "Aisance numérique dosée" },
          { title: "Sur leur vrai équipement", desc: "Ordinateur d'entreprise, navigateur imposé, écran secondaire ou pas : le contexte réel d'usage, pas un poste de démo.", example: "Windows · Mac · Mobile" },
        ],
      }}
      parcours={{
        eyebrow: "Ce qu'on teste sur un SaaS B2B",
        title: "Les parcours où un logiciel métier perd ses utilisateurs.",
        sub: "On cadre ensemble deux à quatre scénarios, ceux qui portent votre décision. Chacun a un critère de réussite observable, pour compter qui y arrive.",
        cards: [
          { title: "Onboarding et première valeur", desc: "Le moment où l'utilisateur comprend à quoi sert l'outil et obtient un premier résultat. C'est là que se jouent la plupart des abandons d'essai.", example: "Essai gratuit · Activation" },
          { title: "Configuration initiale", desc: "Importer ses données, inviter son équipe, paramétrer ses règles : des étapes que l'équipe produit connaît par cœur et que l'utilisateur découvre seul.", example: "Import · Paramétrage · Invitations" },
          { title: "Dashboard et navigation", desc: "Retrouver l'information qui compte, comprendre un statut, savoir quoi faire ensuite. La hiérarchie de l'écran testée par des inconnus.", example: "Tableau de bord · Filtres" },
          { title: "Facturation, devis, export", desc: "Les parcours où une erreur coûte de l'argent : un montant ambigu, un export incomplet, une TVA mal expliquée.", example: "Facture · Devis · Export comptable" },
          { title: "Fonctionnalité mal adoptée", desc: "Un module que vos clients n'ouvrent pas. Des utilisateurs existants ou nouveaux refont le parcours et vous disent pourquoi.", example: "Adoption · Module ignoré" },
          { title: "Maquette ou préversion", desc: "Le même test se fait avant le code, sur un prototype Figma, ou avant le lancement, sur votre environnement de test.", example: "Figma · Staging" },
        ],
      }}
      steps={{
        eyebrow: "Déroulé d'un test utilisateur SaaS B2B",
        title: "Du cadrage au rapport, en trois étapes.",
        sub: "Le déroulé de toutes nos missions, avec une attention particulière au rôle des testeurs et aux accès.",
        items: [
          { title: "Cadrage des rôles et des accès", body: "Une heure de visio pour définir les rôles à recruter (qui configure, qui utilise, qui consulte), les parcours à tester et le mode d'accès : comptes de démonstration, environnement de test, données fictives. NDA signé avant tout échange.", pill: "1h de visio · NDA" },
          { title: "Recrutement et scénarios", body: "On sélectionne huit à douze professionnels du rôle visé, on écrit avec vous des scénarios en situation réelle (« vous devez sortir la facturation du mois »), et chaque testeur exécute le parcours seul, sur son propre équipement.", pill: "Sélection manuelle" },
          { title: "Relecture et rapport", body: "Chaque réponse est relue par un humain. Les réponses bâclées sont refusées, non payées et non comptabilisées. Vous recevez un rapport rédigé, avec les résultats par scénario, les frictions priorisées et les verbatims, puis une restitution en visio.", pill: "Rapport sous 5 jours ouvrés" },
        ],
      }}
      deliverable={{
        title: "Un rapport que votre équipe produit utilise en comité dès réception.",
        items: [
          { title: "Le panel, rôle par rôle", body: "Métier, taille d'entreprise, outils utilisés, équipement. Anonymisé : le client voit T01, T02, jamais un nom." },
          { title: "Les résultats par scénario", body: "Combien ont atteint l'objectif, où les autres se sont arrêtés, et les réponses fermées agrégées." },
          { title: "Bugs et frictions, distingués", body: "Ce qui est cassé et ce qui est incompris ne se corrige pas de la même façon. Chaque friction est priorisée, avec captures d'écran quand elles existent." },
          { title: "Des verbatims avec leur question", body: "Chaque citation est rattachée à la question qui l'a provoquée, dans les mots d'un professionnel du métier." },
          { title: "Des recommandations arbitrables", body: "Classées par impact et effort technique, présentées en visio pour décider ce qui entre dans le prochain sprint." },
        ],
      }}
      guarantees={{
        title: "Ce que vous pouvez exiger",
        items: [
          { title: "Aucune donnée client réelle", body: "Le test se fait sur des comptes de démonstration et des données fictives que vous fournissez ou que nous construisons avec vous." },
          { title: "Accès distribués sous NDA, puis révoqués", body: "Seuls les testeurs retenus reçoivent un accès, après signature. Vous coupez les accès à la fin de la mission." },
          { title: "Réponses refusées, non facturées", body: "Une réponse bâclée n'est ni payée au testeur, ni comptée dans votre rapport, ni facturée." },
          { title: "Délai annoncé avant engagement", body: "Pour un rôle rare, le délai de recrutement est donné au cadrage, pas découvert en cours de mission." },
        ],
      }}
      faq={faq}
    />
  );
}
