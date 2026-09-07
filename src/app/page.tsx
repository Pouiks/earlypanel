import type { Metadata } from "next";
import AnnounceBar from "@/components/layout/AnnounceBar";
import Nav from "@/components/layout/Nav";
import HeroLanding from "@/components/landing/HeroLanding";
import Separator from "@/components/ui/Separator";
import StatementSection from "@/components/landing/StatementSection";
import ProcessSection from "@/components/landing/ProcessSection";
import DifferentiatorsSection from "@/components/landing/DifferentiatorsSection";
import LeadMagnetSection from "@/components/landing/LeadMagnetSection";
import AboutSection from "@/components/landing/AboutSection";
import FaqAccordion from "@/components/ui/FaqAccordion";
import FaqJsonLd from "@/components/ui/FaqJsonLd";
import ServiceJsonLd from "@/components/ui/ServiceJsonLd";
import Footer from "@/components/layout/Footer";
import { BOOKING_DURATION_MIN, PRICE_RANGE_LABEL } from "@/lib/cta-links";

export const metadata: Metadata = {
  // Le template du layout ajoute deja " · earlypanel" : ne pas le repeter ici.
  title: "Tests utilisateurs clés en main pour équipes produit",
  description:
    "Tests utilisateurs clés en main : testeurs choisis à la main, questionnaire écrit avec vous, réponses relues par un humain, rapport rédigé en 5 jours. Le rapport, pas le tableur.",
  alternates: { canonical: "/" },
};


// FAQ homepage : questions brand-level / service-level (qu'est-ce que c'est,
// pour qui, comment ça marche). Volontairement plus large que /entreprises et
// /testeurs qui couvrent les questions specifiques B2B/B2C. Objectifs :
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
    a: "earlypanel est un service de tests utilisateurs B2B clés en main, basé en France. Nous mettons en relation des entreprises (startups, scale-ups, agences, éditeurs SaaS) avec un panel humain de testeurs sélectionnés manuellement pour valider leurs produits digitaux : maquettes Figma, prototypes, URLs de pré-production, applications en production. Contrairement aux outils SaaS self-service, notre équipe écrit le questionnaire avec vous, choisit chaque testeur un par un, lit les retours et vous remet un rapport actionnable sous 5 jours ouvrés.",
  },
  {
    q: "À qui s'adresse earlypanel ?",
    a: "À deux audiences : (1) côté entreprise, les équipes produit qui veulent valider un parcours utilisateur avant ou après mise en production (Product Managers, designers, fondateurs, agences clientes finales) ; (2) côté testeur, les particuliers résidant en France qui souhaitent un complément de revenu en testant des produits digitaux 15-40 minutes par mission, rémunéré par virement SEPA. Les deux audiences ont des espaces dédiés sur le site : /entreprises pour démarrer un projet, /testeurs pour devenir testeur rémunéré.",
  },
  {
    q: "Comment se déroule un test utilisateur avec earlypanel ?",
    a: "Quatre étapes. (1) Atelier de cadrage offert : on cerne votre objectif et votre cible utilisateur. (2) Co-construction du questionnaire : nous proposons une première version, on itère ensemble jusqu'à ce que chaque question serve un objectif clair. (3) Sélection humaine des testeurs dans notre panel selon les critères convenus (métier, secteur, niveau digital, équipement, localisation). (4) Lancement, validation manuelle de chaque réponse soumise, et livraison d'un rapport rédigé avec restitution en visioconférence. Délai standard : 5 jours ouvrés à partir du lancement.",
  },
  {
    q: "Combien coûte un test utilisateur chez earlypanel ?",
    a: `Un forfait fixe par mission, chiffré sur devis après l'atelier de cadrage gratuit. Les variables principales : nombre de testeurs (5 à 30 selon l'objectif), niveau de niche du profil cible (un grand public coûte moins qu'un cardiologue ou un DAF), durée du parcours testé, et complexité du livrable. Pour un projet typique avec 8-15 testeurs et un rapport rédigé livré en 5 jours, comptez ${PRICE_RANGE_LABEL}. Aucun abonnement, pas de facturation au temps passé : 50 % à la commande, 50 % à la remise du rapport.`,
  },
  {
    q: "Pourquoi choisir earlypanel plutôt qu'un outil SaaS comme UserTesting ou Maze, ou qu'un freelance UX ?",
    a: "Face à un outil self-service, trois différences structurelles. (1) Sélection humaine des testeurs : on lit chaque profil un par un selon vos critères, là où les SaaS s'appuient sur du matching automatique qui rate les niches. (2) Co-construction du questionnaire : un humain de l'équipe vous accompagne sur la rédaction au lieu d'utiliser un template générique. (3) Rapport rédigé livré + restitution équipe en visioconférence, là où les SaaS livrent un dashboard de verbatims bruts à analyser vous-même. earlypanel est un service, pas un outil que vous configurez seul. Face à un freelance UX research (300 à 600 € par jour sur Malt), la différence est le panel : le freelance doit recruter les testeurs dans son réseau ou le vôtre, ce qui prend 2 à 4 semaines ; nous les avons déjà, sélectionnés et qualifiés, et le rapport arrive en 5 jours.",
  },
  {
    q: "earlypanel est-il disponible hors de France ?",
    a: "Notre panel testeurs est exclusivement basé en France métropolitaine, avec un IBAN bancaire français requis pour les paiements. Côté entreprise cliente, nous pouvons travailler avec des sociétés européennes ou internationales qui ciblent un marché français. L'infrastructure (base de données, stockage des documents, NDA signés) est hébergée en région européenne et soumise au RGPD : aucune donnée personnelle ne quitte l'UE.",
  },
  {
    q: "Comment garantissez-vous la qualité des retours utilisateurs ?",
    a: "Validation manuelle systématique de chaque test soumis, par un membre humain de notre équipe. Les réponses trop courtes, hors-sujet, ou détectées comme copier-coller sont refusées : non payées au testeur, non comptabilisées dans votre rapport. Notre système de score qualité par testeur applique également un malus aux profils bâclés (politique 3-strikes), ce qui filtre naturellement le panel. Vous ne recevez que des retours sérieux, lisibles, exploitables.",
  },
  {
    q: "Comment démarrer un projet avec earlypanel ?",
    a: `Réservez un appel gratuit de ${BOOKING_DURATION_MIN} minutes via le bouton « Réserver un appel » du site, ou demandez d'abord le rapport d'exemple si vous voulez voir le livrable avant de parler à quelqu'un. On échange sur votre besoin (produit à tester, cible utilisateur, délai souhaité), on identifie si nos profils correspondent, et on vous envoie un forfait chiffré sous 48 heures. Si vous validez, on attaque l'atelier de cadrage la semaine suivante. Premier rapport livrable typiquement 7-10 jours après le premier appel.`,
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
        <AboutSection />
        <Separator />
        <FaqAccordion
          eyebrow="Questions fréquentes"
          title="Tout ce que vous voulez savoir sur earlypanel."
          items={faqHomepage}
        />
      </main>
      <Footer variant="index" />
    </>
  );
}
