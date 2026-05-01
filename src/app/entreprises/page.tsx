import type { Metadata } from "next";
import AnnounceBar from "@/components/layout/AnnounceBar";
import Nav from "@/components/layout/Nav";
import HeroB2B from "@/components/b2b/HeroB2B";
import Separator from "@/components/ui/Separator";
import UseCaseGrid from "@/components/b2b/UseCaseGrid";
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
    "Service de tests utilisateurs pour startups, scale-ups et agences. Panel de 75+ testeurs sélectionnés manuellement (SaaS, fintech, healthtech, e-commerce). NDA contractualisé, atelier de cadrage offert, rapport actionnable livré en 5 jours. Devis sur mesure.",
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
      "75+ testeurs qualifiés. NDA contractualisé. Rapport en 5 jours. Devis sur mesure.",
    url: "https://earlypanel.fr/entreprises",
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

const faqB2B = [
  { q: "Mon produit n'est pas terminé, peut-on quand même tester ?", a: "Oui, et c'est souvent là que tester apporte le plus. Une maquette Figma, un prototype cliquable, une URL de staging : tout ça se teste. Corriger un problème de parcours sur Figma coûte 10x moins cher que le corriger une fois en production." },
  { q: "Comment garantissez-vous la confidentialité de mon produit ?", a: "Tout passe par un NDA signé avant qu'on échange quoi que ce soit. Côté client comme côté testeurs. Les accès que vous nous fournissez ne sortent pas du périmètre du test, et les credentials créés pour l'occasion sont supprimés une fois la mission terminée." },
  { q: "Comment sélectionnez-vous les testeurs ?", a: "On en discute lors de l'atelier de cadrage. Vous nous décrivez votre utilisateur cible (métier, secteur, ancienneté, équipement, voire comportements d'achat) et on va piocher manuellement dans notre panel les profils qui collent. Pas de matching automatique : c'est de la sélection humaine, mission par mission." },
  { q: "Quel est le délai réel de livraison ?", a: "Comptez 5 jours ouvrés à partir du moment où on lance les tests (donc une fois le questionnaire validé). Sur des scopes serrés, ça peut être plus rapide. Si vous êtes en urgence, dites-le-nous dès l'appel : on regarde si c'est faisable." },
  { q: "Peut-on faire un test en plusieurs langues ?", a: "Oui. On a des testeurs francophones, anglophones, et d'autres langues disponibles sur demande. Le questionnaire est traduit dans la langue de l'utilisateur cible. Ce n'est pas un détail, ça change la qualité des réponses." },
  { q: "Que se passe-t-il si les résultats ne sont pas exploitables ?", a: "Tous les tests passent par une validation manuelle avant d'être comptés. Si un test n'est pas jugé suffisamment sérieux (réponses trop courtes, hors-sujet, copier-coller), il est refusé : pas comptabilisé pour vous, pas payé au testeur, et on en lance un nouveau pour combler. Votre rapport ne contient que ce qui a passé ce filtre." },
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
      <UseCaseGrid />
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
