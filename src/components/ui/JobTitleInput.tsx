"use client";

/**
 * Input metier avec autocomplete via datalist HTML5 natif.
 *
 * Avantages :
 *  - Suggestions affichees au focus / a la frappe (browser native, gratuit en perfs)
 *  - Le testeur peut TOUJOURS taper sa propre valeur si elle n'est pas dans
 *    la liste — pas de lock-in. La colonne testers.job_title reste TEXT libre.
 *  - 80% des saisies convergent vers des libelles normalises sans friction UX.
 *
 * Pas de dependance externe (combobox, react-select…), pas de bundle bloat.
 */

import { useId } from "react";
import { SUGGESTED_JOB_TITLES } from "@/lib/job-titles";

interface JobTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  id?: string;
  /** Si true, ouvre la datalist au focus (Chrome/Edge). Defaut: true. */
  showOnFocus?: boolean;
}

export default function JobTitleInput({
  value,
  onChange,
  placeholder = "Tapez votre métier (ex: Comptable, Ingénieur logiciel, Product Manager…)",
  style,
  onFocus,
  onBlur,
  required,
  id,
  showOnFocus = true,
}: JobTitleInputProps) {
  const autoId = useId();
  const listId = `job-titles-${(id ?? autoId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <>
      <input
        type="text"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
        // Sur Chrome/Edge, "search" type permet aussi le datalist sans
        // la croix de reset native sur certaines versions. On reste sur
        // "text" qui est le plus compatible cross-browser.
        style={style}
        onFocus={onFocus}
        onBlur={onBlur}
        required={required}
        // Astuce iOS Safari : autocomplete="off" peut etre ignore mais
        // datalist fonctionne quand meme.
      />
      <datalist id={listId}>
        {SUGGESTED_JOB_TITLES.map((j) => (
          <option key={j} value={j} />
        ))}
      </datalist>
      {showOnFocus && (
        <p style={{ fontSize: 11, color: "#86868B", margin: "4px 2px 0", lineHeight: 1.4 }}>
          Suggestions disponibles dès la première lettre. Si votre métier n&apos;est pas dans la liste, tapez-le librement.
        </p>
      )}
    </>
  );
}
