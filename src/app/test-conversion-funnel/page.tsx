import type { Metadata } from "next";
import SectorLanding from "@/components/b2b/SectorLanding";

export const metadata: Metadata = {
  title: "Pourquoi votre funnel ne convertit pas : test utilisateur",
  description:
    "Vos analytics disent où les utilisateurs partent, pas pourquoi. Test utilisateur sur checkout, onboarding ou dashboard : frictions priorisées en 5 jours.",
  alternates: { canonical: "/test-conversion-funnel" },
  openGraph: {
    title: "Pourquoi votre funnel ne convertit pas : test utilisateur · earlypanel",
    description: "Test utilisateur ciblé sur la zone qui décroche : checkout, onboarding, dashboard. Rapport rédigé en 5 jours.",
    url: "/test-conversion-funnel",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "earlypanel · Tests utilisateurs livrés en 5 jours", type: "image/png" }],
  },
};

const faq = [
  {
    q: "Quelle est la différence entre un test utilisateur et un A/B test pour améliorer la conversion ?",
    a: "L'A/B test mesure quelle variante convertit le mieux, à condition d'avoir assez de trafic pour un résultat significatif. Il ne dit pas pourquoi. Le test utilisateur fait verbaliser 8 à 15 personnes sur ce qui les a bloquées ou fait hésiter. Dans la pratique : test utilisateur d'abord pour trouver les frictions et formuler des hypothèses, A/B test ensuite pour valider la correction sur le trafic réel.",
  },
  {
    q: "Peut-on tester un produit en production sans toucher aux données réelles ?",
    a: "Oui. Les testeurs utilisent des comptes créés pour la mission, ou parcourent le tunnel jusqu'à l'étape de paiement sans le finaliser (ou avec un moyen de paiement de test si vous le fournissez). On cible la zone précise qui décroche, pas l'ensemble du produit.",
  },
  {
    q: "Comment choisissez-vous les testeurs pour un test de conversion ?",
    a: "On part de votre base utilisateur réelle : métier, taille d'entreprise, niveau digital, équipement, contexte d'usage. On pioche à la main dans notre panel les profils qui y ressemblent. Tester un checkout B2B avec des testeurs grand public donnerait des frictions qui ne sont pas les vôtres.",
  },
  {
    q: "En combien de temps a-t-on des résultats ?",
    a: "Cinq jours ouvrés après le lancement des tests, une fois le questionnaire validé et les testeurs sélectionnés. Le rapport arrive rédigé et priorisé, avec restitution en visio. Comptez 7 à 10 jours entre le premier appel et la restitution.",
  },
  {
    q: "Combien coûte un test utilisateur sur un funnel de conversion ?",
    a: "Forfait fixe chiffré après l'atelier de cadrage offert, généralement entre 1 500 et 6 000 € HT selon le nombre de testeurs (8 à 15 pour un funnel) et la rareté des profils. À comparer au coût d'un mois supplémentaire de trafic payant qui décroche au même endroit.",
  },
];

export default function TestConversionFunnelPage() {
  return (
    <SectorLanding
      path="/test-conversion-funnel"
      breadcrumbName="Comprendre un funnel qui ne convertit pas"
      badge="Optimisation post-lancement · Produit en production"
      h1={<>Votre funnel ne convertit pas ? <em>Demandez à vos utilisateurs pourquoi</em>, arrêtez de deviner.</>}
      sub="Pour améliorer le taux de conversion, vos analytics ne suffisent pas : ils disent à quelle étape les utilisateurs partent, jamais ce qu'ils ont vécu à ce moment-là. Un test utilisateur sur votre tunnel de conversion, avec huit à quinze testeurs proches de votre base, vous l'explique, verbatims à l'appui, en cinq jours."
      stats={[
        { n: "5 j", l: "Rapport rédigé et restitué, pas des vidéos brutes" },
        { n: "100%", l: "Réponses relues par un humain, bâclées refusées" },
        { n: "8 à 15", l: "Testeurs proches de votre base utilisateur réelle" },
        { n: "NDA", l: "Signé avant tout échange, côté client et testeurs" },
      ]}
      problem={{
        title: "Le problème pour améliorer le taux de conversion : les chiffres montrent le où, jamais le pourquoi.",
        paragraphs: [
          "Le funnel décroche à l'étape 3. Vous avez regardé les heatmaps, les enregistrements de session, les taux de rebond. Vous avez cinq hypothèses en réunion, et chacun défend la sienne. La roadmap du trimestre se construit sur une supposition.",
          "Un A/B test tranchera entre deux variantes, mais il ne vous dira pas laquelle des cinq hypothèses est la bonne, et il exige un trafic que vous n'avez peut-être pas.",
          "Un test earlypanel cible précisément la zone qui décroche (checkout, onboarding, écran de configuration, page tarifaire), y envoie des profils qui ressemblent à vos utilisateurs réels, et leur demande de décrire ce qu'ils ont compris, cherché et ressenti à chaque étape.",
        ],
      }}
      profiles={{
        eyebrow: "Qui teste votre funnel",
        title: "Des profils qui ressemblent à votre base utilisateur réelle.",
        sub: "Tester un checkout B2B avec des testeurs grand public donnerait des frictions qui ne sont pas les vôtres. On part de vos utilisateurs.",
        cards: [
          { title: "Le métier de vos utilisateurs", desc: "Gérant, acheteur, responsable marketing : on pioche à la main dans le panel les profils qui exercent le métier de ceux qui décrochent.", example: "Sélection manuelle" },
          { title: "La taille d'entreprise", desc: "Indépendant, PME, grand compte : le même tunnel n'est pas vécu pareil selon qui paie et qui décide.", example: "TPE · PME · ETI" },
          { title: "Le niveau digital", desc: "Des profils à l'aise ou non, selon votre trafic réel. Un utilisateur pressé n'abandonne pas au même endroit qu'un expert.", example: "Novice · Expert" },
          { title: "Le contexte d'usage", desc: "Mobile entre deux réunions, poste de bureau, tablette : on retient les testeurs dont le quotidien correspond à votre trafic.", example: "Desktop · Mobile" },
          { title: "Des inconnus qui n'ont rien à vous prouver", desc: "Ils ne connaissent pas votre produit ni vos hypothèses. Ils décrivent ce qu'ils ont compris, cherché et ressenti.", example: "Regard neuf" },
          { title: "Sur leur vrai équipement", desc: "Navigateur personnel, bloqueur de pub, téléphone de trois ans : les conditions réelles de votre trafic.", example: "Windows · Mac · Mobile" },
        ],
      }}
      parcours={{
        eyebrow: "Ce qu'on teste sur un funnel",
        title: "La zone précise qui décroche, pas tout le produit.",
        sub: "On part de vos analytics pour isoler l'étape à problème et on y envoie des testeurs avec un scénario précis.",
        cards: [
          { title: "Checkout et paiement", desc: "Choix de l'offre, saisie, confirmation : ce qui fait hésiter avant de cliquer, jusqu'à l'étape de paiement sans la finaliser.", example: "Panier · Paiement" },
          { title: "Onboarding après inscription", desc: "Les premières minutes : ce que l'utilisateur croit devoir faire, ce qu'il cherche, où il ferme l'onglet.", example: "Activation" },
          { title: "Page tarifaire", desc: "Ce qu'il comprend de l'offre, ce qu'il pense payer, et pourquoi il ne choisit pas.", example: "Pricing" },
          { title: "Écran de configuration", desc: "L'étape technique qui fait fuir : champs, choix, vocabulaire. Ce qui est compris et ce qui bloque.", example: "Paramétrage" },
          { title: "Landing page vers l'essai", desc: "De l'arrivée à la conversion : promesse comprise, bouton trouvé, formulaire terminé.", example: "Acquisition" },
          { title: "Vos hypothèses, mises à l'épreuve", desc: "Chaque hypothèse de la réunion devient une question du scénario, posée sans orienter la réponse.", example: "Hypothèses" },
        ],
      }}
      steps={{
        eyebrow: "Déroulé d'un test de conversion",
        title: "Comment on teste un funnel qui décroche.",
        sub: "Huit à quinze testeurs, un parcours ciblé sur la zone à problème, un rapport en cinq jours ouvrés après lancement.",
        items: [
          { title: "Cadrage sur vos données", body: "On part de vos analytics pour isoler l'étape qui décroche et lister vos hypothèses. Le questionnaire est écrit pour les mettre à l'épreuve sans orienter les réponses.", pill: "1h de visio · Vos analytics" },
          { title: "Sélection et parcours", body: "On choisit à la main des testeurs proches de votre base utilisateur réelle. Ils exécutent le parcours en production ou sur un compte de test, sur leur propre équipement.", pill: "Sélection manuelle" },
          { title: "Lecture et priorisation", body: "Chaque réponse est relue par un humain. Le rapport rattache chaque friction à vos hypothèses, les confirme ou les écarte, et priorise ce qui débloque la conversion.", pill: "Rapport sous 5 jours ouvrés" },
        ],
      }}
      deliverable={{
        title: "Ce que vous recevez.",
        items: [
          { title: "Chaque hypothèse tranchée", body: "Confirmée, écartée ou nuancée, avec les verbatims qui le montrent." },
          { title: "Les frictions non anticipées", body: "Celles que personne n'avait vues en réunion, souvent les plus coûteuses." },
          { title: "Une priorisation par impact et effort", body: "Les corrections classées par impact estimé sur la conversion et par effort." },
          { title: "Des recommandations concrètes", body: "Prêtes à passer en ticket produit ou en A/B test." },
          { title: "Une restitution en visio", body: "Avec l'équipe produit, growth et design." },
        ],
      }}
      guarantees={{
        title: "Ce que vous pouvez exiger",
        items: [
          { title: "Aucune donnée réelle touchée", body: "Comptes créés pour la mission, ou parcours jusqu'à l'étape de paiement sans la finaliser. Moyen de paiement de test si vous le fournissez." },
          { title: "Des testeurs qui ressemblent à votre trafic", body: "Métier, taille d'entreprise, niveau digital, équipement : pris dans votre base réelle, pas dans un panel grand public." },
          { title: "Réponses refusées, non facturées", body: "Une réponse bâclée n'est ni payée au testeur, ni comptée dans votre rapport, ni facturée." },
          { title: "Complémentaire de l'A/B test", body: "Le test utilisateur trouve les frictions et formule les hypothèses. L'A/B test valide la correction sur le trafic réel." },
        ],
      }}
      faq={faq}
      faqTitle="Vos questions sur ce cas précis."
      related={[
        { href: "/blog/test-utilisateur-vs-ab-testing", label: "Test utilisateur ou A/B testing ?" },
        { href: "/blog/quand-faire-un-test-utilisateur", label: "Quand faire un test utilisateur ?" },
        { href: "/blog/combien-de-testeurs-test-utilisateur", label: "Combien de testeurs pour un test utilisateur ?" },
      ]}
    />
  );
}
