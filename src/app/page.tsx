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
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "earlypanel · Tests utilisateurs clés en main",
  description:
    "Des vrais utilisateurs testent votre produit. Questionnaires ciblés, analyse actionnelle, livraison en 5 jours. Clés en main.",
  alternates: { canonical: "https://earlypanel.fr" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "earlypanel",
  description:
    "Tests utilisateurs clés en main. Panel humain, questionnaires ciblés, rapport actionnable livré en 5 jours.",
  url: "https://earlypanel.fr",
  provider: {
    "@type": "Organization",
    name: "earlypanel",
    url: "https://earlypanel.fr",
  },
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
    a: "Le tarif est sur mesure, calculé après l'atelier de cadrage gratuit. Les variables principales : nombre de testeurs (5 à 30 selon l'objectif), niveau de niche du profil cible (un grand public coûte moins qu'un cardiologue ou un DAF), durée du parcours testé, et complexité du livrable. Pour un projet typique avec 8-15 testeurs et un rapport rédigé livré en 5 jours, comptez entre 1500 et 6000 € HT. Aucun abonnement annuel, paiement à la livraison.",
  },
  {
    q: "Pourquoi choisir earlypanel plutôt qu'un outil SaaS comme UserTesting ou Maze ?",
    a: "Trois différences structurelles. (1) Sélection humaine des testeurs : on lit chaque profil un par un selon vos critères, là où les SaaS s'appuient sur du matching automatique qui rate les niches. (2) Co-construction du questionnaire : un humain de l'équipe vous accompagne sur la rédaction au lieu d'utiliser un template générique. (3) Rapport rédigé livré + restitution équipe en visioconférence, là où les SaaS livrent un dashboard de verbatims bruts à analyser vous-même. earlypanel est un service, pas un outil que vous configurez seul.",
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
    a: "Réservez un appel gratuit de 30 minutes via le bouton « Réserver un appel » du site. On échange sur votre besoin (produit à tester, cible utilisateur, délai souhaité), on identifie si nos profils correspondent, et on vous envoie un devis personnalisé sous 48 heures. Si vous validez, on attaque l'atelier de cadrage la semaine suivante. Premier rapport livrable typiquement 7-10 jours après le premier appel.",
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqJsonLd items={faqHomepage} />
      <AnnounceBar />
      <Nav />
      <main>
        <HeroLanding />
        <Separator />
        <StatementSection />
        <Separator />
        <ProcessSection />
        <Separator />
        <DifferentiatorsSection />
        <Separator />
        <LeadMagnetSection />
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
