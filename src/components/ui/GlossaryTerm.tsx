"use client";

/**
 * Terme du glossaire annote dans un texte : lien vers /glossaire#slug avec
 * une infobulle (definition) au survol et au focus clavier. Sur ecran
 * tactile, le premier appui ouvre l'infobulle, le second suit le lien.
 *
 * La definition n'est rendue dans le DOM que lorsque l'infobulle est
 * ouverte : le HTML servi ne contient que le lien, pas de texte duplique
 * du glossaire.
 */
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";

interface Props {
  slug: string;
  term: string;
  definition: string;
  children: ReactNode;
}

const TIP_WIDTH = 320;

export default function GlossaryTerm({ slug, term, definition, children }: Props) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setAlignRight(r.left + TIP_WIDTH > window.innerWidth - 16);
    setOpen(true);
  };
  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) hide();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (open) return;
    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
      e.preventDefault();
      show();
    }
  };

  return (
    <span className="gl-wrap" ref={ref} onMouseEnter={show} onMouseLeave={hide}>
      <a
        href={`/glossaire#${slug}`}
        className="gl-term"
        onFocus={show}
        onBlur={hide}
        onClick={onClick}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </a>
      {open && (
        <span role="tooltip" id={id} className={`gl-tip${alignRight ? " gl-tip-right" : ""}`}>
          <strong>{term}</strong>
          {definition}
          <span className="gl-tip-more">Voir dans le glossaire →</span>
        </span>
      )}
    </span>
  );
}
