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
  /**
   * Formes sous lesquelles le terme apparait dans les textes du site, pour
   * l'infobulle automatique (src/lib/glossary-inline.ts). Pluriel en « s »
   * tolere sur chaque mot, casse ignoree. Sans alias, le terme n'est jamais
   * annote dans les textes (il reste sur /glossaire).
   */
  aliases?: string[];
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
    aliases: ["test non modéré", "non modéré"],
    term: "Test non modéré",
    definition:
      "Test utilisateur sans animateur : le participant réalise les scénarios seul, au moment qu'il choisit, et documente son parcours par écrit et par captures d'écran. Moins coûteux qu'un test modéré, il exige une relecture attentive des réponses.",
  },
  {
    slug: "test-modere",
    aliases: ["test modéré"],
    term: "Test modéré",
    definition:
      "Test utilisateur animé en direct par une personne qui observe le participant, le relance et pose des questions. Plus riche pour explorer un sujet complexe, plus coûteux et plus long à organiser qu'un test non modéré.",
  },
  {
    slug: "scenario",
    aliases: ["scénario de test", "scénario"],
    term: "Scénario de test",
    definition:
      "Mise en situation donnée au participant, formulée comme un objectif à atteindre et jamais comme une suite d'instructions. Un bon scénario décrit le contexte et la tâche, sans indiquer où cliquer.",
  },
  {
    slug: "critere-de-reussite",
    aliases: ["critère de réussite"],
    term: "Critère de réussite",
    definition:
      "Action observable qui permet de dire qu'un participant a atteint l'objectif d'un scénario, par exemple « le devis est envoyé ». Il rend le résultat mesurable : combien de participants ont réussi, où les autres se sont arrêtés.",
  },
  {
    slug: "friction",
    aliases: ["friction UX", "friction d'expérience utilisateur", "friction"],
    term: "Friction UX",
    definition:
      "Endroit d'un parcours où l'utilisateur hésite, se trompe, revient en arrière ou abandonne alors que le produit fonctionne techniquement. Une friction se distingue d'un bug : elle relève de la compréhension, pas du code.",
  },
  {
    slug: "bug",
    aliases: ["bug"],
    term: "Bug",
    definition:
      "Défaut technique objectif et reproductible : un bouton qui ne répond pas, une page qui plante, une donnée qui ne s'enregistre pas. Dans un rapport de test, les bugs sont listés séparément des frictions, car ils n'appellent pas les mêmes correctifs.",
  },
  {
    slug: "verbatim",
    aliases: ["verbatim"],
    term: "Verbatim",
    definition:
      "Citation exacte d'un participant, reproduite avec la question qui l'a provoquée. Les verbatims illustrent une friction dans les mots des utilisateurs et servent de preuve dans un rapport.",
  },
  {
    slug: "panel",
    aliases: ["panel de testeurs", "panel qualifié", "panel humain", "panel"],
    term: "Panel de testeurs",
    definition:
      "Ensemble des personnes sélectionnées pour un test, décrites par leur métier, leur situation, leur aisance numérique et leur équipement. Un panel de huit à douze participants proches de la cible suffit à un test qualitatif.",
    href: "/blog/combien-de-testeurs-test-utilisateur",
  },
  {
    slug: "recrutement-a-la-main",
    aliases: ["recrutement à la main", "recruté à la main", "sélectionné à la main", "recrute les testeurs à la main"],
    term: "Recrutement à la main",
    definition:
      "Sélection des participants un par un, selon des critères vérifiables (métier, tâche vécue, équipement), par opposition au tirage automatique dans un panel grand public. C'est ce qui garantit que les testeurs ressemblent aux vrais utilisateurs.",
    href: "/blog/definir-sa-cible-test-utilisateur",
  },
  {
    slug: "nda",
    aliases: ["NDA", "accord de confidentialité"],
    term: "NDA (accord de confidentialité)",
    definition:
      "Contrat par lequel un testeur s'engage à ne rien divulguer du produit qu'il teste. Chez earlypanel, chaque testeur le signe électroniquement avant tout accès, avec horodatage, empreinte du document et adresse IP conservés comme preuve.",
    href: "/securite",
  },
  {
    slug: "relecture-humaine",
    aliases: ["relecture humaine", "relue par un humain", "relecture"],
    term: "Relecture humaine",
    definition:
      "Lecture de chaque réponse par une personne, pour écarter celles qui sont trop courtes, hors sujet ou copiées, avant qu'elles n'entrent dans l'analyse. Une réponse refusée n'est ni payée au testeur ni comptée dans le rapport.",
  },
  {
    slug: "rapport-de-test",
    aliases: ["rapport de test utilisateur", "rapport de test", "rapport UX", "rapport d'expérience utilisateur"],
    term: "Rapport de test utilisateur",
    definition:
      "Document rédigé qui présente le verdict, les résultats par scénario, les bugs, les frictions priorisées avec verbatims et captures, et des recommandations classées par impact et effort. Il doit permettre de décider sans avoir suivi le test.",
  },
  {
    slug: "matrice-impact-effort",
    aliases: ["matrice impact / effort", "matrice impact/effort"],
    term: "Matrice impact / effort",
    definition:
      "Classement des recommandations selon l'impact attendu pour l'utilisateur et l'effort technique estimé. Les « quick wins » (impact fort, effort faible) sont traités en premier.",
  },
  {
    slug: "taux-de-completion",
    aliases: ["taux de complétion", "taux de réussite"],
    term: "Taux de complétion",
    definition:
      "Part des participants qui ont atteint le critère de réussite d'un scénario. Sur un panel de douze, « 9 sur 12 » est une observation qualitative, pas une mesure statistique de la base d'utilisateurs.",
  },
  {
    slug: "ab-testing",
    aliases: ["A/B testing", "A/B test", "test A/B", "AB testing"],
    term: "A/B testing",
    definition:
      "Comparaison de deux versions d'une page ou d'un parcours sur du trafic réel, pour mesurer laquelle convertit le mieux. L'A/B test dit combien, le test utilisateur dit pourquoi ; ils se complètent.",
    href: "/blog/test-utilisateur-vs-ab-testing",
  },
  {
    slug: "prototype",
    aliases: ["prototype cliquable", "prototype"],
    term: "Prototype cliquable",
    definition:
      "Maquette interactive (Figma ou équivalent) qui permet de dérouler un parcours de bout en bout avant tout développement. Un test sur prototype valide la logique de navigation et la compréhension des libellés, pas la performance ni les données réelles.",
    href: "/test-maquette-figma",
  },
  {
    slug: "staging",
    aliases: ["staging", "préproduction", "pré-production", "pré-prod", "preprod"],
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
  {
    slug: "maquette",
    aliases: ["maquette Figma", "maquette"],
    term: "Maquette d'interface",
    definition:
      "Représentation visuelle des écrans d'un produit, dessinée avant tout développement, le plus souvent dans un logiciel comme Figma. Une maquette statique se regarde ; reliée par des liens entre écrans, elle devient un prototype cliquable que l'on peut faire tester.",
    href: "/test-maquette-figma",
  },
  {
    slug: "figma",
    aliases: ["Figma"],
    term: "Figma",
    definition:
      "Logiciel de conception d'interfaces en ligne, utilisé par la plupart des équipes produit pour dessiner maquettes et prototypes. Un prototype Figma se partage par un simple lien, ce qui permet de le faire tester avant d'écrire une ligne de code.",
    href: "/test-maquette-figma",
  },
  {
    slug: "wireframe",
    aliases: ["wireframe"],
    term: "Wireframe",
    definition:
      "Schéma d'un écran réduit à sa structure : blocs, textes, boutons, sans couleurs ni images. Il sert à valider l'organisation d'une page avant la maquette détaillée.",
  },
  {
    slug: "parcours-utilisateur",
    aliases: ["parcours utilisateur", "user journey"],
    term: "Parcours utilisateur",
    definition:
      "Enchaînement des écrans et des actions qu'une personne traverse pour atteindre un objectif : s'inscrire, réserver, payer. Un test utilisateur porte sur un ou plusieurs parcours précis, jamais sur « le produit » en général.",
  },
  {
    slug: "onboarding",
    aliases: ["onboarding"],
    term: "Onboarding",
    definition:
      "Premiers écrans et premières actions qu'un nouvel utilisateur traverse après son inscription, jusqu'à ce qu'il obtienne une première valeur du produit. C'est le parcours où l'abandon est le plus fréquent, et le premier que l'on teste.",
  },
  {
    slug: "funnel",
    aliases: ["funnel de conversion", "funnel", "tunnel de conversion", "tunnel d'achat", "tunnel de paiement"],
    term: "Funnel (tunnel de conversion)",
    definition:
      "Suite d'étapes qui mène un visiteur à une action attendue : inscription, réservation, achat. À chaque étape une partie des visiteurs abandonne ; les analytics montrent à quelle étape, le test utilisateur montre pourquoi.",
    href: "/test-conversion-funnel",
  },
  {
    slug: "taux-de-conversion",
    aliases: ["taux de conversion"],
    term: "Taux de conversion",
    definition:
      "Part des visiteurs qui accomplissent l'action attendue sur une page ou un parcours, par exemple trois inscriptions pour cent visiteurs. Il se mesure avec des outils d'analytics ; un test utilisateur sert à comprendre ce qui le fait baisser.",
  },
  {
    slug: "checkout",
    aliases: ["checkout"],
    term: "Checkout",
    definition:
      "Étape de paiement d'un site ou d'une application, du panier jusqu'à la confirmation de commande. C'est l'endroit où une hésitation coûte le plus cher, et l'un des parcours les plus testés.",
  },
  {
    slug: "landing-page",
    aliases: ["landing page", "page d'atterrissage"],
    term: "Landing page",
    definition:
      "Page conçue pour une seule action, sur laquelle arrive un visiteur venu d'une publicité ou d'un résultat de recherche. On la teste pour vérifier que l'offre est comprise en quelques secondes.",
  },
  {
    slug: "saas",
    aliases: ["SaaS"],
    term: "SaaS",
    definition:
      "Logiciel accessible en ligne, par abonnement, sans installation (de l'anglais software as a service). Un outil de facturation, un CRM ou un logiciel de planning utilisés dans le navigateur sont des SaaS.",
    href: "/test-utilisateur-saas-b2b",
  },
  {
    slug: "b2b-b2c",
    aliases: ["B2B", "B2C"],
    term: "B2B / B2C",
    definition:
      "B2B désigne un produit vendu à des entreprises et utilisé dans un cadre professionnel ; B2C un produit destiné au grand public. La distinction compte pour le recrutement : un produit B2B se teste avec des personnes qui exercent le métier visé.",
  },
  {
    slug: "ux",
    aliases: ["UX", "expérience utilisateur"],
    term: "UX (expérience utilisateur)",
    definition:
      "Ce que vit une personne en utilisant un produit : ce qu'elle comprend, ce qu'elle réussit, ce qui la freine. L'UX se distingue de l'UI, l'interface visible ; un écran peut être beau et incompréhensible.",
  },
  {
    slug: "ui",
    aliases: ["UI", "interface utilisateur"],
    term: "UI (interface utilisateur)",
    definition:
      "Partie visible d'un produit : écrans, boutons, textes, couleurs. L'UI est ce que l'on dessine ; l'UX est ce que l'utilisateur en fait.",
  },
  {
    slug: "utilisabilite",
    aliases: ["utilisabilité", "usabilité", "ergonomie"],
    term: "Utilisabilité",
    definition:
      "Facilité avec laquelle une personne atteint son objectif avec un produit : efficacité, rapidité, absence d'erreurs. C'est ce qu'un test utilisateur mesure, à la différence de la satisfaction, qui est un ressenti déclaré.",
  },
  {
    slug: "recette",
    aliases: ["recette technique", "recette fonctionnelle", "recette", "QA"],
    term: "Recette (technique)",
    definition:
      "Vérification par l'équipe, avant publication, que le produit fait ce qui a été spécifié : chaque écran s'affiche, chaque action fonctionne, rien ne plante. Elle produit des bugs ; le test utilisateur, qui vient après, produit des frictions.",
    href: "/blog/recette-application-mobile",
  },
  {
    slug: "persona",
    aliases: ["persona"],
    term: "Persona",
    definition:
      "Portrait type d'un utilisateur, avec son métier, ses objectifs et ses habitudes, utilisé pour concevoir et vendre un produit. Un persona ne suffit pas à recruter des testeurs : il faut le traduire en critères vérifiables, comme la tâche réellement vécue et l'équipement.",
    href: "/blog/definir-sa-cible-test-utilisateur",
  },
  {
    slug: "brief",
    aliases: ["brief"],
    term: "Brief",
    definition:
      "Description de départ d'un test : la décision à éclairer, le produit ou la partie à tester, la cible, le calendrier. Un brief flou donne un test inutile ; c'est pour cela qu'il se construit en atelier avant tout lancement.",
  },
  {
    slug: "livrable",
    aliases: ["livrable"],
    term: "Livrable",
    definition:
      "Ce que le client reçoit à la fin d'une mission. Pour un test utilisateur chez earlypanel : un rapport rédigé, les verbatims et captures qui l'appuient, et une restitution en visio.",
  },
  {
    slug: "quick-win",
    aliases: ["quick win"],
    term: "Quick win",
    definition:
      "Recommandation à fort impact pour l'utilisateur et à faible effort technique, par exemple renommer un bouton. Dans un rapport de test, les quick wins sont classés en premier parce qu'ils se corrigent dans la semaine.",
  },
  {
    slug: "analytics",
    aliases: ["analytics", "Google Analytics"],
    term: "Analytics",
    definition:
      "Données de mesure de l'usage d'un site ou d'une application : visites, pages vues, étapes abandonnées, appareils utilisés. Les analytics disent où les utilisateurs décrochent, jamais pourquoi ; c'est la limite qu'un test utilisateur comble.",
  },
  {
    slug: "kpi",
    aliases: ["KPI", "indicateur clé"],
    term: "KPI (indicateur clé)",
    definition:
      "Indicateur chiffré suivi pour piloter un produit : taux de conversion, taux d'activation, temps pour accomplir une tâche. Un test utilisateur n'est pas un KPI ; il explique pourquoi un KPI bouge.",
  },
  {
    slug: "roi",
    aliases: ["ROI", "retour sur investissement"],
    term: "ROI (retour sur investissement)",
    definition:
      "Rapport entre ce qu'une action rapporte et ce qu'elle coûte. Pour un test utilisateur, il se calcule par ce qu'on évite : développer une fonctionnalité incomprise, ou corriger après la mise en production ce qui aurait coûté dix fois moins avant.",
  },
  {
    slug: "roadmap",
    aliases: ["roadmap", "feuille de route"],
    term: "Roadmap",
    definition:
      "Liste ordonnée de ce qu'une équipe produit prévoit de construire dans les mois à venir. Les résultats d'un test utilisateur servent à la réordonner : corriger ce qui bloque avant d'ajouter des fonctionnalités.",
  },
  {
    slug: "sprint",
    aliases: ["sprint"],
    term: "Sprint",
    definition:
      "Cycle de développement court, d'une à trois semaines, à la fin duquel l'équipe livre une version utilisable du produit. Un test utilisateur s'insère entre deux sprints : ses résultats alimentent le suivant.",
  },
  {
    slug: "mvp",
    aliases: ["MVP", "produit minimum viable"],
    term: "MVP (produit minimum viable)",
    definition:
      "Version la plus réduite d'un produit qui permet de vérifier qu'il répond à un besoin réel (de l'anglais minimum viable product). Le tester avec des utilisateurs avant de l'étendre évite de construire sur une base incomprise.",
  },
  {
    slug: "beta",
    aliases: ["bêta-test", "bêta", "beta"],
    term: "Bêta (version)",
    definition:
      "Version d'un produit diffusée à un groupe restreint avant sa sortie publique, pour trouver ce qui ne va pas en conditions réelles. Un bêta-test recueille des retours spontanés ; un test utilisateur observe des tâches précises.",
  },
  {
    slug: "testflight",
    aliases: ["TestFlight"],
    term: "TestFlight",
    definition:
      "Outil d'Apple pour distribuer une application iOS à des testeurs avant sa publication sur l'App Store, par simple invitation. Son équivalent Android est le test interne du Play Store ou un fichier APK.",
  },
  {
    slug: "rgpd",
    aliases: ["RGPD"],
    term: "RGPD",
    definition:
      "Règlement général sur la protection des données, le texte européen qui encadre la collecte et la conservation des données personnelles. Il impose notamment de ne garder les données d'un testeur que le temps nécessaire et de lui permettre de les supprimer.",
    href: "/securite",
  },
  {
    slug: "mission",
    aliases: ["mission de test", "mission"],
    term: "Mission de test",
    definition:
      "Test confié à un testeur : un produit à découvrir, des scénarios à réaliser sur son propre appareil, des questions auxquelles répondre par écrit, dans un délai donné. Une mission prend de quinze à quarante minutes et est payée une fois validée après relecture.",
    href: "/testeurs",
  },
  {
    slug: "iban",
    aliases: ["IBAN"],
    term: "IBAN",
    definition:
      "Identifiant international d'un compte bancaire, indiqué sur un relevé d'identité bancaire. Chez earlypanel, il sert à payer un testeur par virement ; il est chiffré, et une mission ne peut pas démarrer tant qu'il manque.",
    href: "/securite",
  },
  {
    slug: "score-de-qualite",
    aliases: ["score de qualité"],
    term: "Score de qualité",
    definition:
      "Note attribuée à chaque testeur à partir de la relecture de ses missions. Un score élevé fait sélectionner le testeur en priorité et mieux rémunérer ses missions ; un score trop bas met le compte en pause.",
    href: "/testeurs/guides/bien-repondre-test-utilisateur",
  },
];
