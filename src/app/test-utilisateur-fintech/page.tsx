import type { Metadata } from "next";
import SectorLanding from "@/components/b2b/SectorLanding";

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
    <SectorLanding
      path="/test-utilisateur-fintech"
      breadcrumbName="Test utilisateur fintech"
      badge="Fintech · Facturation · Assurance · Juridique et réglementé"
      h1={<>Test utilisateur fintech : des utilisateurs qui vivent <em>KYC, TVA et conformité</em> au quotidien.</>}
      sub="Un test utilisateur fintech réussi tient à ses testeurs : un DAF qui a déjà migré trois outils, un expert-comptable qui sait ce qu'un export doit contenir, un gérant qui fait ses factures le dimanche soir. On recrute ces profils à la main, sur un environnement sans argent réel, et vous recevez un rapport UX rédigé."
      profiles={{
        eyebrow: "Qui teste votre produit financier",
        title: "Des professionnels du chiffre et des gérants, qui découvrent votre produit.",
        sub: "Des utilisateurs qui savent ce qu'ils devraient trouver, et qui ne pardonnent ni une mention de frais ambiguë ni un export incomplet.",
        cards: [
          { title: "DAF et contrôleurs de gestion", desc: "Ils ont déjà migré des outils, comparent aux standards du marché et jugent une trésorerie à la clarté de ses statuts.", example: "Trésorerie · Reporting" },
          { title: "Experts-comptables et collaborateurs", desc: "Ils savent exactement ce qu'un export doit contenir et repèrent une TVA mal expliquée en quelques secondes.", example: "Export · TVA · Justificatifs" },
          { title: "Gérants de PME et indépendants", desc: "Facturation, virements, notes de frais, souvent le soir et sur mobile. Des profils pressés qui abandonnent vite.", example: "Facture · Virement · Mobile" },
          { title: "Courtiers et conseillers", desc: "Souscription, comparaison, signature : des parcours où chaque étape doit rassurer un client qui n'est pas dans la pièce.", example: "Assurance · Souscription" },
          { title: "Juristes d'entreprise", desc: "Contrats, signatures, conformité : des lecteurs attentifs qui testent la précision des mentions autant que l'ergonomie.", example: "Contrat · Signature · Mentions" },
          { title: "Sur leur vrai équipement", desc: "Poste d'entreprise, navigateur imposé, téléphone personnel : le contexte réel d'usage, pas un poste de démo.", example: "Windows · Mac · Mobile" },
        ],
      }}
      parcours={{
        eyebrow: "Ce qu'on teste sur un produit fintech",
        title: "Les parcours où une erreur coûte de l'argent ou de la conformité.",
        sub: "Deux à quatre scénarios cadrés ensemble, sur un environnement de démonstration, chacun avec un critère de réussite observable.",
        cards: [
          { title: "Ouverture de compte et KYC", desc: "Vérification d'identité, pièces justificatives, délais annoncés : là où les nouveaux clients abandonnent sans dire pourquoi.", example: "Identité · Justificatifs" },
          { title: "Première facture, premier virement", desc: "La première action qui engage de l'argent. Compréhension des frais, des statuts, des confirmations.", example: "Facturation · Paiement" },
          { title: "Tableau de bord de trésorerie", desc: "Retrouver le chiffre qui compte, comprendre un statut, anticiper. La hiérarchie de l'écran testée par des inconnus.", example: "Trésorerie · Statuts" },
          { title: "Export et clôture comptable", desc: "Ce que le comptable doit recevoir, dans le format qu'il attend, sans rien retaper.", example: "Export · Rapprochement" },
          { title: "Souscription et signature", desc: "Assurance, contrat, mandat : un parcours qui doit rassurer à chaque étape et se terminer par une preuve.", example: "Souscription · Signature" },
          { title: "Maquette ou préversion", desc: "Le même test se fait avant le code, sur un prototype Figma, ou avant le lancement, sur votre environnement de test.", example: "Figma · Staging" },
        ],
      }}
      steps={{
        eyebrow: "Déroulé d'un test utilisateur fintech",
        title: "Du cadrage au rapport, en trois étapes.",
        sub: "Même déroulé que toutes nos missions, avec un cadrage précis des environnements de test.",
        items: [
          { title: "Cadrage des rôles et de l'environnement", body: "Une heure de visio pour définir les profils (DAF, comptable, courtier, gérant), les parcours critiques et l'environnement de démonstration : identités fictives, comptes de test, aucun mouvement réel. NDA signé avant tout échange.", pill: "1h de visio · NDA" },
          { title: "Recrutement et scénarios en situation", body: "On sélectionne huit à douze professionnels correspondant à votre cible, on écrit avec vous des scénarios ancrés dans leur réalité (« vous devez justifier un virement de 12 000 € à votre expert-comptable »), et ils les exécutent seuls, sur leur propre équipement.", pill: "Sélection manuelle" },
          { title: "Relecture et rapport", body: "Chaque réponse est relue par un humain, les réponses bâclées sont refusées et non comptabilisées. Vous recevez un rapport rédigé : résultats par scénario, frictions priorisées, verbatims, captures d'écran, puis une restitution en visio.", pill: "Rapport sous 5 jours ouvrés" },
        ],
      }}
      deliverable={{
        title: "Un rapport lisible par l'équipe produit, la direction et la conformité.",
        items: [
          { title: "Le panel par rôle", body: "Rôle, taille de structure, outils utilisés, équipement. Anonymisé : le client voit T01, T02, jamais un nom." },
          { title: "Les résultats par scénario", body: "Combien ont atteint l'objectif, où les autres se sont arrêtés, et les réponses fermées agrégées." },
          { title: "Les frictions de compréhension", body: "Frais, statuts, vérifications : distinguées des bugs, priorisées, avec captures d'écran." },
          { title: "Des verbatims dans les mots d'un comptable", body: "Chaque citation est rattachée à la question qui l'a provoquée." },
          { title: "Des recommandations arbitrables", body: "Classées par impact et effort technique, présentées en visio pour décider." },
        ],
      }}
      guarantees={{
        title: "Ce que vous pouvez exiger",
        items: [
          { title: "Aucun argent réel, aucune identité réelle", body: "Environnement de démonstration, comptes de test, documents fictifs fournis par vous ou construits avec nous." },
          { title: "Accès distribués sous NDA, puis révoqués", body: "Seuls les testeurs retenus reçoivent un accès, après signature. Vous coupez les accès à la fin." },
          { title: "Réponses refusées, non facturées", body: "Une réponse bâclée n'est ni payée au testeur, ni comptée dans votre rapport, ni facturée." },
          { title: "Pas un audit de conformité", body: "Le test mesure l'utilisabilité. Il complète vos audits, il ne les remplace pas." },
        ],
      }}
      faq={faq}
      related={[
        { href: "/test-conversion-funnel", label: "Pourquoi votre funnel ne convertit pas" },
        { href: "/blog/test-utilisateur-vs-ab-testing", label: "Test utilisateur ou A/B testing ?" },
        { href: "/securite", label: "Sécurité et protection des données" },
      ]}
    />
  );
}
