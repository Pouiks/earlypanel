import type { Metadata } from "next";
import AnnounceBar from "@/components/layout/AnnounceBar";
import Nav from "@/components/layout/Nav";
import HeroB2B from "@/components/b2b/HeroB2B";
import Separator from "@/components/ui/Separator";
import UseCaseGrid from "@/components/b2b/UseCaseGrid";
import TestimonialsB2B from "@/components/b2b/TestimonialsB2B";
import PricingTable from "@/components/b2b/PricingTable";
import Comparison from "@/components/b2b/Comparison";
import BriefSection from "@/components/b2b/BriefSection";
import SectorPills from "@/components/b2b/SectorPills";
import FaqAccordion from "@/components/ui/FaqAccordion";
import FaqJsonLd from "@/components/ui/FaqJsonLd";
import ServiceJsonLd from "@/components/ui/ServiceJsonLd";
import CtaFinal from "@/components/b2b/CtaFinal";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  // Title B2B optimise : intention "tests utilisateurs" + qualifier "B2B"
  // + benefice "clés en main". Description riche en mots-cles longue traine.
  title: "Tests utilisateurs B2B clés en main · 5 jours · NDA inclus",
  description:
    "Service de tests utilisateurs pour startups, scale-ups et agences. Panel de 500+ testeurs sélectionnés manuellement (SaaS, fintech, healthtech, e-commerce). NDA contractualisé, atelier de cadrage offert, rapport actionnable livré en 5 jours. À partir de 700€ HT.",
  keywords: [
    "tests utilisateurs B2B",
    "user testing France",
    "test SaaS",
    "test MVP",
    "audit UX",
    "panel testeurs qualifiés",
    "tests produit clés en main",
    "test maquette Figma",
    "test prototype",
    "test recette staging",
  ],
  alternates: { canonical: "https://earlypanel.fr/entreprises" },
  openGraph: {
    title: "Tests utilisateurs B2B clés en main · earlypanel",
    description:
      "500+ testeurs qualifiés. NDA contractualisé. Rapport en 5 jours. À partir de 700€ HT.",
    url: "https://earlypanel.fr/entreprises",
    type: "website",
  },
};

const faqB2B = [
  { q: "Mon produit n'est pas terminé, peut-on quand même tester ?", a: "Oui, c'est même recommandé. On teste des maquettes Figma, des prototypes cliquables, des URLs de staging — plus tôt vous testez, moins les corrections coûtent cher." },
  { q: "Comment garantissez-vous la confidentialité de mon produit ?", a: "Un NDA est signé avant tout échange, côté client et côté testeurs. Vos liens et accès ne sont jamais partagés en dehors de la session de test. Tout est contractualisé." },
  { q: "Comment sélectionnez-vous les testeurs ?", a: "On définit ensemble le profil exact lors de l'atelier de cadrage (secteur, métier, niveau digital, équipement, comportements d'achat…) et on sélectionne manuellement dans notre panel les profils qui correspondent." },
  { q: "Quel est le délai réel de livraison ?", a: "5 jours ouvrés à partir de la validation du questionnaire. Le délai peut être raccourci à 3 jours pour le pack Quick Test. Si vous êtes en urgence, contactez-nous directement." },
  { q: "Peut-on faire un test en plusieurs langues ?", a: "Oui. On dispose de testeurs francophones, anglophones et dans d'autres langues sur devis. Le questionnaire peut être adapté dans la langue de votre choix." },
  { q: "Que se passe-t-il si les résultats ne sont pas exploitables ?", a: "Chaque test est validé manuellement avant d'être comptabilisé. Si un test est jugé insuffisant, il est refusé et remplacé sans frais. Votre rapport contient uniquement des réponses validées." },
];

export default function EntreprisesPage() {
  return (
    <>
      {/* JSON-LD : balisage FAQPage pour rich snippets Google. Doit etre place
          dans le rendu HTML, ce composant ne renvoie qu'une balise <script>. */}
      <FaqJsonLd items={faqB2B} />
      {/* JSON-LD : 3 packs Service pour rich results commerciaux + citations LLM. */}
      <ServiceJsonLd />

      <AnnounceBar />
      <Nav />
      <HeroB2B />
      <Separator />
      <TestimonialsB2B />
      <Separator />
      <UseCaseGrid />
      <Separator />
      <PricingTable />
      <Separator />
      <Comparison />
      <Separator />
      <BriefSection />
      <Separator />
      <SectorPills />
      <Separator />
      <FaqAccordion
        eyebrow="Questions fréquentes"
        title="Tout ce que vous voulez savoir."
        items={faqB2B}
      />
      <CtaFinal />
      <Footer variant="b2b" />
    </>
  );
}
