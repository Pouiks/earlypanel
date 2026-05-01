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

const faqB2C = [
  { q: "Est-ce que je dois déclarer ces revenus ?", a: "Oui. Ce sont des revenus complémentaires, à déclarer dans votre déclaration annuelle. On vous fournit un récapitulatif chaque année pour vous simplifier la tâche au moment des impôts." },
  { q: "Combien de temps faut-il par mission ?", a: "En général entre 15 et 40 minutes selon ce qui est testé. La durée estimée est toujours précisée dans l'email d'invitation, avant que vous décidiez d'accepter. Pas de mauvaise surprise." },
  { q: "Quand et comment suis-je payé ?", a: "Par virement SEPA classique vers l'IBAN renseigné dans votre profil. En général le virement part dans les 72h après validation de votre test, parfois un peu plus si on doit relire en détail." },
  { q: "Que se passe-t-il si mon test est refusé ?", a: "On vous écrit pour vous dire pourquoi : réponses trop courtes, hors-sujet, ou copier-coller détecté. Le test n'est pas payé, mais votre compte reste actif. Si vous n'êtes pas d'accord avec la décision, vous pouvez demander une revue." },
  { q: "Mes données personnelles sont-elles protégées ?", a: "Oui. On ne revend rien à personne. Vos infos servent uniquement à vous matcher avec des missions qui correspondent à votre profil. Vous pouvez à tout moment supprimer votre compte depuis votre espace, ou nous écrire pour exercer vos droits RGPD." },
  { q: "Combien de missions vais-je recevoir par mois ?", a: "Honnêtement, ça dépend. En moyenne 1 à 3 missions par mois pour la plupart des profils. Les profils rares (médical, juridique, dirigeant) ou très spécialisés reçoivent plus de propositions, mais ce n'est pas une garantie." },
];

export default function TesteursPage() {
  return (
    <>
      <FaqJsonLd items={faqB2C} />

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
