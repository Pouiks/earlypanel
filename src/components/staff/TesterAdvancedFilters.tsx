"use client";

/**
 * Panneau de filtres avances testeurs.
 *
 * Composant controle : l'etat est gere par le parent via les props
 * `value` + `onChange`. Sert a la fois pour la page Testeurs (full search)
 * et pour le catalogue projet (filtres en plus du targeting projet).
 */

import { SECTORS, CSPS } from "@/lib/taxonomy";
import {
  type TesterAdvancedFilterState,
  emptyTesterFilters,
  countActiveTesterFilters,
} from "@/lib/tester-filters";

const GENDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
  { value: "non_binary", label: "Non-binaire" },
  { value: "prefer_not_to_say", label: "Ne se prononce pas" },
];

const DIGITAL_LEVELS: Array<{ value: string; label: string }> = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
  { value: "expert", label: "Expert" },
];

const CONNECTIONS = ["Fibre", "ADSL", "4G/5G"];
const DEVICES = ["PC Windows", "PC Linux", "Mac", "iPhone", "Smartphone Android", "iPad", "Tablette Android", "Autre smartphone", "Autre tablette"];
const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", "Brave", "Opera", "Arc", "Autre"];
const MOBILE_OS = ["iOS", "Android"];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const TIERS = [
  { value: "standard", label: "Standard" },
  { value: "expert", label: "Expert" },
  { value: "premium", label: "Premium" },
];

interface Props {
  value: TesterAdvancedFilterState;
  onChange: (next: TesterAdvancedFilterState) => void;
  /** Si fourni, masque les sections specifiques (ex: hide tier dans la fiche projet). */
  hideSections?: Array<"tier">;
}

export default function TesterAdvancedFilters({ value, onChange, hideSections }: Props) {
  const f = value;
  const update = (patch: Partial<TesterAdvancedFilterState>) => onChange({ ...f, ...patch });

  function toggleInSet(key: keyof TesterAdvancedFilterState, item: string) {
    const cur = f[key] as Set<string>;
    const next = new Set(cur);
    if (next.has(item)) next.delete(item); else next.add(item);
    onChange({ ...f, [key]: next });
  }

  const showTier = !hideSections?.includes("tier");

  return (
    <div style={{
      background: "#fff",
      border: "0.5px solid rgba(0,0,0,0.08)",
      borderRadius: 16,
      padding: "20px 22px",
      display: "grid",
      gap: 22,
    }}>
      <FilterSection title="Démographie">
        <FilterField label="Genre">
          <PillGroup
            options={GENDER_OPTIONS}
            selected={f.gender}
            onToggle={(v) => toggleInSet("gender", v)}
          />
        </FilterField>
        <FilterField label="Tranche d'âge">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number" min={16} max={120}
              placeholder="Min" value={f.ageMin}
              onChange={(e) => update({ ageMin: e.target.value })}
              style={ageInputStyle}
            />
            <span style={{ color: "#86868B", fontSize: 12 }}>–</span>
            <input
              type="number" min={16} max={120}
              placeholder="Max" value={f.ageMax}
              onChange={(e) => update({ ageMax: e.target.value })}
              style={ageInputStyle}
            />
            <span style={{ color: "#86868B", fontSize: 11 }}>ans</span>
          </div>
        </FilterField>
        <FilterField label="Catégorie socio-professionnelle (CSP)">
          <PillGroup
            options={(CSPS as unknown as string[]).map((c) => ({ value: c, label: c }))}
            selected={f.csp}
            onToggle={(v) => toggleInSet("csp", v)}
          />
        </FilterField>
      </FilterSection>

      <FilterSection title="Profession">
        <FilterField label="Secteur d'activité">
          <PillGroup
            options={SECTORS.map((s) => ({ value: s, label: s }))}
            selected={f.sector}
            onToggle={(v) => toggleInSet("sector", v)}
          />
        </FilterField>
        <FilterField label="Métier (recherche fuzzy)">
          <input
            type="search"
            placeholder="Ex: comptab, ingenieur, etudiant…"
            value={f.jobTitle}
            onChange={(e) => update({ jobTitle: e.target.value })}
            style={textInputStyle}
          />
        </FilterField>
        <FilterField label="Taille d'entreprise">
          <PillGroup
            options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} pers.` }))}
            selected={f.companySize}
            onToggle={(v) => toggleInSet("companySize", v)}
          />
        </FilterField>
      </FilterSection>

      <FilterSection title="Équipement & Niveau digital">
        <FilterField label="Niveau digital">
          <PillGroup
            options={DIGITAL_LEVELS}
            selected={f.digitalLevel}
            onToggle={(v) => toggleInSet("digitalLevel", v)}
          />
        </FilterField>
        <FilterField label="Connexion Internet">
          <PillGroup
            options={CONNECTIONS.map((c) => ({ value: c, label: c }))}
            selected={f.connection}
            onToggle={(v) => toggleInSet("connection", v)}
          />
        </FilterField>
        <FilterField label="Appareils utilisés">
          <PillGroup
            options={DEVICES.map((d) => ({ value: d, label: d }))}
            selected={f.devices}
            onToggle={(v) => toggleInSet("devices", v)}
          />
        </FilterField>
        <FilterField label="Navigateurs">
          <PillGroup
            options={BROWSERS.map((b) => ({ value: b, label: b }))}
            selected={f.browsers}
            onToggle={(v) => toggleInSet("browsers", v)}
          />
        </FilterField>
        <FilterField label="OS mobile">
          <PillGroup
            options={MOBILE_OS.map((o) => ({ value: o, label: o }))}
            selected={f.mobileOs}
            onToggle={(v) => toggleInSet("mobileOs", v)}
          />
        </FilterField>
      </FilterSection>

      <FilterSection title="Localisation">
        <FilterField label="Ville ou code postal">
          <input
            type="search"
            placeholder="Ex: Paris, Lyon, 75, 69001…"
            value={f.location}
            onChange={(e) => update({ location: e.target.value })}
            style={textInputStyle}
          />
          <p style={{ fontSize: 11, color: "#86868B", margin: "4px 0 0" }}>
            Recherche partielle : « 75 » matche tous les codes 75XXX (Paris), « Lyon » matche Lyon et arrondissements.
          </p>
        </FilterField>
      </FilterSection>

      {showTier && (
        <FilterSection title="Profil interne (staff)">
          <FilterField label="Tier qualité">
            <PillGroup
              options={TIERS}
              selected={f.tier}
              onToggle={(v) => toggleInSet("tier", v)}
            />
          </FilterField>
        </FilterSection>
      )}

      {countActiveTesterFilters(f) > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6, borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
          <button
            onClick={() => onChange(emptyTesterFilters())}
            style={{
              padding: "8px 16px", fontSize: 12, fontWeight: 600,
              background: "#fef2f2", color: "#b91c1c",
              border: "1px solid rgba(0,0,0,0.05)", borderRadius: 980,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Réinitialiser tous les filtres ({countActiveTesterFilters(f)})
          </button>
        </div>
      )}
    </div>
  );
}

// ============== UI helpers ==============

const ageInputStyle: React.CSSProperties = {
  width: 80, padding: "8px 10px", fontSize: 13,
  border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, fontFamily: "inherit",
};

const textInputStyle: React.CSSProperties = {
  width: "100%", maxWidth: 420,
  padding: "8px 14px", fontSize: 13,
  border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
  fontFamily: "inherit", background: "#fff",
};

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#0A7A5A",
        textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12,
        paddingBottom: 6, borderBottom: "0.5px solid rgba(10,122,90,0.15)",
      }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function PillGroup({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>;
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const active = selected.has(o.value);
        return (
          <button
            key={o.value}
            onClick={() => onToggle(o.value)}
            style={{
              padding: "5px 12px", fontSize: 12,
              fontWeight: active ? 700 : 500,
              color: active ? "#fff" : "#1d1d1f",
              background: active ? "#0A7A5A" : "#f5f5f7",
              border: "1px solid " + (active ? "#0A7A5A" : "rgba(0,0,0,0.08)"),
              borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
              transition: "all 100ms",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
