import type { Metadata } from "next";
import AnnounceBar from "@/components/layout/AnnounceBar";
import Nav from "@/components/layout/Nav";
import HeroLanding from "@/components/landing/HeroLanding";
import Separator from "@/components/ui/Separator";
import StatementSection from "@/components/landing/StatementSection";
import ProcessSection from "@/components/landing/ProcessSection";
import DifferentiatorsSection from "@/components/landing/DifferentiatorsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import LeadMagnetSection from "@/components/landing/LeadMagnetSection";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "testpanel — Tests utilisateurs clés en main",
  description:
    "Des vrais utilisateurs testent votre produit. Questionnaires ciblés, analyse actionnelle, livraison en 5 jours. Clés en main.",
  alternates: { canonical: "https://testpanel.fr" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "testpanel",
  description:
    "Tests utilisateurs clés en main. Panel humain, questionnaires ciblés, rapport actionnable livré en 5 jours.",
  url: "https://testpanel.fr",
  provider: {
    "@type": "Organization",
    name: "testpanel",
    url: "https://testpanel.fr",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AnnounceBar />
      <Nav />
      <HeroLanding />
      <Separator />
      <StatementSection />
      <Separator />
      <ProcessSection />
      <Separator />
      <DifferentiatorsSection />
      <Separator />
      <TestimonialsSection />
      <Separator />
      <PricingSection />
      <LeadMagnetSection />
      <Footer variant="index" />
    </>
  );
}
