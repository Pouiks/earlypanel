import type { Metadata } from "next";
import SituationLanding from "@/components/b2b/SituationLanding";

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
    <SituationLanding
      path="/test-utilisateur-sante"
      breadcrumbName="Test utilisateur santé"
      eyebrow="Santé · Healthtech · Logiciels de cabinet et parcours patient"
      h1={<>Test utilisateur santé : des soignants et des patients qui connaissent <em>la réalité d&apos;un cabinet</em>.</>}
      lede="Un test utilisateur application santé demande des testeurs qui vivent le contexte : une consultation qui déborde, un patient qui attend, un logiciel qu'on utilise entre deux actes. Médecins, infirmiers, pharmaciens, patients chroniques : on recrute les bons profils, à la main, pour tester votre application ou votre logiciel métier avec des professionnels de santé."
      problem={{
        title: "Le problème quand on veut tester une app avec des professionnels de santé.",
        paragraphs: [
          "Les soignants sont difficiles à recruter, ont peu de temps et n'accepteront pas un test d'une heure devant une caméra. Résultat : les produits santé sont testés par des collègues, des proches ou des panels grand public, et personne ne voit qu'un écran parfaitement clair au bureau est inutilisable entre deux patients.",
          "Le contexte réglementaire ajoute une contrainte : aucune donnée patient réelle ne peut circuler, et tout accès doit être encadré. Beaucoup d'équipes renoncent au test plutôt que de gérer ces questions.",
          "On les gère pour vous. Des soignants et des patients sélectionnés selon la spécialité, le mode d'exercice et l'équipement, un NDA signé avant tout accès, un environnement de démonstration sans donnée réelle, et des scénarios courts qu'ils font à distance, au moment qu'ils choisissent.",
        ],
      }}
      method={{
        title: "Comment on teste un produit santé.",
        intro: "Même déroulé que toutes nos missions, avec un cadrage renforcé des accès et des données.",
        steps: [
          { title: "Cadrage des profils et des données", body: "Une heure de visio pour définir les profils (spécialité, mode d'exercice, rôle dans le parcours), les scénarios et l'environnement de test : dossiers fictifs, comptes de démonstration. NDA signé avant tout échange, aucune donnée patient réelle." },
          { title: "Recrutement et scénarios en situation", body: "On sélectionne huit à douze soignants ou patients correspondant à votre cible, on écrit avec vous des scénarios ancrés dans leur pratique (« un patient appelle pour décaler son rendez-vous pendant une consultation »), et ils les exécutent seuls, à distance." },
          { title: "Relecture et rapport", body: "Chaque réponse est relue par un humain, les réponses bâclées sont refusées et non comptabilisées. Vous recevez un rapport rédigé : résultats par scénario, frictions priorisées, verbatims, captures d'écran, puis une restitution en visio." },
        ],
      }}
      deliverable={{
        title: "Ce que vous recevez.",
        intro: "Un livrable utilisable par l'équipe produit et présentable à un comité médical.",
        bullets: [
          "Un panel décrit par spécialité, mode d'exercice et équipement, anonymisé.",
          "Les résultats par scénario : qui a atteint l'objectif, où les autres se sont arrêtés.",
          "Les frictions liées au contexte de soin, distinguées des bugs, avec captures d'écran.",
          "Les verbatims rattachés à la question posée, en langage de soignant.",
          "Des recommandations priorisées par impact et effort, et une restitution en visio.",
        ],
      }}
      faq={faq}
      ctaTitle="Vous voulez savoir ce qu'un médecin fait vraiment de votre application ?"
    />
  );
}
