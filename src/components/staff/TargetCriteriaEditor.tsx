"use client";

import { useEffect, useState } from "react";
import {
  DIGITAL_LEVEL_OPTIONS, CONNECTIONS, DEVICES, BROWSERS, MOBILE_OS, COMPANY_SIZES,
} from "@/lib/tester-vocab";
import {
  CRITERION_LABELS, INTEREST_OPTIONS, AVAILABILITY_OPTIONS, UX_EXPERIENCE_OPTIONS, TOOL_OPTIONS,
  type CriterionKey, type TargetCriteria,
} from "@/lib/target-criteria";

/**
 * Editeur de la cible client etendue (projects.target_criteria).
 *
 * Chaque critere a un interrupteur « Obligatoire » : coche, il exclut les
 * testeurs qui ne le remplissent pas ; sinon il compte dans le score.
 * Les criteres historiques (genre, age, CSP, secteur, villes) sont saisis
 * au-dessus dans ProjectForm ; ici on ne gere que leur caractere obligatoire.
 */
interface Props {
  value: TargetCriteria;
  onChange: (next: TargetCriteria) => void;
}

interface PersonaOption { id: string; name: string; tester_count?: number }

const LEGACY_KEYS: CriterionKey[] = ["gender", "age", "csp", "sector", "locations"];

export default function TargetCriteriaEditor({ value, onChange }: Props) {
  const [personas, setPersonas] = useState<PersonaOption[]>([]);
  const c = value;
  const set = (patch: Partial<TargetCriteria>) => onChange({ ...c, ...patch });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staff/personas")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled && Array.isArray(d)) setPersonas(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const isRequired = (k: CriterionKey) => c.required.includes(k);
  const toggleRequired = (k: CriterionKey) =>
    set({ required: isRequired(k) ? c.required.filter((x) => x !== k) : [...c.required, k] });
  const toggleIn = (key: keyof TargetCriteria, v: string) => {
    const arr = c[key] as string[];
    set({ [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] } as Partial<TargetCriteria>);
  };
  const req = (k: CriterionKey) => ({ required: isRequired(k), onRequired: () => toggleRequired(k) });

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ background: "#f0faf5", border: "1px solid rgba(10,122,90,0.2)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#0A7A5A", lineHeight: 1.5 }}>
        Chaque critère <strong>note</strong> les testeurs (score « 4 / 5 » dans l&apos;onglet Testeurs). Cochez <strong>Obligatoire</strong> seulement pour ce qui rend le test impossible (ex. iPhone pour une app iOS) : avec un petit panel, on classe, on n&apos;exclut pas.
      </div>

      <Field label="Critères ci-dessus à rendre obligatoires" hint="Genre, âge, CSP, secteur et villes : cochez ceux qui doivent exclure au lieu de noter.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {LEGACY_KEYS.map((k) => (
            <label key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={isRequired(k)} onChange={() => toggleRequired(k)} style={{ accentColor: "#b91c1c" }} />
              {CRITERION_LABELS[k]}
            </label>
          ))}
        </div>
      </Field>

      <Field label={CRITERION_LABELS.persona} {...req("persona")}>
        <Pills options={personas.map((p) => ({ value: p.id, label: `${p.name}${typeof p.tester_count === "number" ? ` (${p.tester_count})` : ""}` }))} selected={c.persona_ids} onToggle={(v) => toggleIn("persona_ids", v)} empty="Aucun persona défini." />
      </Field>

      <Field label={CRITERION_LABELS.job_title} hint="Mots-clés séparés par des virgules, un seul suffit. Ex. : kiné, kinésithérapeute" {...req("job_title")}>
        <input type="text" value={c.job_title} onChange={(e) => set({ job_title: e.target.value })} placeholder="kiné, ostéopathe…" style={inputStyle} />
      </Field>

      <Field label={CRITERION_LABELS.company_size} {...req("company_size")}>
        <Pills options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} pers.` }))} selected={c.company_sizes} onToggle={(v) => toggleIn("company_sizes", v)} />
      </Field>

      <Field label={CRITERION_LABELS.digital_level} {...req("digital_level")}>
        <Pills options={[...DIGITAL_LEVEL_OPTIONS]} selected={c.digital_levels} onToggle={(v) => toggleIn("digital_levels", v)} />
      </Field>

      <Field label={CRITERION_LABELS.devices} {...req("devices")}>
        <Pills options={DEVICES.map((d) => ({ value: d, label: d }))} selected={c.devices} onToggle={(v) => toggleIn("devices", v)} />
      </Field>

      <Field label={CRITERION_LABELS.mobile_os} {...req("mobile_os")}>
        <Pills options={MOBILE_OS.map((d) => ({ value: d, label: d }))} selected={c.mobile_os} onToggle={(v) => toggleIn("mobile_os", v)} />
      </Field>

      <Field label={CRITERION_LABELS.browsers} {...req("browsers")}>
        <Pills options={BROWSERS.map((d) => ({ value: d, label: d }))} selected={c.browsers} onToggle={(v) => toggleIn("browsers", v)} />
      </Field>

      <Field label={CRITERION_LABELS.connection} {...req("connection")}>
        <Pills options={CONNECTIONS.map((d) => ({ value: d, label: d }))} selected={c.connections} onToggle={(v) => toggleIn("connections", v)} />
      </Field>

      <Field label={CRITERION_LABELS.tools} hint="Un seul outil en commun suffit." {...req("tools")}>
        <Pills options={TOOL_OPTIONS.map((d) => ({ value: d, label: d }))} selected={c.tools} onToggle={(v) => toggleIn("tools", v)} />
      </Field>

      <Field label={CRITERION_LABELS.interests} {...req("interests")}>
        <Pills options={INTEREST_OPTIONS.map((d) => ({ value: d, label: d }))} selected={c.interests} onToggle={(v) => toggleIn("interests", v)} />
      </Field>

      <Field label={CRITERION_LABELS.availability} {...req("availability")}>
        <Pills options={[...AVAILABILITY_OPTIONS]} selected={c.availability} onToggle={(v) => toggleIn("availability", v)} />
      </Field>

      <Field label={CRITERION_LABELS.ux_experience} {...req("ux_experience")}>
        <Pills options={[...UX_EXPERIENCE_OPTIONS]} selected={c.ux_experience} onToggle={(v) => toggleIn("ux_experience", v)} />
      </Field>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", maxWidth: 480, padding: "10px 14px", fontSize: 14, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, fontFamily: "inherit" };

function Field({ label, hint, required, onRequired, children }: { label: string; hint?: string; required?: boolean; onRequired?: () => void; children?: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{label}</span>
        {onRequired && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: required ? "#b91c1c" : "#86868B", cursor: "pointer" }}>
            <input type="checkbox" checked={!!required} onChange={onRequired} style={{ accentColor: "#b91c1c" }} />
            Obligatoire
          </label>
        )}
        {hint && <span style={{ fontSize: 11, color: "#86868B" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Pills({ options, selected, onToggle, empty }: { options: Array<{ value: string; label: string }>; selected: string[]; onToggle: (v: string) => void; empty?: string }) {
  if (options.length === 0) return <span style={{ fontSize: 12, color: "#86868B" }}>{empty ?? "Aucune option."}</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button key={o.value} type="button" onClick={() => onToggle(o.value)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#fff" : "#1d1d1f", background: active ? "#0A7A5A" : "#f5f5f7", border: "1px solid " + (active ? "#0A7A5A" : "rgba(0,0,0,0.08)"), borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
