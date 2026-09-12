import type { Metadata } from "next";
import SectorLanding from "@/components/b2b/SectorLanding";

export const metadata: Metadata = {
  title: "Test utilisateur avant lancement sur staging",
  description:
    "Faites tester votre préproduction par des utilisateurs extérieurs avant le go-live. Frictions invisibles en interne, rapport UX en 5 jours, NDA inclus.",
  alternates: { canonical: "/test-pre-lancement-staging" },
  openGraph: {
    title: "Test utilisateur avant lancement sur staging · earlypanel",
    description: "Test utilisateur sur staging avant le go-live. Rapport rédigé en 5 jours, NDA inclus.",
    url: "/test-pre-lancement-staging",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "earlypanel · Tests utilisateurs livrés en 5 jours", type: "image/png" }],
  },
};

const faq = [
  {
    q: "Comment les testeurs accèdent-ils à un environnement de staging privé ?",
    a: "Vous créez des comptes de démonstration dédiés (ou un accès par lien protégé). On transmet les identifiants aux testeurs uniquement après signature du NDA, dans le questionnaire earlypanel. À la clôture de la mission, vous supprimez les comptes ; notre audit log conserve qui a accédé et quand.",
  },
  {
    q: "Quand faut-il tester avant le lancement ?",
    a: "Entre la pré-prod stabilisée et le J-7 du lancement. Trop tôt, les bugs techniques polluent les retours UX. Trop tard, vous n'avez plus le temps de corriger. Si vous nous appelez la veille du lancement, on vous conseillera de tester la version suivante plutôt que de faire un test pour rien.",
  },
  {
    q: "Combien de testeurs pour un test avant lancement ?",
    a: "10 à 20, selon le nombre de parcours à couvrir. Pour un SaaS avec un onboarding et une fonctionnalité principale, 10 à 12 testeurs suffisent. Pour un produit avec plusieurs rôles utilisateurs (admin, utilisateur final, invité), on recrute un petit groupe par rôle.",
  },
  {
    q: "Quelle différence avec une recette fonctionnelle ou des tests QA ?",
    a: "La recette vérifie que le produit fait ce qui est spécifié. Le test utilisateur vérifie que quelqu'un qui ne connaît pas le produit comprend quoi faire et y arrive. Un bouton peut fonctionner parfaitement en QA et rester introuvable pour un utilisateur réel. Les deux sont nécessaires, ils ne se remplacent pas.",
  },
  {
    q: "Mon produit n'est pas encore public : comment garantir la confidentialité ?",
    a: "NDA signé électroniquement (valeur de preuve eIDAS) par chaque testeur avant tout accès, et par earlypanel côté client. Les accès sont créés pour la mission et supprimés après. Nos données sont hébergées en Europe, soumises au RGPD, et l'audit log est immuable.",
  },
];

export default function TestPreLancementPage() {
  return (
    <SectorLanding
      path="/test-pre-lancement-staging"
      breadcrumbName="Tester avant le lancement"
      badge="Validation avant lancement · Sur votre URL de staging"
      h1={<>Test utilisateur avant lancement : ce que vos utilisateurs verront <em>et que votre équipe ne voit plus</em>.</>}
      sub="Un test avant lancement, c'est le dernier moment où une friction coûte une correction plutôt qu'un client. Le code marche, l'équipe est confiante, et personne d'extérieur n'a encore mis les mains dedans : dix à vingt testeurs sélectionnés à la main font ce bêta test produit sur votre staging, et vous savez ce qui bloque avant le go-live."
      stats={[
        { n: "5 j", l: "Rapport rédigé et restitué, pas des vidéos brutes" },
        { n: "100%", l: "Réponses relues par un humain, bâclées refusées" },
        { n: "10 à 20", l: "Testeurs sélectionnés à la main, un groupe par rôle" },
        { n: "NDA", l: "Signé avant tout accès au staging" },
      ]}
      problem={{
        title: "Le problème d'un test avant lancement fait en interne : votre équipe connaît le produit par cœur.",
        paragraphs: [
          "À quelques semaines du go-live, tout le monde en interne sait où cliquer, quel champ remplir, ce que veut dire chaque libellé. Ce savoir invisible cache les frictions qu'un nouvel utilisateur rencontrera dans les trente premières secondes.",
          "Les tests QA vérifient que les fonctionnalités marchent. Ils ne vérifient pas qu'un utilisateur les trouve, les comprend et va jusqu'au bout. Le premier retour honnête arrive souvent sous forme de désinscription, sans explication.",
          "Un test avant lancement earlypanel envoie sur votre staging des profils qui ressemblent à vos futurs clients, avec un parcours précis à effectuer, et documente chaque point où ils hésitent, se trompent ou abandonnent.",
        ],
      }}
      profiles={{
        eyebrow: "Qui teste votre produit avant le lancement",
        title: "Des profils qui ressemblent à vos futurs clients, un groupe par rôle.",
        sub: "Des gens qui n'ont jamais vu le produit, sélectionnés sur le métier, le niveau digital et l'équipement de votre cible.",
        cards: [
          { title: "Vos futurs clients, pas votre équipe", desc: "Métier, taille de structure, contexte d'usage : on part de votre cible de lancement et on pioche à la main dans le panel.", example: "Sélection manuelle" },
          { title: "Un petit groupe par rôle", desc: "Admin, utilisateur final, invité : chaque rôle a son parcours et ses testeurs, pour couvrir le produit tel qu'il sera vécu.", example: "Admin · Utilisateur · Invité" },
          { title: "Des découvreurs", desc: "Aucun testeur ne connaît vos libellés ni vos raccourcis. Ils font ce que fera un inscrit le jour du lancement.", example: "Regard neuf" },
          { title: "Le niveau digital de votre cible", desc: "Des profils à l'aise ou non avec les outils, pour que les frictions trouvées soient celles de vos vrais utilisateurs.", example: "Novice · Expert" },
          { title: "Sur leur vrai équipement", desc: "Windows, Mac, mobile personnel, navigateur imposé par l'entreprise : le contexte réel, pas un poste de démo.", example: "Windows · Mac · Mobile" },
          { title: "Sous NDA, accès temporaires", desc: "Chaque testeur signe avant de recevoir ses identifiants. Les comptes sont créés pour la mission et supprimés après.", example: "NDA · Comptes de test" },
        ],
      }}
      parcours={{
        eyebrow: "Ce qu'on teste avant le go-live",
        title: "Les parcours qui décident du lancement.",
        sub: "Un ou plusieurs parcours cadrés ensemble, chacun avec un critère de réussite observable, sur votre environnement de staging.",
        cards: [
          { title: "Onboarding et premier accès", desc: "De l'invitation à l'écran d'accueil : ce qui est compris, ce qui fait hésiter, où l'on abandonne.", example: "Inscription" },
          { title: "Première valeur", desc: "L'action qui justifie le produit, réalisée seule, sans documentation ni collègue à côté.", example: "Activation" },
          { title: "Paiement et souscription", desc: "Choix de l'offre, saisie, confirmation : la compréhension du prix et des engagements avant de cliquer.", example: "Checkout" },
          { title: "Parcours par rôle", desc: "Un admin qui invite, un utilisateur qui reçoit, un invité qui consulte : chaque rôle vit un produit différent.", example: "Multi-rôles" },
          { title: "Libellés et messages", desc: "Erreurs, états vides, confirmations : ce que le testeur comprend quand quelque chose ne se passe pas comme prévu.", example: "Messages · États" },
          { title: "Parcours mobile", desc: "Le même scénario sur téléphone, si votre cible l'utilise ainsi. Les frictions changent avec l'écran.", example: "Mobile" },
        ],
      }}
      steps={{
        eyebrow: "Déroulé d'un test avant lancement",
        title: "Comment on teste un produit avant le go-live.",
        sub: "Dix à vingt testeurs, un ou plusieurs parcours, des accès créés pour l'occasion et supprimés après, un rapport en cinq jours ouvrés après lancement.",
        items: [
          { title: "Cadrage et accès", body: "On identifie ensemble les parcours critiques pour le lancement (onboarding, première valeur, paiement) et le mode d'accès au staging. NDA signé avant tout échange.", pill: "1h de visio · NDA" },
          { title: "Sélection et exécution", body: "On choisit à la main des testeurs proches de votre cible et de vos rôles utilisateurs, on écrit le scénario avec vous, ils exécutent le parcours sur leur propre équipement.", pill: "Sélection manuelle" },
          { title: "Lecture et arbitrage", body: "Chaque réponse est relue par un humain. Le rapport classe les frictions : ce qui bloque un go-live, ce qui peut attendre la v1.1. Restitution en visio pour arbitrer avec l'équipe.", pill: "Rapport sous 5 jours ouvrés" },
        ],
      }}
      deliverable={{
        title: "Ce que vous recevez.",
        items: [
          { title: "Les frictions, parcours par parcours", body: "Avec le nombre de testeurs concernés pour chacune." },
          { title: "Les verbatims exacts", body: "Ce que le testeur a cherché, ce qu'il a compris, pourquoi il s'est arrêté." },
          { title: "Une priorisation go / no-go", body: "Ce qui bloque le lancement, ce qui gêne, ce qui peut attendre." },
          { title: "Les écarts de parcours", body: "Entre le chemin que vous avez imaginé et celui que les testeurs ont réellement suivi." },
          { title: "Une restitution en visio", body: "Avec l'équipe produit, design et tech." },
        ],
      }}
      guarantees={{
        title: "Ce que vous pouvez exiger",
        items: [
          { title: "Accès créés pour la mission, supprimés après", body: "Comptes de démonstration ou lien protégé, transmis après signature du NDA. À la clôture, vous supprimez ; l'audit log garde qui a accédé et quand." },
          { title: "Confidentialité d'un produit non public", body: "NDA signé électroniquement par chaque testeur et par earlypanel côté client. Données hébergées en Europe, soumises au RGPD." },
          { title: "Réponses refusées, non facturées", body: "Une réponse bâclée n'est ni payée au testeur, ni comptée dans votre rapport, ni facturée." },
          { title: "Pas une recette QA", body: "Le test vérifie qu'un inconnu comprend et y arrive. Il complète votre recette fonctionnelle, il ne la remplace pas." },
        ],
      }}
      faq={faq}
      faqTitle="Vos questions sur ce cas précis."
      related={[
        { href: "/blog/recette-application-mobile", label: "Réussir la recette d'une application mobile" },
        { href: "/blog/test-utilisateur-a-distance-methode", label: "Test utilisateur à distance : la méthode" },
        { href: "/securite", label: "Sécurité et protection des données" },
      ]}
    />
  );
}
