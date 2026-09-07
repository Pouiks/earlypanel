import type { Metadata } from "next";
import SituationLanding from "@/components/b2b/SituationLanding";

export const metadata: Metadata = {
  title: "Tester son produit avant le lancement · Test utilisateur sur staging",
  description:
    "10 à 20 testeurs sélectionnés à la main parcourent votre URL de staging avant le go-live. Frictions documentées, priorisées, rapport rédigé en 5 jours. NDA inclus.",
  alternates: { canonical: "/test-pre-lancement-staging" },
  openGraph: {
    title: "Tester son produit avant le lancement · earlypanel",
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
    <SituationLanding
      path="/test-pre-lancement-staging"
      breadcrumbName="Tester avant le lancement"
      eyebrow="Validation avant lancement · Sur votre URL de staging"
      h1={<>Tester votre produit <em>avant le lancement</em>, avec des gens qui ne le connaissent pas.</>}
      lede="Le code marche, l'équipe est confiante, et personne d'extérieur n'a encore mis les mains dedans. Dix à vingt testeurs sélectionnés à la main parcourent votre staging, et vous savez ce qui bloque avant que vos premiers clients ne le découvrent."
      problem={{
        title: "Le problème : votre équipe connaît le produit par cœur.",
        paragraphs: [
          "À quelques semaines du go-live, tout le monde en interne sait où cliquer, quel champ remplir, ce que veut dire chaque libellé. Ce savoir invisible cache les frictions qu'un nouvel utilisateur rencontrera dans les trente premières secondes.",
          "Les tests QA vérifient que les fonctionnalités marchent. Ils ne vérifient pas qu'un utilisateur les trouve, les comprend et va jusqu'au bout. Le premier retour honnête arrive souvent sous forme de désinscription, sans explication.",
          "Un test avant lancement earlypanel envoie sur votre staging des profils qui ressemblent à vos futurs clients, avec un parcours précis à effectuer, et documente chaque point où ils hésitent, se trompent ou abandonnent.",
        ],
      }}
      method={{
        title: "Comment on teste un produit avant le go-live.",
        intro: "Dix à vingt testeurs, un ou plusieurs parcours, des accès créés pour l'occasion et supprimés après, un rapport en cinq jours ouvrés après lancement.",
        steps: [
          { title: "Cadrage et accès", body: "On identifie ensemble les parcours critiques pour le lancement (onboarding, première valeur, paiement) et le mode d'accès au staging. NDA signé avant tout échange." },
          { title: "Sélection et exécution", body: "On choisit à la main des testeurs proches de votre cible et de vos rôles utilisateurs, on écrit le scénario avec vous, ils exécutent le parcours sur leur propre équipement." },
          { title: "Lecture et arbitrage", body: "Chaque réponse est relue par un humain. Le rapport classe les frictions : ce qui bloque un go-live, ce qui peut attendre la v1.1. Restitution en visio pour arbitrer avec l'équipe." },
        ],
      }}
      deliverable={{
        title: "Ce que vous recevez.",
        bullets: [
          "La liste des frictions rencontrées, parcours par parcours, avec le nombre de testeurs concernés.",
          "Les verbatims exacts : ce que le testeur a cherché, ce qu'il a compris, pourquoi il s'est arrêté.",
          "Une priorisation go / no-go : ce qui bloque le lancement, ce qui gêne, ce qui peut attendre.",
          "Les écarts entre le parcours que vous avez imaginé et celui que les testeurs ont réellement suivi.",
          "Une restitution en visio avec l'équipe produit, design et tech.",
        ],
      }}
      faq={faq}
      ctaTitle="Vous lancez dans quelques semaines ?"
    />
  );
}
