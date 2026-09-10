"use client";

/**
 * Terme du glossaire annote dans un texte : lien vers /glossaire#slug avec
 * une infobulle (definition) au survol et au focus clavier. Sur ecran
 * tactile, le premier appui ouvre l'infobulle, le second suit le lien.
 *
 * La carte est rendue dans un portail (document.body) en position fixe,
 * calculee depuis le rectangle du mot : elle echappe ainsi aux contextes
 * d'empilement crees par les animations d'apparition (opacity) ou les
 * transformations des sections, qui sinon la faisaient passer sous les
 * boutons voisins. Elle n'est dans le DOM que lorsqu'elle est ouverte :
 * le HTML servi ne contient que le lien.
 */
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  slug: string;
  term: string;
  definition: string;
  children: ReactNode;
}

const TIP_WIDTH = 320;
const TIP_GAP = 8;
const EDGE = 16;
/** Hauteur estimee, pour decider d'afficher la carte au-dessus du mot. */
const TIP_EST_HEIGHT = 200;

interface Pos {
  left: number;
  top?: number;
  bottom?: number;
}

export default function GlossaryTerm({ slug, term, definition, children }: Props) {
  const [pos, setPos] = useState<Pos | null>(null);
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | null>(null);
  const open = pos !== null;

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const show = () => {
    cancelClose();
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(TIP_WIDTH, window.innerWidth - 2 * EDGE);
    let left = r.left;
    if (left + width > window.innerWidth - EDGE) left = Math.max(EDGE, r.right - width);
    const below = r.bottom + TIP_GAP + TIP_EST_HEIGHT <= window.innerHeight || r.top < window.innerHeight / 2;
    setPos(below ? { left, top: r.bottom + TIP_GAP } : { left, bottom: window.innerHeight - r.top + TIP_GAP });
  };
  const hideNow = () => {
    cancelClose();
    setPos(null);
  };
  // Fermeture differee : laisse le temps d'amener la souris du mot a la carte.
  const hideSoon = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setPos(null), 220);
  };

  useEffect(() => cancelClose, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPos(null); };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || tipRef.current?.contains(t)) return;
      setPos(null);
    };
    const onScroll = () => setPos(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (open) return;
    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
      e.preventDefault();
      show();
    }
  };

  const tip = open && typeof document !== "undefined"
    ? createPortal(
        <span
          role="tooltip"
          id={id}
          ref={tipRef}
          className={`gl-tip${pos.bottom !== undefined ? " gl-tip-above" : ""}`}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: Math.min(TIP_WIDTH, window.innerWidth - 2 * EDGE) }}
          onMouseEnter={cancelClose}
          onMouseLeave={hideSoon}
        >
          <strong>{term}</strong>
          {definition}
          <a href={`/glossaire#${slug}`} className="gl-tip-more" onFocus={cancelClose} onBlur={hideSoon}>
            Voir dans le glossaire →
          </a>
        </span>,
        document.body,
      )
    : null;

  return (
    <span className="gl-wrap" ref={wrapRef} onMouseEnter={show} onMouseLeave={hideSoon}>
      <a
        href={`/glossaire#${slug}`}
        className="gl-term"
        onFocus={show}
        onBlur={hideSoon}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Escape") hideNow(); }}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </a>
      {tip}
    </span>
  );
}
