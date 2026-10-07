"use client";

import { useEffect, useRef } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TESTER_TOUR_STEPS } from "@/lib/onboarding-tour";

interface OnboardingTourProps {
  /**
   * Si true, lance le tour des le mount. Le parent decide via
   * shouldAutoTriggerTour() ou sur clic du bouton "?".
   */
  autoStart: boolean;
  /**
   * Cle qui change a chaque fois que le parent veut RELANCER le tour
   * (typiquement un compteur incremente au clic du bouton "?"). Permet
   * de re-trigger sans demonter le composant.
   */
  triggerKey: number;
  /** Callback quand l'utilisateur clique "Commencer" sur la derniere etape. */
  onComplete: () => void;
  /** Callback quand l'utilisateur clique "Passer" pendant le tour. */
  onSkip: () => void;
}

/**
 * Tour guide testeur : spotlight + tooltips ancres aux items de la sidebar.
 * Construit sur driver.js (lib MIT, ~10KB) avec un theme aligne earlypanel.
 *
 * Le composant est monte en permanence dans le layout dashboard, mais
 * driver.js n'affiche rien tant qu'on n'appelle pas .drive(). Cout DOM nul
 * quand le tour est inactif.
 */
export default function OnboardingTour({
  autoStart,
  triggerKey,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const driverRef = useRef<Driver | null>(null);
  const finishedRef = useRef<"completed" | "skipped" | "unmounted" | null>(null);

  // Callbacks lus via des refs : le parent les recree a chaque rendu. S'ils
  // etaient des dependances de l'effet d'init, chaque re-rendu du layout
  // (polling des notifications toutes les 30 s, toast, rechargement du
  // testeur) detruirait le driver : un tour ouvert se fermait tout seul et
  // etait enregistre comme « passe » sans action de l'utilisateur.
  const onCompleteRef = useRef(onComplete);
  const onSkipRef = useRef(onSkip);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onSkipRef.current = onSkip;
  });

  // Initialise driver.js une seule fois par montage. Les steps sont passes au
  // build du driver, pas par .drive() — sinon le retrigger ne picke pas les nouveaux.
  useEffect(() => {
    const d = driver({
      showProgress: true,
      progressText: "Étape {{current}} sur {{total}}",
      nextBtnText: "Suivant",
      prevBtnText: "Retour",
      doneBtnText: "Commencer",
      // Bouton "Passer le tour" persistant en haut a droite des tooltips.
      // showButtons: precedence vis-a-vis de doneBtnText.
      showButtons: ["next", "previous", "close"],
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 4,
      stageRadius: 12,
      smoothScroll: true,
      animate: true,
      popoverClass: "ep-tour-popover",
      onCloseClick: () => {
        // Click sur le X de fermeture = "Passer le tour"
        finishedRef.current = "skipped";
        d.destroy();
      },
      onDestroyed: () => {
        // Appele a la fermeture (X) ET a la completion (Commencer apres
        // derniere etape). On distingue via finishedRef qui est set
        // explicitement par onCloseClick / onNextClick sur derniere step.
        if (finishedRef.current === "completed") {
          onCompleteRef.current();
        } else if (finishedRef.current !== "unmounted") {
          // Defaut : skip (X, ESC, click overlay). Un demontage du layout
          // (deconnexion, navigation hors dashboard) n'est pas un choix de
          // l'utilisateur : rien n'est enregistre.
          onSkipRef.current();
        }
        finishedRef.current = null;
      },
      onNextClick: (_el, _step, opts) => {
        const total = TESTER_TOUR_STEPS.length;
        const isLast = (opts.state?.activeIndex ?? 0) === total - 1;
        if (isLast) {
          finishedRef.current = "completed";
          d.destroy();
          return;
        }
        d.moveNext();
      },
      onPrevClick: () => d.movePrevious(),
      steps: TESTER_TOUR_STEPS.map((s) => ({
        element: s.element ?? undefined,
        popover: {
          title: s.title,
          description: s.description,
          side: s.side,
          align: s.align,
        },
      })),
    });

    driverRef.current = d;

    return () => {
      finishedRef.current = "unmounted";
      d.destroy();
      finishedRef.current = null;
      driverRef.current = null;
    };
  }, []);

  // Lancement automatique : une seule fois par montage. Le marqueur n'est pose
  // qu'au lancement effectif (dans le timer), pas a la planification : en
  // StrictMode (dev), React monte, demonte puis remonte les effets ; l'ancienne
  // logique (ref posee des la 1re execution) voyait le remontage comme « deja
  // lance » et le tour ne demarrait jamais.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    // Petit delai : laisse le DOM se stabiliser (sidebar, badges, etc.)
    // sinon driver.js calcule des positions sur des elements pas encore
    // a leur taille finale.
    const t = setTimeout(() => {
      autoStartedRef.current = true;
      driverRef.current?.drive();
    }, 200);
    return () => clearTimeout(t);
  }, [autoStart]);

  // Relance manuelle (bouton "?") : a chaque changement de triggerKey par
  // rapport a sa valeur au montage.
  const initialTriggerKeyRef = useRef(triggerKey);
  useEffect(() => {
    if (triggerKey === initialTriggerKeyRef.current) return;
    const t = setTimeout(() => {
      driverRef.current?.drive();
    }, 200);
    return () => clearTimeout(t);
  }, [triggerKey]);

  return null;
}
