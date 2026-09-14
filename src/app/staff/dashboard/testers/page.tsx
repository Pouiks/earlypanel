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
import { ACTIVITY_FILTERS, formatLastSeen, isPastRgpdRetention } from "@/lib/tester-activity";
import { engagementState, reminderCount, AVAILABILITY_REMINDER_MAX, ENGAGEMENT_LABELS, ENGAGEMENT_ORDER, ENGAGEMENT_TITLES, type EngagementState } from "@/lib/tester-engagement";
import { runAvailabilityCampaign, type CampaignProgress } from "@/lib/client/availability-campaign-client";

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
  available_until?: string | null;
  availability_check_sent_at?: string | null;
  availability_check_count?: number | null;
  last_login_at?: string | null;
  last_seen_at?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  active: "Actif",
  suspended: "Suspendu",
  rejected: "Rejeté",
  inactive: "Désactivé",
};
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#f5f5f7", fg: "#1d1d1f" },
  active: { bg: "#f0faf5", fg: "#0A7A5A" },
  suspended: { bg: "#fef2f2", fg: "#b91c1c" },
  rejected: { bg: "#f5f5f7", fg: "#6e6e73" },
  inactive: { bg: "#f1f1f3", fg: "#6e6e73" },
};

// Pastille d'engagement (etat calcule, cf. src/lib/tester-engagement.ts) :
// remplace « Actif » pour les testeurs actifs, qui ne veut dire que « profil
// complet » et n'expire jamais.
const ENGAGEMENT_COLORS: Record<EngagementState, { bg: string; fg: string }> = {
  available: { bg: "#f0faf5", fg: "#0A7A5A" },
  to_remind: { bg: "#FEF3C7", fg: "#92600A" },
  dormant: { bg: "#f1f1f3", fg: "#6e6e73" },
};

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "pending", label: "En attente" },
  { value: "suspended", label: "Suspendus" },
  { value: "inactive", label: "Désactivés" },
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
  const [availableOnly, setAvailableOnly] = useState(false);
  const [activity, setActivity] = useState("");
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [campaignMsg, setCampaignMsg] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [showTest, setShowTest] = useState(false);
  // Nombre de destinataires reels de l'envoi groupe (independant du filtre
  // affiche) : lu sur la vue Relances > Disponibilite a l'ouverture de la modale.
  const [campaignDue, setCampaignDue] = useState<number | null>(null);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress | null>(null);

  async function openCampaign() {
    setCampaignOpen(true);
    setCampaignMsg(null);
    setShowTest(false);
    setCampaignDue(null);
    try {
      const res = await fetch("/api/staff/testers/availability-reminders", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { summary?: { due?: number } };
        setCampaignDue(data.summary?.due ?? null);
      }
    } catch {
      /* le bouton reste utilisable sans le compteur */
    }
  }

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", filter);
      if (availableOnly) params.set("available", "confirmed");
      if (activity) params.set("activity", activity);
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
  }, [filter, filters, availableOnly, activity]);

  async function sendCampaign(testEmailArg?: string) {
    const isTest = typeof testEmailArg === "string" && testEmailArg.includes("@");
    setCampaignBusy(true);
    setCampaignMsg(null);
    setCampaignProgress(null);
    try {
      if (isTest) {
        const res = await fetch("/api/staff/testers/availability-campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test_email: testEmailArg.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
        setCampaignMsg(`Test envoyé à ${testEmailArg.trim()}. Vérifie ta boîte et les 2 boutons.`);
      } else {
        // Envoi par lots pilote par le navigateur : progression reelle, puis
        // rechargement de la liste pour que les pastilles refletent l'envoi.
        const r = await runAvailabilityCampaign({ onProgress: setCampaignProgress });
        setCampaignMsg(
          `Relance envoyée à ${r.sent} testeur${r.sent > 1 ? "s" : ""} sur ${r.total}.` +
            (r.errors > 0 ? ` ${r.errors} en erreur.` : "") +
            (r.unmarked > 0 ? ` ${r.unmarked} envoyé(s) mais non marqué(s), à vérifier dans le journal d'audit.` : "")
        );
        setCampaignOpen(false);
        await load();
      }
    } catch (e) {
      setCampaignMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCampaignBusy(false);
      setCampaignProgress(null);
    }
  }

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
    const list = !q
      ? testers
      : testers.filter((t) => {
          const name = `${t.first_name ?? ""} ${t.last_name ?? ""}`.toLowerCase();
          return (
            name.includes(q) ||
            t.email.toLowerCase().includes(q) ||
            (t.job_title ?? "").toLowerCase().includes(q) ||
            (t.sector ?? "").toLowerCase().includes(q)
          );
        });
    // Disponibles d'abord, dormants en dernier ; tri stable, l'ordre de
    // l'API (inscription) est conserve a l'interieur de chaque groupe.
    const order = (t: TesterRow) => (t.status === "active" ? ENGAGEMENT_ORDER[engagementState(t)] : 1);
    return [...list].sort((a, b) => order(a) - order(b));
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
        <button
          onClick={openCampaign}
          style={{
            padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#fff",
            background: "#0A7A5A", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Relance de disponibilité
        </button>
      </div>

      {campaignMsg && (
        <div style={{ background: "#f0faf5", border: "1px solid rgba(10,122,90,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#0A7A5A", fontSize: 13 }}>
          {campaignMsg}
        </div>
      )}

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
        <button
          onClick={() => setAvailableOnly((v) => !v)}
          title="Ne montrer que les testeurs dont la disponibilité est confirmée (non expirée)"
          style={{
            padding: "7px 16px", fontSize: 13, fontWeight: 600,
            color: availableOnly ? "#0A7A5A" : "#6e6e73",
            background: availableOnly ? "#f0faf5" : "transparent",
            border: availableOnly ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
            borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ✓ Dispo confirmée
        </button>
        <select
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          title="Dernière activité sur l'espace testeur (connexion ou requête authentifiée)"
          style={{
            padding: "7px 14px", fontSize: 13, fontWeight: activity ? 600 : 400,
            color: activity ? "#0A7A5A" : "#6e6e73",
            background: activity ? "#f0faf5" : "#fff",
            border: activity ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
            borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {ACTIVITY_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
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
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 0.8fr 0.7fr 0.6fr 0.8fr 0.8fr 0.7fr", gap: 12, padding: "12px 20px", background: "#fafafa", borderBottom: "0.5px solid rgba(0,0,0,0.06)", fontSize: 11, fontWeight: 700, color: "#86868B", letterSpacing: 0.4, textTransform: "uppercase" }}>
            <div>Testeur</div>
            <div>Métier / Secteur</div>
            <div>Persona</div>
            <div>Tier</div>
            <div>Missions</div>
            <div>Inscription</div>
            <div>Activité</div>
            <div>Statut</div>
          </div>
          {filtered.map((t) => {
            const sc = STATUS_COLORS[t.status] ?? STATUS_COLORS.pending;
            const fullName = `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() || "Non renseigné";
            const availConfirmed = !!t.available_until && new Date(t.available_until).getTime() >= Date.now();
            const lastSeen = t.last_seen_at ?? t.last_login_at ?? null;
            const rgpdDue = isPastRgpdRetention({ last_seen_at: t.last_seen_at, last_login_at: t.last_login_at, created_at: t.created_at });
            return (
              <div
                key={t.id}
                onClick={() => setDrawerId(t.id)}
                style={{
                  display: "grid", gridTemplateColumns: "1.5fr 1.2fr 0.8fr 0.7fr 0.6fr 0.8fr 0.8fr 0.7fr",
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
                        title="Coordonnees bancaires non renseignees : peut etre invite et signer le NDA, mais ne pourra pas demarrer de mission tant que l'IBAN manque."
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#f5f5f7",
                          color: "#1d1d1f",
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
                    {t.job_title || "Non renseigné"}
                  </div>
                  <div style={{ fontSize: 12, color: "#86868B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.sector || "Non renseigné"}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: t.persona ? "#0A7A5A" : "#86868B" }}>
                  {t.persona?.name || "Non renseigné"}
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
                <div
                  style={{ fontSize: 12, color: lastSeen ? "#1d1d1f" : "#86868B", fontVariantNumeric: "tabular-nums" }}
                  title={lastSeen
                    ? `Dernière activité : ${new Date(lastSeen).toLocaleString("fr-FR")}${t.last_login_at ? ` · dernière connexion : ${new Date(t.last_login_at).toLocaleString("fr-FR")}` : ""}`
                    : "Aucune session connue"}
                >
                  {formatLastSeen(lastSeen)}
                  {rgpdDue && (
                    <div style={{ fontSize: 10, color: "#b91c1c", marginTop: 3, fontWeight: 600 }} title="Plus de 3 ans sans activité : durée de conservation dépassée (politique de confidentialité).">
                      RGPD : à purger
                    </div>
                  )}
                </div>
                <div>
                  {t.status === "active" ? (() => {
                    const state = engagementState(t);
                    const ec = ENGAGEMENT_COLORS[state];
                    const n = reminderCount(t);
                    return (
                      <>
                        <span
                          title={ENGAGEMENT_TITLES[state]}
                          style={{ padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 980, background: ec.bg, color: ec.fg, cursor: "help" }}
                        >
                          {ENGAGEMENT_LABELS[state]}
                        </span>
                        {state !== "available" && n > 0 && (
                          <div
                            style={{ fontSize: 10, color: "#92600A", marginTop: 3, fontWeight: 600 }}
                            title={t.availability_check_sent_at ? `Dernière relance : ${new Date(t.availability_check_sent_at).toLocaleDateString("fr-FR")}` : undefined}
                          >
                            relancé {n}/{AVAILABILITY_REMINDER_MAX}
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <>
                      <span style={{ padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 980, background: sc.bg, color: sc.fg }}>
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                      {t.status === "inactive" && reminderCount(t) >= AVAILABILITY_REMINDER_MAX && (
                        <div style={{ fontSize: 10, color: "#6e6e73", marginTop: 3, fontWeight: 600 }} title="Mis en pause par le cron après 3 relances de disponibilité sans réponse. Un clic « Oui » depuis l'email le réactive.">
                          pause après {AVAILABILITY_REMINDER_MAX} relances
                        </div>
                      )}
                    </>
                  )}
                  {availConfirmed && (
                    <div style={{ fontSize: 10, color: "#0A7A5A", marginTop: 3, fontWeight: 600 }}>
                      dispo → {new Date(t.available_until!).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {campaignOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => !campaignBusy && setCampaignOpen(false)}
        >
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>Relancer la disponibilité</h3>
            <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, margin: "0 0 12px" }}>
              Envoie en une fois l&apos;email « êtes-vous toujours disponible ? » à tous les testeurs actifs qui n&apos;ont pas confirmé leur disponibilité et sont dus dans la boucle (14 jours entre deux relances, 3 maximum). Rien à saisir.
            </p>
            <div style={{ background: "#f0faf5", border: "1px solid rgba(10,122,90,0.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0A7A5A", letterSpacing: "-0.02em" }}>
                {campaignDue === null ? "…" : campaignDue} <span style={{ fontSize: 13, fontWeight: 600 }}>destinataire{campaignDue === 1 ? "" : "s"}</span>
              </div>
              <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 2 }}>
                Indépendant du filtre affiché dans la liste. Le détail par testeur est dans Relances › Disponibilité.
              </div>
            </div>
            {campaignProgress ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6e6e73", marginBottom: 6 }}>
                  <span>Envoi en cours, par lots de 5. Ne fermez pas la page.</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#1d1d1f" }}>
                    {campaignProgress.done} / {campaignProgress.total}{campaignProgress.errors > 0 ? ` · ${campaignProgress.errors} en erreur` : ""}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "#e5e5ea", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${campaignProgress.total === 0 ? 100 : Math.round((campaignProgress.done / campaignProgress.total) * 100)}%`, background: "#0A7A5A", transition: "width 300ms" }} />
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#86868B", lineHeight: 1.5, margin: "0 0 14px" }}>
                Chaque envoi compte dans la boucle. Après 3 relances sans réponse, le cron du lundi met le compte en pause ; un clic « Oui » le réactive.
              </p>
            )}

            {/* Test de rendu, facultatif : un seul email, a l'adresse d'un testeur existant, sans toucher a sa boucle. */}
            <div style={{ marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => setShowTest((v) => !v)}
                style={{ background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 600, color: "#6e6e73", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
              >
                {showTest ? "Masquer le test de rendu" : "Voir d'abord l'email sur une adresse (facultatif)"}
              </button>
              {showTest && (
                <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 12, marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "#6e6e73", marginBottom: 6, lineHeight: 1.5 }}>
                    Envoie un seul email à l&apos;adresse d&apos;un testeur existant, sans compter dans sa boucle. Utile pour vérifier le rendu et les deux boutons avant l&apos;envoi groupé.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="adresse d'un testeur existant"
                      style={{ flex: 1, padding: "8px 10px", fontSize: 13, borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontFamily: "inherit" }}
                    />
                    <button
                      type="button"
                      disabled={campaignBusy || !testEmail.includes("@")}
                      onClick={() => sendCampaign(testEmail)}
                      style={{ padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#0A7A5A", background: "#fff", border: "1px solid #0A7A5A", borderRadius: 980, cursor: campaignBusy || !testEmail.includes("@") ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: campaignBusy || !testEmail.includes("@") ? 0.5 : 1, whiteSpace: "nowrap" }}
                    >
                      Envoyer le test
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" disabled={campaignBusy} onClick={() => setCampaignOpen(false)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#6e6e73", background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
              <button type="button" disabled={campaignBusy || campaignDue === 0} onClick={() => sendCampaign()} style={{ padding: "10px 22px", fontSize: 13, fontWeight: 700, color: "#fff", background: "#0A7A5A", border: "none", borderRadius: 980, cursor: campaignBusy ? "wait" : campaignDue === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: campaignBusy || campaignDue === 0 ? 0.6 : 1 }}>
                {campaignBusy
                  ? (campaignProgress ? `Envoi ${campaignProgress.done} / ${campaignProgress.total}…` : "Préparation…")
                  : campaignDue === null ? "Envoyer à tous les éligibles" : `Envoyer à ${campaignDue} testeur${campaignDue === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
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

