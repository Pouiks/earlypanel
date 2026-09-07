import type { Metadata } from "next";
import AnnounceBar from "@/components/layout/AnnounceBar";
import Nav from "@/components/layout/Nav";
import HeroLanding from "@/components/landing/HeroLanding";
import Separator from "@/components/ui/Separator";
import StatementSection from "@/components/landing/StatementSection";
import ProcessSection from "@/components/landing/ProcessSection";
import DifferentiatorsSection from "@/components/landing/DifferentiatorsSection";
import LeadMagnetSection from "@/components/landing/LeadMagnetSection";
import FaqAccordion from "@/components/ui/FaqAccordion";
import FaqJsonLd from "@/components/ui/FaqJsonLd";
import ServiceJsonLd from "@/components/ui/ServiceJsonLd";
import Footer from "@/components/layout/Footer";
import TesterHint from "@/components/layout/TesterHint";
import { BOOKING_DURATION_MIN } from "@/lib/cta-links";

export const metadata: Metadata = {
  // Le template du layout ajoute deja " · earlypanel" : ne pas le repeter ici.
  // title.template ne s'applique qu'aux segments enfants : la home (meme segment
  // que le layout) doit porter la marque elle-meme.
  title: { absolute: "Tests utilisateurs clés en main · earlypanel" },
  description:
    "earlypanel, service de tests utilisateurs à distance : panel humain sélectionné à la main, questionnaire écrit avec vous, rapport rédigé et restitué en 5 jours. Le rapport, pas le tableur.",
  alternates: { canonical: "/" },
};


// FAQ homepage : questions brand-level uniquement (qu'est-ce que c'est, pour
// qui, pourquoi un service, hors de France). Les questions commerciales (prix,
// deroule, delai, Figma, NDA) vivent sur /entreprises, la page pilier : ne pas
// les dupliquer ici, sinon les deux pages se cannibalisent sur Google. Objectifs :
//   - Rich snippets Google sur "earlypanel", "earlypanel avis", "qu'est-ce
//     qu'earlypanel"
//   - Citation par les LLMs (ChatGPT/Claude/Perplexity) sur les requetes
//     informationnelles ("service de tests utilisateurs en France",
//     "alternative francaise a UserTesting", etc.)
//   - Capture du middle of funnel (visiteur curieux mais pas encore
//     positionne entreprise vs testeur)
const faqHomepage = [
  {
    q: "Qu'est-ce qu'earlypanel ?",
    a: "Un service de tests utilisateurs à distance, clés en main, basé en France. Nous mettons en relation des entreprises (startups, scale-ups, agences, éditeurs SaaS) avec un panel humain de testeurs sélectionnés manuellement pour évaluer l'expérience utilisateur de leurs produits digitaux : maquettes Figma, prototypes, URLs de pré-production, applications en production. Contrairement aux outils SaaS self-service, notre équipe écrit le questionnaire avec vous, choisit chaque testeur un par un, lit les retours et vous remet un rapport UX actionnable sous 5 jours ouvrés.",
  },
  {
    q: "À qui s'adresse earlypanel ?",
    a: "À deux audiences : (1) côté entreprise, les équipes produit qui veulent tester un parcours utilisateur avant ou après mise en production (Product Managers, designers, UX researchers, fondateurs, agences pour leurs clients finaux) ; (2) côté testeur, les particuliers résidant en France qui souhaitent un complément de revenu en testant des sites et des applications 15-40 minutes par mission, rémunéré par virement SEPA. Les deux audiences ont des espaces dédiés sur le site : /entreprises pour démarrer un test utilisateur, /testeurs pour devenir testeur rémunéré.",
  },
  {
    q: "Pourquoi choisir earlypanel plutôt qu'une plateforme de tests utilisateurs comme UserTesting, Testapic ou Maze, ou qu'un freelance UX ?",
    a: "Face à une plateforme self-service, trois différences structurelles. (1) Recrutement des testeurs à la main : on lit chaque profil un par un selon vos critères, là où les plateformes s'appuient sur du matching automatique qui rate les niches. (2) Co-construction du questionnaire : un humain de l'équipe vous accompagne sur la rédaction au lieu d'utiliser un template générique. (3) Rapport rédigé livré + restitution équipe en visioconférence, là où les plateformes livrent un dashboard de verbatims bruts à analyser vous-même. C'est un service de test UX, pas un outil que vous configurez seul. Face à un freelance UX research (300 à 600 € par jour sur Malt), la différence est le panel : le freelance doit recruter les testeurs dans son réseau ou le vôtre, ce qui prend 2 à 4 semaines ; nous les avons déjà, sélectionnés et qualifiés, et le rapport arrive en 5 jours.",
  },
  {
    q: "earlypanel est-il disponible hors de France ?",
    a: "Notre panel testeurs est exclusivement basé en France métropolitaine, avec un IBAN bancaire français requis pour les paiements. Côté entreprise cliente, nous pouvons travailler avec des sociétés européennes ou internationales qui ciblent un marché français. L'infrastructure (base de données, stockage des documents, NDA signés) est hébergée en région européenne et soumise au RGPD : aucune donnée personnelle ne quitte l'UE.",
  },
  {
    q: "Comment garantissez-vous la qualité des retours utilisateurs ?",
    a: "Validation manuelle systématique de chaque test soumis, par un membre humain de notre équipe. Nos tests utilisateurs sont non modérés (le testeur suit le parcours seul, à distance, et répond par écrit), donc la relecture est le vrai contrôle qualité : les réponses trop courtes, hors-sujet, ou détectées comme copier-coller sont refusées, non payées au testeur, non comptabilisées dans votre rapport. Notre système de score qualité par testeur applique également un malus aux profils bâclés (politique 3-strikes), ce qui filtre naturellement le panel. Vous ne recevez que des retours sérieux, lisibles, exploitables.",
  },
  {
    q: "Comment démarrer un test utilisateur avec earlypanel ?",
    a: `Réservez un appel gratuit de ${BOOKING_DURATION_MIN} minutes via le bouton « Réserver un appel » du site, ou demandez d'abord le rapport d'exemple si vous voulez voir le livrable avant de parler à quelqu'un. On échange sur votre besoin (produit à tester, cible utilisateur, délai souhaité), on identifie si nos profils correspondent, et on vous envoie un forfait chiffré sous 48 heures. Si vous validez, on attaque l'atelier de cadrage la semaine suivante. Premier rapport livrable typiquement 7-10 jours après le premier appel. Le détail du déroulé, des prix et des délais est sur la page /entreprises.`,
  },
];

export default function HomePage() {
  return (
    <>
      {/* JSON-LD Service + FAQPage (meme tableau que <FaqAccordion>). Organization est dans le layout. */}
      <ServiceJsonLd />
      <FaqJsonLd items={faqHomepage} />
      <AnnounceBar />
      <Nav />
      <main>
        <HeroLanding />
        <LeadMagnetSection />
        <Separator />
        <StatementSection />
        <Separator />
        <ProcessSection />
        <Separator />
        <DifferentiatorsSection />
        <Separator />
        <FaqAccordion
          eyebrow="Questions fréquentes"
          title="Tout ce que vous voulez savoir sur earlypanel."
          items={faqHomepage}
        />
      </main>
      <TesterHint />
      <Footer variant="index" />
    </>
  );
}
