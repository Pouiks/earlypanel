import type { Metadata } from "next";
import AnnounceBar from "@/components/layout/AnnounceBar";
import Nav from "@/components/layout/Nav";
import HeroB2B from "@/components/b2b/HeroB2B";
import Separator from "@/components/ui/Separator";
import ThreeMoments from "@/components/b2b/ThreeMoments";
import UseCaseGrid from "@/components/b2b/UseCaseGrid";
import Comparison from "@/components/b2b/Comparison";
import BriefSection from "@/components/b2b/BriefSection";
import SectorPills from "@/components/b2b/SectorPills";
import FaqAccordion from "@/components/ui/FaqAccordion";
import FaqJsonLd from "@/components/ui/FaqJsonLd";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
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

// FAQ optimisee SEO : les questions sont reformulees pour matcher l'intent
// de recherche Google (queries reelles tapees par les visiteurs B2B), tout
// en restant authentiques pour les visiteurs deja sur le site. Tirees de
// Google Suggest + "People Also Ask" sur "tests utilisateurs".
const faqB2B = [
  {
    q: "Combien coûte un test utilisateur en B2B ?",
    a: "Le tarif d'un test utilisateur B2B varie en fonction du profil recherché et de la complexité du parcours testé. Chez earlypanel, on construit un devis sur mesure après l'atelier de cadrage : nombre de testeurs, niveau de niche du profil (un DAF coûte plus qu'un grand public), durée du test, livrable attendu. Comptez généralement entre 1500 et 6000 € HT pour un projet complet livré en 5 jours, NDA et restitution inclus. Pour un budget précis, prenez 30 minutes avec nous : on chiffre sur le call.",
  },
  {
    q: "Combien de testeurs faut-il pour un test utilisateur ?",
    a: "Pour détecter 80% des problèmes d'utilisabilité majeurs, 5 à 8 testeurs suffisent (recherche de Jakob Nielsen, validée depuis 30 ans). Pour valider une hypothèse statistique ou comparer deux variantes (A/B), il faut 30+ testeurs. La règle pratique : 5-8 pour explorer et identifier des frictions, 12-20 pour mesurer la conversion sur un parcours, 30+ pour des chiffres significatifs. On vous oriente sur le bon volume pendant le cadrage selon votre objectif.",
  },
  {
    q: "Peut-on faire tester une maquette Figma avant de développer ?",
    a: "Oui, et c'est même recommandé. Une maquette Figma cliquable se teste exactement comme un produit en production : on partage le lien à nos testeurs, on définit un parcours à exécuter (s'inscrire, configurer un compte, lancer une action), et on collecte leurs réactions. Corriger un problème de parcours en phase Figma coûte environ 10x moins cher qu'en post-déploiement. Idéal entre la fin du design et le démarrage du dev.",
  },
  {
    q: "Tests utilisateurs et confidentialité : comment protéger un produit non-lancé ?",
    a: "Tout démarre par un NDA contractualisé, signé électroniquement avec valeur de preuve eIDAS, AVANT tout échange de matériel. Côté client comme côté testeurs. Les credentials d'accès créés pour le test (compte de démo, URL de staging) ne quittent pas le périmètre, sont supprimés à la clôture de la mission, et l'audit log conserve la traçabilité (qui a accédé, quand, depuis quelle IP). Conforme RGPD et adapté aux produits pré-lancement.",
  },
  {
    q: "Quelle est la différence entre tests utilisateurs et A/B testing ?",
    a: "L'A/B testing mesure quantitativement quelle variante convertit le mieux (besoin de trafic existant et d'un volume statistiquement significatif). Les tests utilisateurs collectent qualitativement le pourquoi des comportements (5-10 personnes qui verbalisent leurs blocages). Les deux sont complémentaires : on utilise les tests utilisateurs en amont pour identifier les frictions à corriger, et l'A/B test en aval pour valider l'amélioration auprès du trafic réel.",
  },
  {
    q: "Quand faire un test utilisateur dans un projet produit ?",
    a: "Trois moments à fort ROI : (1) entre le design et le dev, sur maquette Figma, pour valider que le parcours est compris avant d'investir dans du code ; (2) en phase de pré-lancement, sur staging, pour repérer les frictions invisibles à l'équipe interne qui connaît le produit par cœur ; (3) en post-lancement, quand un funnel ne convertit pas comme prévu, pour comprendre pourquoi sans deviner. Plus tôt vous testez, moins ça coûte.",
  },
  {
    q: "Comment sélectionnez-vous les testeurs B2B ?",
    a: "Sélection humaine, mission par mission. Vous décrivez votre cible (métier, secteur d'activité, ancienneté, taille d'entreprise, équipement, niveau digital) lors de l'atelier de cadrage. On pioche manuellement dans notre panel de 75+ profils français qualifiés les personnes qui correspondent. Pas d'algorithme de matching qui simule une cible : un humain regarde chaque profil et valide. Ça change tout pour les niches (santé, juridique, finance, IT).",
  },
  {
    q: "Quel est le délai pour obtenir un rapport de test utilisateur ?",
    a: "5 jours ouvrés à partir du lancement effectif des tests (donc une fois le questionnaire validé et les testeurs sélectionnés). Sur des scopes serrés (5 testeurs, parcours simple), c'est parfois 3-4 jours. Sur des scopes complexes (10+ testeurs, parcours en plusieurs étapes, profils niches difficiles à recruter), comptez 7-10 jours. Si vous avez une deadline ferme, on en discute dès le premier appel : on dimensionne la mission pour tenir l'échéance.",
  },
  {
    q: "Tests utilisateurs et RGPD : où sont stockées les données collectées ?",
    a: "100% en Europe. Notre infrastructure (base de données et stockage des documents) est hébergée par Supabase en région européenne, donc soumise au RGPD. Les IBAN des testeurs sont chiffrés en base (jamais affichés en clair). Les NDA signés sont stockés dans un bucket privé avec URLs signées à durée limitée. Toutes les actions sensibles (signature, accès aux données, paiement) sont consignées dans un audit log immuable. Notre panel est exclusivement basé en France métropolitaine — aucune donnée ne quitte l'UE.",
  },
  {
    q: "Que se passe-t-il si les résultats du test ne sont pas exploitables ?",
    a: "Cas extrêmement rare quand le brief est bien cadré (notre atelier amont sert exactement à ça). Si malgré tout les retours ne permettent pas de tirer de conclusion claire, on relance gratuitement une vague de tests avec d'autres profils. C'est notre engagement : payer pour un rapport vide n'a aucun sens, donc on porte le risque qualité. Tous les tests passent par une validation manuelle (réponses bâclées refusées, pas comptabilisées).",
  },
];

export default function EntreprisesPage() {
  return (
    <>
      {/* JSON-LD : balisage FAQPage pour rich snippets Google. Doit etre place
          dans le rendu HTML, ce composant ne renvoie qu'une balise <script>. */}
      <FaqJsonLd items={faqB2B} />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", url: "https://earlypanel.fr" },
          { name: "Entreprises", url: "https://earlypanel.fr/entreprises" },
        ]}
      />
      {/* JSON-LD : 3 packs Service pour rich results commerciaux + citations LLM. */}
      <ServiceJsonLd />

      <AnnounceBar />
      <Nav />
      <HeroB2B />
      <Separator />
      <ThreeMoments />
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
