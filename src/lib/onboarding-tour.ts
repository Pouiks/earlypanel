/**
 * Logique du tour guide testeur (onboarding produit).
 *
 * Decoupe la decision "should we trigger?" en pure fonction pour que les
 * tests unitaires puissent la verifier sans monter un DOM ni mocker driver.js.
 *
 * Source de verite des conditions :
 *   - Profil complet (sinon le testeur n'a pas encore acces au dashboard)
 *   - Tour ni complete ni skippe
 *   - Pas en mode mobile (la sidebar n'est pas visible, les cibles non plus)
 *
 * Le bouton "?" dans la sidebar ne passe PAS par cette fonction : il relance
 * le tour manuellement, peu importe l'etat des flags.
 */

export interface TesterTourState {
  profile_completed: boolean;
  onboarding_tour_completed_at: string | null;
  onboarding_tour_skipped_at: string | null;
}

export interface TourTriggerEnvironment {
  /** Largeur viewport en px. < 768 = mobile, on skip. */
  viewportWidth: number;
}

/**
 * Decide si le tour doit se lancer automatiquement a l'arrivee sur le
 * dashboard. Pure function : aucun side effect, deterministe.
 *
 * - Retourne `false` si :
 *   - le profil n'est pas complete (le testeur n'a pas encore acces complet)
 *   - le tour a deja ete complete
 *   - le tour a deja ete skippe (l'utilisateur peut le rejouer via "?")
 *   - viewport < 768px (sidebar cachee, cibles invisibles)
 * - Retourne `true` sinon.
 */
export function shouldAutoTriggerTour(
  tester: TesterTourState,
  env: TourTriggerEnvironment,
): boolean {
  if (!tester.profile_completed) return false;
  if (tester.onboarding_tour_completed_at) return false;
  if (tester.onboarding_tour_skipped_at) return false;
  if (env.viewportWidth < 768) return false;
  return true;
}

/**
 * Definition des 8 etapes du tour. Chaque etape cible un selecteur DOM
 * (data-tour="<id>") pose dans Sidebar.tsx ou autres composants.
 *
 * `popoverPosition` est un hint pour driver.js : ou ancrer le tooltip par
 * rapport a l'element. Driver gere les fallbacks si pas de place.
 */
export interface TourStep {
  /** Selecteur CSS de l'element a mettre en spotlight. `null` = modal centree. */
  element: string | null;
  title: string;
  description: string;
  /** Position preferee du tooltip (driver.js gere les fallbacks). */
  side?: "top" | "right" | "bottom" | "left" | "over";
  align?: "start" | "center" | "end";
}

export const TESTER_TOUR_STEPS: TourStep[] = [
  {
    element: null,
    title: "Bienvenue sur earlypanel",
    description:
      "On vous présente votre espace en 30 secondes. Vous pourrez relancer ce tour à tout moment via le bouton « ? » en haut de la barre latérale.",
  },
  {
    element: '[data-tour="help-button"]',
    title: "Cette aide reste accessible",
    description:
      "Cliquez sur ce « ? » quand vous voulez pour relancer ce tour. Pas besoin de tout retenir maintenant — vous reviendrez ici si vous oubliez.",
    side: "right",
    align: "start",
  },
  {
    element: '[data-tour="nav-dashboard"]',
    title: "Votre tableau de bord",
    description:
      "Vue d'ensemble : missions en cours, prochains paiements, statut de votre profil. C'est votre point de départ à chaque connexion.",
    side: "right",
    align: "center",
  },
  {
    element: '[data-tour="nav-missions"]',
    title: "Vos invitations arrivent ici",
    description:
      "Quand un projet correspond à votre profil, vous recevez un email et une notification ici. La pastille verte indique combien de missions attendent votre action. Vous acceptez ou refusez librement.",
    side: "right",
    align: "center",
  },
  {
    element: '[data-tour="nav-gains"]',
    title: "Suivi de vos paiements",
    description:
      "Total gagné, paiements à venir et historique. Les virements arrivent généralement sous 72 h après validation de votre test, sur l'IBAN que vous avez renseigné.",
    side: "right",
    align: "center",
  },
  {
    element: '[data-tour="nav-profil"]',
    title: "Plus votre profil est précis, plus vos missions sont pertinentes",
    description:
      "Métier, secteur, équipement, centres d'intérêt : chaque info nous aide à vous proposer les missions qui vous correspondent vraiment, plutôt que des invitations à côté. C'est aussi ce qui débloque les missions les mieux rémunérées (profils experts ou rares : 50–100 €). Aucune donnée n'est partagée à des tiers.",
    side: "right",
    align: "center",
  },
  {
    element: '[data-tour="nav-documents"]',
    title: "Vos accords contractuels",
    description:
      "Quand vous êtes assigné à un projet, l'accord de confidentialité (NDA) signé apparaît ici. Vous pouvez le télécharger ou le consulter à tout moment.",
    side: "right",
    align: "center",
  },
  {
    element: null,
    title: "C'est tout !",
    description:
      "Vous êtes prêt. Votre première invitation arrivera par email dès qu'un projet correspond à votre profil. À très vite.",
  },
];
