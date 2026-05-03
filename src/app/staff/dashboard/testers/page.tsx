"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TesterDrawer from "@/components/staff/TesterDrawer";
import TesterAdvancedFilters from "@/components/staff/TesterAdvancedFilters";
import {
  emptyTesterFilters,
  countActiveTesterFilters,
  appendTesterFiltersToParams,
  type TesterAdvancedFilterState,
} from "@/lib/tester-filters";

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

export default function StaffTestersPage() {
  const [testers, setTesters] = useState<TesterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TesterAdvancedFilterState>(() => emptyTesterFilters());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", filter);
      appendTesterFiltersToParams(params, filters);
      const res = await fetch(
        `/api/staff/testers?${params.toString()}`,
        signal ? { signal } : undefined,
      );
      if (signal?.aborted) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      if (signal?.aborted) return;
      setTesters(data);
    } catch (e: unknown) {
      // AbortError = volontaire (filtre change), pas une vraie erreur a afficher.
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filter, filters]);

  // Debounce 200ms + AbortController : un changement de filtre cleanup la requete
  // en cours et le timer pendant. Seule la derniere intention utilisateur fait
  // un fetch reel, les reponses obsoletes sont ignorees -> plus d'oscillation.
  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => load(ac.signal), 200);
    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [load]);

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

  const advancedCount = countActiveTesterFilters(filters);

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
        <div style={{ marginBottom: 16 }}>
          <TesterAdvancedFilters value={filters} onChange={setFilters} />
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

