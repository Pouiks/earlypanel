/**
 * Glossaire des tests utilisateurs : definitions courtes, factuelles,
 * autoportantes (une phrase de definition, puis une precision). Rendu sur
 * /glossaire avec un DefinedTermSet JSON-LD, et repris dans /llms-full.txt.
 * Chaque definition doit pouvoir etre citee seule par un moteur generatif.
 */
export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
  /** Lien vers la page du site qui developpe le sujet, optionnel. */
  href?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "test-utilisateur",
    term: "Test utilisateur",
    definition:
      "Méthode qui consiste à faire réaliser des tâches précises sur un produit par des personnes représentatives de sa cible, pour observer où elles réussissent, hésitent ou échouent. Il mesure la compréhension et l'utilisabilité, pas la satisfaction déclarée.",
    href: "/entreprises",
  },
  {
    slug: "test-utilisateur-a-distance",
    term: "Test utilisateur à distance",
    definition:
      "Test utilisateur réalisé par chaque participant depuis son propre environnement, sur son propre appareil, sans se déplacer. Il peut être modéré (avec un animateur en visio) ou non modéré (le participant suit un scénario seul et répond par écrit).",
    href: "/blog/test-utilisateur-a-distance-methode",
  },
  {
    slug: "test-non-modere",
    term: "Test non modéré",
    definition:
      "Test utilisateur sans animateur : le participant réalise les scénarios seul, au moment qu'il choisit, et documente son parcours par écrit et par captures d'écran. Moins coûteux qu'un test modéré, il exige une relecture attentive des réponses.",
  },
  {
    slug: "test-modere",
    term: "Test modéré",
    definition:
      "Test utilisateur animé en direct par une personne qui observe le participant, le relance et pose des questions. Plus riche pour explorer un sujet complexe, plus coûteux et plus long à organiser qu'un test non modéré.",
  },
  {
    slug: "scenario",
    term: "Scénario de test",
    definition:
      "Mise en situation donnée au participant, formulée comme un objectif à atteindre et jamais comme une suite d'instructions. Un bon scénario décrit le contexte et la tâche, sans indiquer où cliquer.",
  },
  {
    slug: "critere-de-reussite",
    term: "Critère de réussite",
    definition:
      "Action observable qui permet de dire qu'un participant a atteint l'objectif d'un scénario, par exemple « le devis est envoyé ». Il rend le résultat mesurable : combien de participants ont réussi, où les autres se sont arrêtés.",
  },
  {
    slug: "friction",
    term: "Friction UX",
    definition:
      "Endroit d'un parcours où l'utilisateur hésite, se trompe, revient en arrière ou abandonne alors que le produit fonctionne techniquement. Une friction se distingue d'un bug : elle relève de la compréhension, pas du code.",
  },
  {
    slug: "bug",
    term: "Bug",
    definition:
      "Défaut technique objectif et reproductible : un bouton qui ne répond pas, une page qui plante, une donnée qui ne s'enregistre pas. Dans un rapport de test, les bugs sont listés séparément des frictions, car ils n'appellent pas les mêmes correctifs.",
  },
  {
    slug: "verbatim",
    term: "Verbatim",
    definition:
      "Citation exacte d'un participant, reproduite avec la question qui l'a provoquée. Les verbatims illustrent une friction dans les mots des utilisateurs et servent de preuve dans un rapport.",
  },
  {
    slug: "panel",
    term: "Panel de testeurs",
    definition:
      "Ensemble des personnes sélectionnées pour un test, décrites par leur métier, leur situation, leur aisance numérique et leur équipement. Un panel de huit à douze participants proches de la cible suffit à un test qualitatif.",
    href: "/blog/combien-de-testeurs-test-utilisateur",
  },
  {
    slug: "recrutement-a-la-main",
    term: "Recrutement à la main",
    definition:
      "Sélection des participants un par un, selon des critères vérifiables (métier, tâche vécue, équipement), par opposition au tirage automatique dans un panel grand public. C'est ce qui garantit que les testeurs ressemblent aux vrais utilisateurs.",
    href: "/blog/definir-sa-cible-test-utilisateur",
  },
  {
    slug: "nda",
    term: "NDA (accord de confidentialité)",
    definition:
      "Contrat par lequel un testeur s'engage à ne rien divulguer du produit qu'il teste. Chez earlypanel, chaque testeur le signe électroniquement avant tout accès, avec horodatage, empreinte du document et adresse IP conservés comme preuve.",
    href: "/securite",
  },
  {
    slug: "relecture-humaine",
    term: "Relecture humaine",
    definition:
      "Lecture de chaque réponse par une personne, pour écarter celles qui sont trop courtes, hors sujet ou copiées, avant qu'elles n'entrent dans l'analyse. Une réponse refusée n'est ni payée au testeur ni comptée dans le rapport.",
  },
  {
    slug: "rapport-de-test",
    term: "Rapport de test utilisateur",
    definition:
      "Document rédigé qui présente le verdict, les résultats par scénario, les bugs, les frictions priorisées avec verbatims et captures, et des recommandations classées par impact et effort. Il doit permettre de décider sans avoir suivi le test.",
  },
  {
    slug: "matrice-impact-effort",
    term: "Matrice impact / effort",
    definition:
      "Classement des recommandations selon l'impact attendu pour l'utilisateur et l'effort technique estimé. Les « quick wins » (impact fort, effort faible) sont traités en premier.",
  },
  {
    slug: "taux-de-completion",
    term: "Taux de complétion",
    definition:
      "Part des participants qui ont atteint le critère de réussite d'un scénario. Sur un panel de douze, « 9 sur 12 » est une observation qualitative, pas une mesure statistique de la base d'utilisateurs.",
  },
  {
    slug: "ab-testing",
    term: "A/B testing",
    definition:
      "Comparaison de deux versions d'une page ou d'un parcours sur du trafic réel, pour mesurer laquelle convertit le mieux. L'A/B test dit combien, le test utilisateur dit pourquoi ; ils se complètent.",
    href: "/blog/test-utilisateur-vs-ab-testing",
  },
  {
    slug: "prototype",
    term: "Prototype cliquable",
    definition:
      "Maquette interactive (Figma ou équivalent) qui permet de dérouler un parcours de bout en bout avant tout développement. Un test sur prototype valide la logique de navigation et la compréhension des libellés, pas la performance ni les données réelles.",
    href: "/test-maquette-figma",
  },
  {
    slug: "staging",
    term: "Staging (préproduction)",
    definition:
      "Environnement de test identique à la production, utilisé avant le lancement pour faire tester le produit réel par des utilisateurs extérieurs, avec des comptes de démonstration et sans données clients.",
    href: "/test-pre-lancement-staging",
  },
  {
    slug: "testeur-remunere",
    term: "Testeur rémunéré",
    definition:
      "Particulier qui réalise des tests utilisateurs contre rémunération, sélectionné selon son profil. La rémunération dépend de la mission, de la rareté du profil et de la qualité des réponses ; c'est un complément de revenu, pas un emploi.",
    href: "/testeurs",
  },
];
