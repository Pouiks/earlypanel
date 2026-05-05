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
  const finishedRef = useRef<"completed" | "skipped" | null>(null);

  // Initialise driver.js une seule fois. Les steps sont passes au build du
  // driver, pas par .drive() — sinon le retrigger ne picke pas les nouveaux.
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
          onComplete();
        } else {
          // Defaut : skip (X, ESC, click overlay).
          onSkip();
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
      d.destroy();
      driverRef.current = null;
    };
  }, [onComplete, onSkip]);

  // Trigger : autoStart au mount OU triggerKey change (bouton "?").
  // On fait une condition combinée pour ne pas relancer 2x au mount initial.
  const lastTriggerKeyRef = useRef<number>(-1);
  useEffect(() => {
    if (!driverRef.current) return;
    const isInitial = lastTriggerKeyRef.current === -1;
    const isManualRetrigger = triggerKey !== lastTriggerKeyRef.current && !isInitial;
    lastTriggerKeyRef.current = triggerKey;

    if ((isInitial && autoStart) || isManualRetrigger) {
      // Petit delai : laisse le DOM se stabiliser (sidebar, badges, etc.)
      // sinon driver.js calcule des positions sur des elements pas encore
      // a leur taille finale.
      const t = setTimeout(() => {
        driverRef.current?.drive();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [autoStart, triggerKey]);

  return null;
}
