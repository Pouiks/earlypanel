import type { Metadata } from "next";
import Nav from "@/components/layout/Nav";
import PreLaunchBanner from "@/components/layout/PreLaunchBanner";
import HeroB2C from "@/components/b2c/HeroB2C";
import Separator from "@/components/ui/Separator";
import HowItWorks from "@/components/b2c/HowItWorks";
import EarnSection from "@/components/b2c/EarnSection";
import TestimonialsB2C from "@/components/b2c/TestimonialsB2C";
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
      "Inscription gratuite. Jusqu'à 100€ par mission. Paiement sous 72h. 500+ testeurs déjà inscrits.",
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
  { q: "Est-ce que je dois déclarer ces revenus ?", a: "Oui. Les revenus issus des tests sont des revenus complémentaires à déclarer aux impôts. Stripe vous fournit un récapitulatif annuel de vos gains pour simplifier votre déclaration." },
  { q: "Combien de temps faut-il par mission ?", a: "En moyenne 25 minutes. Chaque invitation précise la durée estimée avant que vous acceptiez. Vous ne pouvez jamais être surpris par une mission plus longue que prévue." },
  { q: "Quand et comment suis-je payé ?", a: "Par virement bancaire sous 72h après validation de votre test. Vous configurez votre IBAN une seule fois via notre interface sécurisée Stripe. Aucun intermédiaire." },
  { q: "Que se passe-t-il si mon test est refusé ?", a: "On vous explique pourquoi par email. Un test est refusé uniquement si les réponses sont trop courtes ou incohérentes. Vous ne serez pas payé pour ce test, mais votre profil reste actif." },
  { q: "Mes données personnelles sont-elles protégées ?", a: "Absolument. Vos données ne sont jamais revendues à des tiers. Elles servent uniquement au matching avec les missions. Tout est conforme RGPD, vous pouvez demander leur suppression à tout moment." },
  { q: "Combien de missions vais-je recevoir par mois ?", a: "Cela dépend de votre profil et de la demande côté clients. En moyenne, nos testeurs reçoivent 1 à 3 missions par mois. Les profils rares et experts reçoivent davantage d'invitations." },
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
      <TestimonialsB2C />
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
