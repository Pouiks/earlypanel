import type { Metadata } from "next";
import Nav from "@/components/layout/Nav";
import PreLaunchBanner from "@/components/layout/PreLaunchBanner";
import HeroB2C from "@/components/b2c/HeroB2C";
import Separator from "@/components/ui/Separator";
import HowItWorks from "@/components/b2c/HowItWorks";
import EarnSection from "@/components/b2c/EarnSection";
import ProfileGrid from "@/components/b2c/ProfileGrid";
import RegisterSection from "@/components/b2c/RegisterSection";
import FaqAccordion from "@/components/ui/FaqAccordion";
import FaqJsonLd from "@/components/ui/FaqJsonLd";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  // Title B2C : exact match du mot-cle principal "devenir testeur remunere"
  // + chiffre attractif. Description : freins addresses (gratuit, paiement).
  title: "Devenir testeur rémunéré · Jusqu'à 100€ par mission",
  description:
    "Devenez testeur rémunéré pour applications et sites web. Inscription gratuite, paiement sous 72h par virement. Missions sur mesure adaptées à votre profil (salarié, freelance, étudiant, parent au foyer). 25 min en moyenne par mission.",
  keywords: [
    "devenir testeur rémunéré",
    "testeur d'applications rémunéré",
    "test produit payé",
    "complément de revenu",
    "panel testeur France",
    "user testing rémunéré",
    "tests utilisateurs payés",
    "missions rémunérées en ligne",
  ],
  alternates: { canonical: "https://earlypanel.fr/testeurs" },
  openGraph: {
    title: "Devenir testeur rémunéré · earlypanel",
    description:
      "Inscription gratuite. Jusqu'à 100€ par mission. Paiement sous 72h. 75+ testeurs déjà inscrits.",
    url: "https://earlypanel.fr/testeurs",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "earlypanel — Tests utilisateurs livrés en 5 jours",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

// FAQ B2C optimisee SEO : questions reformulees pour matcher les recherches
// Google reelles ("comment devenir testeur remunere", "tester des sites
// internet contre argent", "complement de revenu en ligne", etc.).
const faqB2C = [
  {
    q: "Comment devenir testeur rémunéré en France ?",
    a: "L'inscription est gratuite et prend environ 5 minutes. Vous renseignez votre profil (métier, équipement, centres d'intérêt) puis votre IBAN pour les paiements. Une fois votre profil validé, vous recevez par email les invitations à des missions de test qui correspondent à votre profil. Vous acceptez ou refusez librement. Les missions paient entre 15 et 100 € selon votre profil et la durée du test.",
  },
  {
    q: "Combien gagne un testeur d'applications par mois ?",
    a: "Cela dépend de votre profil et de votre disponibilité. En moyenne 30 à 150 €/mois pour les profils courants (1 à 3 missions). Les profils rares ou très spécialisés (médecin, avocat, DAF, ingénieur niche) reçoivent plus de propositions et peuvent atteindre 200-400 €/mois. Ce n'est pas un revenu principal mais un complément régulier, modulable selon votre disponibilité réelle.",
  },
  {
    q: "Combien de temps prend un test utilisateur ?",
    a: "Entre 15 et 40 minutes en moyenne, selon le format (maquette Figma, application en production, document à analyser). La durée estimée est toujours précisée dans l'email d'invitation, AVANT que vous acceptiez la mission. Vous savez exactement à quoi vous engager. Pas de mauvaise surprise.",
  },
  {
    q: "Quand suis-je payé après un test utilisateur ?",
    a: "Par virement SEPA vers l'IBAN renseigné dans votre profil, généralement sous 72 heures après validation de votre test par notre équipe. Sur des projets complexes nécessitant plus de relecture, parfois 5-7 jours ouvrés. Vous suivez l'état de chaque paiement (en attente / programmé / payé) depuis votre espace personnel.",
  },
  {
    q: "Faut-il déclarer les revenus issus de tests utilisateurs aux impôts ?",
    a: "Oui. Ce sont des revenus complémentaires, à déclarer dans votre déclaration annuelle (case appropriée selon votre situation). Si vous dépassez certains seuils (2000 €/an ou 30 transactions/an), nous remontons aussi vos paiements à l'administration fiscale française dans le cadre de la directive européenne DAC7. Nous vous fournissons un récapitulatif annuel de vos gains pour faciliter votre déclaration.",
  },
  {
    q: "Quels critères pour devenir testeur ?",
    a: "Avoir 18 ans ou plus, résider en France métropolitaine, disposer d'un IBAN bancaire français pour les paiements, et d'un équipement digital de base (ordinateur ou smartphone récent + connexion internet). Aucun diplôme ni expérience requis. Notre panel cherche autant des profils grand public que des profils spécialisés (santé, juridique, comptabilité, IT, etc.). Inscription gratuite, sans engagement.",
  },
  {
    q: "Que se passe-t-il si mon test est refusé ?",
    a: "Nous vous écrivons par email pour expliquer précisément pourquoi : réponses trop courtes, hors-sujet, ou copier-coller détecté. Le test n'est pas payé. Votre compte reste actif sauf en cas de récidive (politique 3-strikes). Si vous estimez la décision injustifiée, vous pouvez demander une revue par un autre membre de l'équipe. Tous les retours bâclés sont rejetés pour préserver la qualité du panel.",
  },
  {
    q: "Comment earlypanel protège-t-il mes données personnelles ?",
    a: "Aucune donnée vendue à des tiers, jamais. Vos informations servent uniquement à vous proposer des missions correspondant à votre profil. L'IBAN est chiffré en base de données (jamais affiché en clair, jamais envoyé par email). Vous pouvez à tout moment supprimer votre compte depuis votre espace personnel, ce qui efface l'ensemble de vos données conformément à l'article 17 du RGPD. Pour exercer vos autres droits RGPD : contact@earlypanel.fr.",
  },
  {
    q: "Combien de missions vais-je recevoir par mois ?",
    a: "Variable selon votre profil et la demande client. En moyenne 1 à 3 missions par mois pour les profils standards, parfois plus pour les profils rares (santé, juridique, finance) ou très spécialisés. Aucun engagement de fréquence : earlypanel ne garantit pas un volume minimal. C'est un complément de revenu, pas un emploi régulier. Plus votre profil est complet et précis, plus les invitations sont pertinentes.",
  },
  {
    q: "Tester des applications est-il un vrai complément de revenu fiable ?",
    a: "Oui, à condition d'être réaliste sur le volume. earlypanel n'est pas un système qui promet « 1000 € par semaine en testant des apps depuis chez vous » (ce serait un mensonge). C'est une plateforme professionnelle de tests utilisateurs B2B où des entreprises clientes paient pour des retours qualitatifs. Le complément de revenu est réel mais modulable, adapté à des étudiants, parents au foyer, salariés en complément, retraités, freelances entre deux missions.",
  },
];

export default function TesteursPage() {
  return (
    <>
      <FaqJsonLd items={faqB2C} />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", url: "https://earlypanel.fr" },
          { name: "Devenir testeur", url: "https://earlypanel.fr/testeurs" },
        ]}
      />

      <PreLaunchBanner />
      <Nav />
      <HeroB2C />
      <Separator />
      <HowItWorks />
      <Separator />
      <EarnSection />
      <Separator />
      <ProfileGrid />
      <Separator />
      <RegisterSection />
      <Separator />
      <FaqAccordion
        eyebrow="Questions fréquentes"
        title="Vos questions, nos réponses."
        items={faqB2C}
      />
      <Footer variant="b2c" />
    </>
  );
}
