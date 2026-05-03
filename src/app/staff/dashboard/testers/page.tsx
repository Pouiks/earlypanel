"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TesterDrawer from "@/components/staff/TesterDrawer";
import { SECTORS, CSPS } from "@/lib/taxonomy";

interface TesterRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  job_title: string | null;
  sector: string | null;
  csp: string | null;
  company_size: string | null;
  digital_level: string | null;
  status: string;
  profile_completed: boolean;
  created_at: string;
  birth_date: string | null;
  age: number | null;
  tier: string;
  quality_score: number;
  missions_completed: number;
  total_earned: number;
  persona_id: string | null;
  persona: { id: string; slug: string; name: string } | null;
  payment_info_configured?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  active: "Actif",
  suspended: "Suspendu",
  rejected: "Rejeté",
};
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#fff7e6", fg: "#b45309" },
  active: { bg: "#f0faf5", fg: "#0A7A5A" },
  suspended: { bg: "#fef2f2", fg: "#b91c1c" },
  rejected: { bg: "#f5f5f7", fg: "#6e6e73" },
};

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "pending", label: "En attente" },
  { value: "suspended", label: "Suspendus" },
  { value: "rejected", label: "Rejetés" },
];

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

export default function StaffTestersPage() {
  const [testers, setTesters] = useState<TesterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  // Filtres avances : Demographie
  const [genderFilter, setGenderFilter] = useState<Set<string>>(new Set());
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [cspFilter, setCspFilter] = useState<Set<string>>(new Set());
  // Profession
  const [sectorFilter, setSectorFilter] = useState<Set<string>>(new Set());
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [companySizeFilter, setCompanySizeFilter] = useState<Set<string>>(new Set());
  // Equipement
  const [digitalLevelFilter, setDigitalLevelFilter] = useState<Set<string>>(new Set());
  const [connectionFilter, setConnectionFilter] = useState<Set<string>>(new Set());
  const [devicesFilter, setDevicesFilter] = useState<Set<string>>(new Set());
  const [browsersFilter, setBrowsersFilter] = useState<Set<string>>(new Set());
  const [mobileOsFilter, setMobileOsFilter] = useState<Set<string>>(new Set());
  // Localisation
  const [locationFilter, setLocationFilter] = useState("");
  // Profil interne
  const [tierFilter, setTierFilter] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", filter);
      sectorFilter.forEach((s) => params.append("sector", s));
      cspFilter.forEach((s) => params.append("csp", s));
      genderFilter.forEach((s) => params.append("gender", s));
      digitalLevelFilter.forEach((s) => params.append("digital_level", s));
      connectionFilter.forEach((s) => params.append("connection", s));
      devicesFilter.forEach((s) => params.append("devices", s));
      browsersFilter.forEach((s) => params.append("browsers", s));
      mobileOsFilter.forEach((s) => params.append("mobile_os", s));
      companySizeFilter.forEach((s) => params.append("company_size", s));
      tierFilter.forEach((s) => params.append("tier", s));
      if (jobTitleFilter.trim()) params.set("job_title", jobTitleFilter.trim());
      if (ageMin.trim()) params.set("age_min", ageMin.trim());
      if (ageMax.trim()) params.set("age_max", ageMax.trim());
      if (locationFilter.trim()) params.set("location", locationFilter.trim());
      const res = await fetch(`/api/staff/testers?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      setTesters(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [
    filter, sectorFilter, cspFilter, genderFilter,
    digitalLevelFilter, connectionFilter, devicesFilter, browsersFilter, mobileOsFilter,
    companySizeFilter, tierFilter,
    jobTitleFilter, ageMin, ageMax, locationFilter,
  ]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  function toggleSet(set: Set<string>, key: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setter(next);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return testers;
    return testers.filter((t) => {
      const name = `${t.first_name ?? ""} ${t.last_name ?? ""}`.toLowerCase();
      return (
        name.includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.job_title ?? "").toLowerCase().includes(q) ||
        (t.sector ?? "").toLowerCase().includes(q)
      );
    });
  }, [testers, search]);

  const advancedCount =
    sectorFilter.size + cspFilter.size + genderFilter.size +
    digitalLevelFilter.size + connectionFilter.size + devicesFilter.size +
    browsersFilter.size + mobileOsFilter.size + companySizeFilter.size +
    tierFilter.size +
    (jobTitleFilter.trim() ? 1 : 0) +
    (ageMin.trim() ? 1 : 0) + (ageMax.trim() ? 1 : 0) +
    (locationFilter.trim() ? 1 : 0);

  function resetAllFilters() {
    setSectorFilter(new Set());
    setCspFilter(new Set());
    setGenderFilter(new Set());
    setDigitalLevelFilter(new Set());
    setConnectionFilter(new Set());
    setDevicesFilter(new Set());
    setBrowsersFilter(new Set());
    setMobileOsFilter(new Set());
    setCompanySizeFilter(new Set());
    setTierFilter(new Set());
    setJobTitleFilter("");
    setAgeMin("");
    setAgeMax("");
    setLocationFilter("");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", margin: 0 }}>
            Testeurs
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#86868B" }}>
            {testers.length} testeur(s) sur ce filtre
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: "7px 16px", fontSize: 13,
                fontWeight: filter === opt.value ? 600 : 400,
                color: filter === opt.value ? "#0A7A5A" : "#6e6e73",
                background: filter === opt.value ? "#f0faf5" : "transparent",
                border: filter === opt.value ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
                borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            padding: "7px 16px", fontSize: 13, fontWeight: 600,
            color: showAdvanced || advancedCount > 0 ? "#0A7A5A" : "#6e6e73",
            background: showAdvanced || advancedCount > 0 ? "#f0faf5" : "transparent",
            border: showAdvanced || advancedCount > 0 ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
            borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
          }}
          title="Filtres avances (secteur, CSP, age, metier)"
        >
          Filtres avances{advancedCount > 0 ? ` · ${advancedCount}` : ""}
        </button>
        <input
          type="search"
          placeholder="Rechercher par nom, email, métier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 240,
            padding: "10px 14px", fontSize: 13,
            border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
            fontFamily: "inherit", background: "#fff",
          }}
        />
      </div>

      {showAdvanced && (
        <div style={{
          background: "#fff",
          border: "0.5px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: "20px 22px",
          marginBottom: 16,
          display: "grid",
          gap: 22,
        }}>
          <FilterSection title="Démographie">
            <FilterField label="Genre">
              <PillGroup
                options={GENDER_OPTIONS}
                selected={genderFilter}
                onToggle={(v) => toggleSet(genderFilter, v, setGenderFilter)}
              />
            </FilterField>
            <FilterField label="Tranche d'âge">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="number" min={16} max={120}
                  placeholder="Min" value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  style={ageInputStyle}
                />
                <span style={{ color: "#86868B", fontSize: 12 }}>–</span>
                <input
                  type="number" min={16} max={120}
                  placeholder="Max" value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  style={ageInputStyle}
                />
                <span style={{ color: "#86868B", fontSize: 11 }}>ans</span>
              </div>
            </FilterField>
            <FilterField label="Catégorie socio-professionnelle (CSP)">
              <PillGroup
                options={(CSPS as unknown as string[]).map((c) => ({ value: c, label: c }))}
                selected={cspFilter}
                onToggle={(v) => toggleSet(cspFilter, v, setCspFilter)}
              />
            </FilterField>
          </FilterSection>

          <FilterSection title="Profession">
            <FilterField label="Secteur d'activité">
              <PillGroup
                options={SECTORS.map((s) => ({ value: s, label: s }))}
                selected={sectorFilter}
                onToggle={(v) => toggleSet(sectorFilter, v, setSectorFilter)}
              />
            </FilterField>
            <FilterField label="Métier (recherche fuzzy)">
              <input
                type="search"
                placeholder="Ex: comptab, ingenieur, etudiant…"
                value={jobTitleFilter}
                onChange={(e) => setJobTitleFilter(e.target.value)}
                style={textInputStyle}
              />
            </FilterField>
            <FilterField label="Taille d'entreprise">
              <PillGroup
                options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} pers.` }))}
                selected={companySizeFilter}
                onToggle={(v) => toggleSet(companySizeFilter, v, setCompanySizeFilter)}
              />
            </FilterField>
          </FilterSection>

          <FilterSection title="Équipement & Niveau digital">
            <FilterField label="Niveau digital">
              <PillGroup
                options={DIGITAL_LEVELS}
                selected={digitalLevelFilter}
                onToggle={(v) => toggleSet(digitalLevelFilter, v, setDigitalLevelFilter)}
              />
            </FilterField>
            <FilterField label="Connexion Internet">
              <PillGroup
                options={CONNECTIONS.map((c) => ({ value: c, label: c }))}
                selected={connectionFilter}
                onToggle={(v) => toggleSet(connectionFilter, v, setConnectionFilter)}
              />
            </FilterField>
            <FilterField label="Appareils utilisés">
              <PillGroup
                options={DEVICES.map((d) => ({ value: d, label: d }))}
                selected={devicesFilter}
                onToggle={(v) => toggleSet(devicesFilter, v, setDevicesFilter)}
              />
            </FilterField>
            <FilterField label="Navigateurs">
              <PillGroup
                options={BROWSERS.map((b) => ({ value: b, label: b }))}
                selected={browsersFilter}
                onToggle={(v) => toggleSet(browsersFilter, v, setBrowsersFilter)}
              />
            </FilterField>
            <FilterField label="OS mobile">
              <PillGroup
                options={MOBILE_OS.map((o) => ({ value: o, label: o }))}
                selected={mobileOsFilter}
                onToggle={(v) => toggleSet(mobileOsFilter, v, setMobileOsFilter)}
              />
            </FilterField>
          </FilterSection>

          <FilterSection title="Localisation">
            <FilterField label="Ville ou code postal">
              <input
                type="search"
                placeholder="Ex: Paris, Lyon, 75, 69001…"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                style={textInputStyle}
              />
              <p style={{ fontSize: 11, color: "#86868B", margin: "4px 0 0" }}>
                Recherche partielle : « 75 » matche tous les codes 75XXX (Paris), « Lyon » matche Lyon et arrondissements.
              </p>
            </FilterField>
          </FilterSection>

          <FilterSection title="Profil interne (staff)">
            <FilterField label="Tier qualité">
              <PillGroup
                options={TIERS}
                selected={tierFilter}
                onToggle={(v) => toggleSet(tierFilter, v, setTierFilter)}
              />
            </FilterField>
          </FilterSection>

          {advancedCount > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6, borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
              <button
                onClick={resetAllFilters}
                style={{
                  padding: "8px 16px", fontSize: 12, fontWeight: 600,
                  background: "#fef2f2", color: "#b91c1c",
                  border: "1px solid rgba(0,0,0,0.05)", borderRadius: 980,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Réinitialiser tous les filtres ({advancedCount})
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#86868B" }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.08)", padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧑‍🔬</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>
            Aucun testeur
          </h2>
          <p style={{ fontSize: 14, color: "#86868B", margin: 0 }}>
            Aucun testeur ne correspond aux critères actuels.
          </p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 0.8fr 0.7fr 0.6fr 0.8fr 0.7fr", gap: 12, padding: "12px 20px", background: "#fafafa", borderBottom: "0.5px solid rgba(0,0,0,0.06)", fontSize: 11, fontWeight: 700, color: "#86868B", letterSpacing: 0.4, textTransform: "uppercase" }}>
            <div>Testeur</div>
            <div>Métier / Secteur</div>
            <div>Persona</div>
            <div>Tier</div>
            <div>Missions</div>
            <div>Inscription</div>
            <div>Statut</div>
          </div>
          {filtered.map((t) => {
            const sc = STATUS_COLORS[t.status] ?? STATUS_COLORS.pending;
            const fullName = `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() || "—";
            return (
              <div
                key={t.id}
                onClick={() => setDrawerId(t.id)}
                style={{
                  display: "grid", gridTemplateColumns: "1.5fr 1.2fr 0.8fr 0.7fr 0.6fr 0.8fr 0.7fr",
                  gap: 12, padding: "14px 20px",
                  borderBottom: "0.5px solid rgba(0,0,0,0.04)",
                  alignItems: "center", fontSize: 13, color: "#1d1d1f",
                  cursor: "pointer", transition: "background 100ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{fullName}</span>
                    {t.status === "active" && t.payment_info_configured === false && (
                      <span
                        title="Coordonnees bancaires non renseignees — ne peut pas etre paye, donc pas eligible aux invitations projet."
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#fef3c7",
                          color: "#b45309",
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                          cursor: "help",
                        }}
                      >
                        !
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#86868B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.email}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.job_title || "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "#86868B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.sector || "—"}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: t.persona ? "#0A7A5A" : "#86868B" }}>
                  {t.persona?.name || "—"}
                </div>
                <div>
                  <span style={{
                    padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 980,
                    background: t.tier === "premium" ? "#0A7A5A" : t.tier === "expert" ? "#1D9E75" : "#f5f5f7",
                    color: t.tier === "standard" ? "#6e6e73" : "#fff",
                  }}>
                    {t.tier === "standard" ? "Standard" : t.tier === "expert" ? "Expert" : "Premium"}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                  {t.missions_completed}
                </div>
                <div
                  style={{ fontSize: 12, color: "#86868B", fontVariantNumeric: "tabular-nums" }}
                  title={new Date(t.created_at).toLocaleString("fr-FR")}
                >
                  {new Date(t.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit", month: "2-digit", year: "2-digit",
                  })}
                </div>
                <div>
                  <span style={{ padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 980, background: sc.bg, color: sc.fg }}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TesterDrawer
        testerId={drawerId}
        onClose={(action) => {
          if (action.type === "deleted") {
            setTesters((prev) => prev.filter((t) => t.id !== action.id));
          } else if (action.type === "updated") {
            setTesters((prev) =>
              prev.map((t) =>
                t.id === action.id ? ({ ...t, ...action.patch } as TesterRow) : t,
              ),
            );
          }
          setDrawerId(null);
        }}
      />
    </div>
  );
}

// =====================================================================
// Helpers UI : sections de filtres + groupe de pills
// =====================================================================

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
