import type { Metadata } from "next";
import Nav from "@/components/layout/Nav";
import HeroB2C from "@/components/b2c/HeroB2C";
import Separator from "@/components/ui/Separator";
import HowItWorks from "@/components/b2c/HowItWorks";
import EarnSection from "@/components/b2c/EarnSection";
import ProfileGrid from "@/components/b2c/ProfileGrid";
import RegisterSection from "@/components/b2c/RegisterSection";
import FaqAccordion from "@/components/ui/FaqAccordion";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "testpanel — Devenir testeur rémunéré",
  description:
    "Rejoignez notre panel de testeurs. Donnez votre avis sur des apps et sites web, jusqu'à 100€ par mission selon votre profil.",
  alternates: { canonical: "https://testpanel.fr/testeurs" },
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
