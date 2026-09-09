import type { Metadata } from "next";
import SectorLanding from "@/components/b2b/SectorLanding";

export const metadata: Metadata = {
  title: "Test utilisateur healthtech avec médecins et soignants",
  description:
    "Faites tester votre app santé ou logiciel métier par des médecins, infirmiers, pharmaciens ou patients chroniques. Panel français, NDA, rapport en 5 jours.",
  alternates: { canonical: "/test-utilisateur-sante" },
  openGraph: {
    title: "Test utilisateur santé et healthtech · earlypanel",
    description: "Des soignants et des patients qui connaissent la réalité d'un cabinet. NDA, rapport UX rédigé en 5 jours.",
    url: "/test-utilisateur-sante",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "earlypanel · Tests utilisateurs livrés en 5 jours", type: "image/png" }],
  },
};

const faq = [
  {
    q: "Qui teste une application santé avec earlypanel ?",
    a: "Selon votre produit : médecins généralistes ou spécialistes, infirmiers libéraux ou hospitaliers, kinésithérapeutes, pharmaciens, secrétaires médicales, et, pour un parcours patient, des patients concernés par la pathologie ou la situation visée. On les sélectionne à la main dans notre panel et par recrutement ciblé pour votre mission. Chacun signe un NDA avant tout accès.",
  },
  {
    q: "Peut-on tester sans données de santé réelles ?",
    a: "C'est la règle. Le test se fait sur un environnement de démonstration avec des dossiers fictifs que vous préparez ou que nous construisons avec vous. Aucune donnée patient réelle n'est utilisée, aucun testeur n'accède à votre production. Les captures d'écran des testeurs sont stockées dans un espace privé, jamais transmises hors du rapport.",
  },
  {
    q: "Combien de temps pour recruter des professionnels de santé ?",
    a: "Les soignants ont peu de temps, et on ne le leur fait pas perdre : les scénarios sont courts et se font à distance, au moment qu'ils choisissent. Le délai standard reste de cinq jours ouvrés entre le lancement et la restitution. Pour une spécialité rare, on annonce le délai de recrutement au cadrage, avant engagement.",
  },
  {
    q: "Quels parcours santé se testent le mieux à distance ?",
    a: "La prise de rendez-vous, l'inscription et la vérification d'identité, la consultation d'un dossier, la saisie d'un acte ou d'une ordonnance, le suivi d'un patient chronique, la téléconsultation côté patient. Tout parcours où le contexte métier (urgence, interruptions, matériel du cabinet) change la façon d'utiliser l'outil.",
  },
  {
    q: "Le test remplace-t-il une évaluation réglementaire ?",
    a: "Non. Un test utilisateur earlypanel mesure la compréhension et l'utilisabilité d'un parcours avec de vrais utilisateurs. Il ne constitue ni une évaluation clinique, ni une validation au sens de la réglementation des dispositifs médicaux, ni un audit de conformité. Il alimente ces démarches, il ne s'y substitue pas.",
  },
];

export default function TestUtilisateurSantePage() {
  return (
    <SectorLanding
      path="/test-utilisateur-sante"
      breadcrumbName="Test utilisateur santé"
      badge="Santé · Healthtech · Logiciels de cabinet et parcours patient"
      h1={<>Test utilisateur santé : des soignants et des patients qui connaissent <em>la réalité d&apos;un cabinet</em>.</>}
      sub="Un test utilisateur application santé demande des testeurs qui vivent le contexte : une consultation qui déborde, un patient qui attend, un logiciel qu'on utilise entre deux actes. On recrute des professionnels de santé et des patients à la main, sans aucune donnée réelle, et vous recevez un rapport UX rédigé."
      profiles={{
        eyebrow: "Qui teste votre application santé",
        title: "Des soignants et des patients, sélectionnés un par un.",
        sub: "Selon la spécialité, le mode d'exercice et le rôle dans le parcours. Des gens qui savent ce qu'est une salle d'attente pleine, pas un panel grand public.",
        cards: [
          { title: "Médecins généralistes et spécialistes", desc: "Cabinet, maison de santé ou hôpital : des praticiens qui utilisent déjà un logiciel métier et jugent une interface en fonction du temps qu'elle leur coûte.", example: "Consultation · Prescription" },
          { title: "Infirmiers et kinésithérapeutes", desc: "Libéraux en tournée ou en cabinet, souvent sur mobile, entre deux patients, avec une connexion moyenne.", example: "Tournée · Mobile · Planning" },
          { title: "Pharmaciens et secrétaires médicales", desc: "Les utilisateurs intensifs du quotidien : prise de rendez-vous, dossiers, ordonnances, relances. Ils voient tout de suite ce qui fait perdre une minute.", example: "Accueil · Dossier · Rendez-vous" },
          { title: "Patients chroniques et aidants", desc: "Pour un parcours patient : des personnes concernées par la pathologie ou la situation, avec leur niveau d'aisance réel.", example: "Suivi · Téléconsultation" },
          { title: "Personnel hospitalier", desc: "Cadres de santé, internes, agents administratifs : des rôles multiples sur un même outil, à tester séparément.", example: "Service · Admission" },
          { title: "Sur leur propre équipement", desc: "Le poste du cabinet, le téléphone de tournée, la tablette du service. Le contexte réel, pas un poste de démonstration.", example: "Cabinet · Mobile · Tablette" },
        ],
      }}
      parcours={{
        eyebrow: "Ce qu'on teste sur un produit santé",
        title: "Les parcours où le contexte de soin change tout.",
        sub: "Deux à quatre scénarios cadrés ensemble, ancrés dans la pratique réelle, chacun avec un critère de réussite observable.",
        cards: [
          { title: "Prise de rendez-vous et inscription", desc: "Côté patient et côté cabinet : créer un compte, vérifier une identité, réserver, décaler, annuler.", example: "Agenda · Identité · Rappels" },
          { title: "Dossier et saisie d'actes", desc: "Retrouver une information, saisir un acte, une ordonnance, un compte rendu, en quelques secondes et sans erreur.", example: "Dossier · Ordonnance · Facturation" },
          { title: "Suivi de patient chronique", desc: "Saisie de mesures, alertes, messagerie : des parcours qui doivent tenir sur la durée et sur mobile.", example: "Mesures · Alertes · Messagerie" },
          { title: "Téléconsultation", desc: "Le parcours patient de bout en bout, de l'invitation à la fin de la consultation, sur son propre appareil.", example: "Visio · Documents · Paiement" },
          { title: "Logiciel de cabinet ou de service", desc: "Onboarding d'un nouvel outil, migration depuis l'ancien, prise en main par une équipe entière.", example: "Onboarding · Migration" },
          { title: "Maquette ou préversion", desc: "Le même test se fait avant le code, sur un prototype Figma, ou avant le lancement, sur votre environnement de démonstration.", example: "Figma · Démo" },
        ],
      }}
      steps={{
        eyebrow: "Déroulé d'un test utilisateur santé",
        title: "Du cadrage au rapport, en trois étapes.",
        sub: "Même déroulé que toutes nos missions, avec un cadrage renforcé des accès et des données.",
        items: [
          { title: "Cadrage des profils et des données", body: "Une heure de visio pour définir les profils (spécialité, mode d'exercice, rôle dans le parcours), les scénarios et l'environnement de test : dossiers fictifs, comptes de démonstration. NDA signé avant tout échange, aucune donnée patient réelle.", pill: "1h de visio · NDA" },
          { title: "Recrutement et scénarios en situation", body: "On sélectionne huit à douze soignants ou patients correspondant à votre cible, on écrit avec vous des scénarios ancrés dans leur pratique (« un patient appelle pour décaler son rendez-vous pendant une consultation »), et ils les exécutent seuls, à distance, au moment qu'ils choisissent.", pill: "Sélection manuelle" },
          { title: "Relecture et rapport", body: "Chaque réponse est relue par un humain, les réponses bâclées sont refusées et non comptabilisées. Vous recevez un rapport rédigé : résultats par scénario, frictions priorisées, verbatims, captures d'écran, puis une restitution en visio.", pill: "Rapport sous 5 jours ouvrés" },
        ],
      }}
      deliverable={{
        title: "Un rapport lisible par l'équipe produit et présentable à un comité médical.",
        items: [
          { title: "Le panel par spécialité", body: "Spécialité, mode d'exercice, équipement. Anonymisé : le client voit T01, T02, jamais un nom." },
          { title: "Les résultats par scénario", body: "Combien ont atteint l'objectif, où les autres se sont arrêtés, et les réponses fermées agrégées." },
          { title: "Les frictions liées au contexte de soin", body: "Distinguées des bugs, priorisées, avec captures d'écran quand elles existent." },
          { title: "Des verbatims en langage de soignant", body: "Chaque citation est rattachée à la question qui l'a provoquée." },
          { title: "Des recommandations arbitrables", body: "Classées par impact et effort technique, présentées en visio pour décider." },
        ],
      }}
      guarantees={{
        title: "Ce que vous pouvez exiger",
        items: [
          { title: "Aucune donnée patient réelle", body: "Environnement de démonstration, dossiers fictifs, aucun accès à votre production." },
          { title: "Accès distribués sous NDA, puis révoqués", body: "Seuls les testeurs retenus reçoivent un accès, après signature. Vous coupez les accès à la fin." },
          { title: "Captures d'écran dans un espace privé", body: "Stockées en Europe, dans un espace privé sans URL publique, jamais transmises hors du rapport." },
          { title: "Pas une évaluation réglementaire", body: "Le test mesure l'utilisabilité. Il alimente vos démarches réglementaires, il ne s'y substitue pas." },
        ],
      }}
      faq={faq}
      related={[
        { href: "/securite", label: "Sécurité et protection des données" },
        { href: "/blog/definir-sa-cible-test-utilisateur", label: "Définir la cible d'un test utilisateur" },
        { href: "/blog/recette-application-mobile", label: "Réussir la recette d'une application mobile" },
      ]}
    />
  );
}
