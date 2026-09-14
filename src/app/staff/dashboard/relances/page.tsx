"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TesterDrawer from "@/components/staff/TesterDrawer";
import { runAvailabilityCampaign, type CampaignProgress } from "@/lib/client/availability-campaign-client";

/**
 * Page staff « Relances » : deux boucles automatiques, chacune avec son etat
 * par testeur et un bouton pour relancer a la main.
 *
 *   - Profil : inscrits en attente dont le profil n'est pas complet.
 *     Source : GET /api/staff/testers/profile-reminders.
 *   - Disponibilite : actifs au profil complet sans disponibilite confirmee.
 *     Source : GET /api/staff/testers/availability-reminders.
 *
 * Le parametre ?vue=disponibilite ouvre directement la seconde.
 */

type View = "profil" | "disponibilite";

const VIEWS: { value: View; label: string }[] = [
  { value: "profil", label: "Complétion du profil" },
  { value: "disponibilite", label: "Disponibilité" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "Aucune";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

const btnPrimary: React.CSSProperties = {
  padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#fff", background: "#0A7A5A",
  border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: React.CSSProperties = {
  padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#0A7A5A", background: "#f0faf5",
  border: "1px solid rgba(10,122,90,0.25)", borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
};

export default function StaffRelancesPage() {
  const [view, setView] = useState<View>("profil");

  // Meme pattern que les fetchs de la page : differe d'un tick pour ne pas
  // appeler setState de facon synchrone dans l'effet.
  useEffect(() => {
    const t = setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("vue") === "disponibilite") setView("disponibilite");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function switchView(v: View) {
    setView(v);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (v === "profil") url.searchParams.delete("vue");
      else url.searchParams.set("vue", v);
      window.history.replaceState(null, "", url.toString());
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", margin: 0 }}>
          Relances
        </h1>
        <div style={{ display: "inline-flex", background: "#f5f5f7", borderRadius: 980, padding: 3 }}>
          {VIEWS.map((v) => {
            const active = view === v.value;
            return (
              <button
                key={v.value}
                onClick={() => switchView(v.value)}
                style={{
                  padding: "7px 16px", fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "inherit",
                  color: active ? "#1d1d1f" : "#6e6e73", background: active ? "#fff" : "transparent",
                  border: "none", borderRadius: 980, cursor: "pointer",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "profil" ? <ProfileRemindersView /> : <AvailabilityRemindersView />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vue 1 : completion du profil                                        */
/* ------------------------------------------------------------------ */

type ProfileStateKind = "too_recent" | "due" | "cooldown" | "exhausted" | "paused";

interface ProfileRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  sector: string | null;
  city: string | null;
  status: string;
  created_at: string;
  profile_step: number | null;
  missing_count: number;
  missing_labels: string[];
  reminder_count: number;
  reminder_sent_at: string | null;
  state: ProfileStateKind;
  next_at: string | null;
}

interface ProfilePayload {
  summary: Record<"total" | ProfileStateKind, number>;
  rows: ProfileRow[];
  max: number;
}

const PROFILE_STATE_META: Record<ProfileStateKind, { label: string; hint: string; bg: string; fg: string }> = {
  due: { label: "À relancer", hint: "Partira au prochain passage du cron (9h)", bg: "#f5f5f7", fg: "#1d1d1f" },
  too_recent: { label: "Trop récent", hint: "Inscrit depuis moins de 2 jours", bg: "#f5f5f7", fg: "#6e6e73" },
  cooldown: { label: "Relancé", hint: "Prochaine relance après 5 jours", bg: "#eef4ff", fg: "#1d4ed8" },
  exhausted: { label: "3 relances envoyées", hint: "Sera mis en pause 5 jours après la dernière", bg: "#fef2f2", fg: "#b91c1c" },
  paused: { label: "Mis en pause", hint: "Désactivé après 3 relances sans réponse", bg: "#f1f1f3", fg: "#6e6e73" },
};

const PROFILE_TABS: { value: ProfileStateKind | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "due", label: "À relancer" },
  { value: "cooldown", label: "Relancés" },
  { value: "exhausted", label: "3/3 envoyées" },
  { value: "too_recent", label: "Trop récents" },
  { value: "paused", label: "Mis en pause" },
];

function ProfileRemindersView() {
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileStateKind | "all">("all");
  const [search, setSearch] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/testers/profile-reminders", { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  // Meme pattern que la page Testeurs : fetch differe d'un tick pour ne pas
  // appeler setState de facon synchrone dans l'effet.
  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function remindNow(row: ProfileRow) {
    if (!confirm(`Envoyer maintenant la relance n°${row.reminder_count + 1} à ${row.email} ?`)) return;
    setBusyId(row.id);
    setMsg(null);
    try {
      const res = await fetch(`/api/staff/testers/${row.id}/profile-reminder`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error || `Erreur ${res.status}`);
      setMsg({ kind: "ok", text: `Relance n°${body.reminderNumber} envoyée à ${row.email}.` });
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setBusyId(null);
    }
  }

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (tab !== "all" && r.state !== tab) return false;
      if (!q) return true;
      const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.toLowerCase();
      return name.includes(q) || r.email.toLowerCase().includes(q) || (r.job_title ?? "").toLowerCase().includes(q);
    });
  }, [data, tab, search]);

  const s = data?.summary;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#86868B", maxWidth: 640 }}>
          Inscrits en attente dont le profil n&apos;est pas complet : ils ne sont pas sélectionnables pour un projet tant qu&apos;il manque des champs. Le cron relance à J+2, puis tous les 5 jours, 3 fois maximum, puis met le compte en pause.
        </p>
        <button onClick={load} disabled={loading} style={btnGhost}>Actualiser</button>
      </div>

      {s && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          <Stat label="Profils incomplets" value={s.total - s.paused} />
          <Stat label="À relancer au prochain cron" value={s.due} accent />
          <Stat label="Relancés, en attente" value={s.cooldown} />
          <Stat label="3 relances envoyées" value={s.exhausted} />
          <Stat label="Mis en pause" value={s.paused} />
        </div>
      )}

      <Message msg={msg} />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PROFILE_TABS.map((t) => {
            const count = t.value === "all" ? (s ? s.total : 0) : (s ? s[t.value] : 0);
            return <TabButton key={t.value} label={t.label} count={count} active={tab === t.value} onClick={() => setTab(t.value)} />;
          })}
        </div>
        <SearchInput value={search} onChange={setSearch} />
      </div>

      {loading && !data ? (
        <div style={{ textAlign: "center", padding: 40, color: "#86868B" }}>Chargement…</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 40, color: "#b91c1c" }}>{error}</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa", color: "#86868B", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {["Testeur", "Inscrit", "Profil", "Relances", "État", "Prochaine action", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#86868B" }}>Aucun testeur dans cette vue.</td></tr>
              )}
              {rows.map((r) => {
                const meta = PROFILE_STATE_META[r.state];
                const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
                const canRemind = r.state !== "paused" && r.reminder_count < (data?.max ?? 3);
                return (
                  <tr key={r.id} style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <TesterCell name={name} email={r.email} sub={[r.job_title, r.sector].filter(Boolean).join(" · ")} onOpen={() => setDrawerId(r.id)} />
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "#6e6e73" }}>{fmtDate(r.created_at)}<div style={{ fontSize: 11, color: "#86868B" }}>il y a {daysAgo(r.created_at)} j</div></td>
                    <td style={{ padding: "12px 14px", minWidth: 200 }}>
                      <div style={{ fontWeight: 600, color: "#1d1d1f" }}>{r.missing_count} champ{r.missing_count > 1 ? "s" : ""} manquant{r.missing_count > 1 ? "s" : ""}</div>
                      <div style={{ fontSize: 11, color: "#86868B", lineHeight: 1.4 }} title={r.missing_labels.join(", ")}>
                        {r.missing_labels.slice(0, 3).join(", ")}{r.missing_labels.length > 3 ? `, +${r.missing_labels.length - 3}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 700 }}>{r.reminder_count}</span><span style={{ color: "#86868B" }}> / {data?.max ?? 3}</span>
                      <div style={{ fontSize: 11, color: "#86868B" }}>{r.reminder_sent_at ? `dernière : ${fmtDate(r.reminder_sent_at)}` : "jamais relancé"}</div>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span title={meta.hint} style={{ display: "inline-block", padding: "3px 10px", borderRadius: 980, fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.fg }}>{meta.label}</span>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "#6e6e73" }}>
                      {r.state === "due" ? "Prochain cron" : r.state === "exhausted" ? `Pause le ${fmtDate(r.next_at)}` : r.state === "paused" ? "Aucune" : `Relance le ${fmtDate(r.next_at)}`}
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", textAlign: "right" }}>
                      {canRemind && (
                        <button onClick={() => remindNow(r)} disabled={busyId === r.id} style={{ ...btnPrimary, opacity: busyId === r.id ? 0.6 : 1 }}>
                          {busyId === r.id ? "Envoi…" : "Relancer maintenant"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TesterDrawer testerId={drawerId} onClose={(action) => { setDrawerId(null); if (action.type !== "unchanged") load(); }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vue 2 : disponibilite                                               */
/* ------------------------------------------------------------------ */

type AvailStateKind = "due" | "cooldown" | "exhausted" | "paused";
type Engagement = "available" | "to_remind" | "dormant";

interface AvailRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  sector: string | null;
  city: string | null;
  status: string;
  created_at: string;
  last_activity_at: string;
  engagement: Engagement;
  missions_completed: number;
  responded_at: string | null;
  reminder_count: number;
  reminder_sent_at: string | null;
  state: AvailStateKind;
  next_at: string | null;
}

interface AvailPayload {
  summary: Record<"total" | "dormant" | AvailStateKind, number>;
  rows: AvailRow[];
  max: number;
  cooldown_days: number;
}

const AVAIL_STATE_META: Record<AvailStateKind, { label: string; hint: string; bg: string; fg: string }> = {
  due: { label: "À relancer", hint: "Partira au prochain passage du cron (lundi 9h)", bg: "#f5f5f7", fg: "#1d1d1f" },
  cooldown: { label: "Relancé", hint: "Prochaine relance 14 jours après la dernière", bg: "#eef4ff", fg: "#1d4ed8" },
  exhausted: { label: "3 relances envoyées", hint: "Sera mis en pause 14 jours après la dernière", bg: "#fef2f2", fg: "#b91c1c" },
  paused: { label: "Mis en pause", hint: "Désactivé après 3 relances sans réponse. Un clic « Oui » depuis l'email le réactive.", bg: "#f1f1f3", fg: "#6e6e73" },
};

const AVAIL_TABS: { value: AvailStateKind | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "due", label: "À relancer" },
  { value: "cooldown", label: "Relancés" },
  { value: "exhausted", label: "3/3 envoyées" },
  { value: "paused", label: "Mis en pause" },
];

function AvailabilityRemindersView() {
  const [data, setData] = useState<AvailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AvailStateKind | "all">("all");
  const [search, setSearch] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [progress, setProgress] = useState<CampaignProgress | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/testers/availability-reminders", { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function remindNow(row: AvailRow) {
    const label = row.state === "paused"
      ? `Renvoyer le lien de réactivation à ${row.email} ?`
      : `Envoyer maintenant la relance n°${row.reminder_count + 1} à ${row.email} ?`;
    if (!confirm(label)) return;
    setBusyId(row.id);
    setMsg(null);
    try {
      const res = await fetch(`/api/staff/testers/${row.id}/availability-reminder`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error || `Erreur ${res.status}`);
      const warn = (body as { warning?: string }).warning;
      setMsg({ kind: warn ? "err" : "ok", text: warn ? `Envoyé à ${row.email}, mais ${warn}` : `Relance n°${body.reminderNumber} envoyée à ${row.email}.` });
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setBusyId(null);
    }
  }

  async function remindAllDue() {
    const due = data?.summary.due ?? 0;
    if (due === 0) return;
    if (!confirm(`Envoyer maintenant la relance de disponibilité aux ${due} testeur(s) « à relancer » ? Chaque envoi compte dans la boucle de 3.`)) return;
    setBulkBusy(true);
    setMsg(null);
    setProgress(null);
    try {
      const r = await runAvailabilityCampaign({ onProgress: setProgress });
      const problems = r.unmarked + r.errors;
      setMsg({
        kind: problems > 0 ? "err" : "ok",
        text: `${r.sent} email(s) envoyé(s) sur ${r.total}.${r.errors > 0 ? ` ${r.errors} en erreur.` : ""}${r.unmarked > 0 ? ` ${r.unmarked} envoyé(s) mais non marqué(s), à vérifier dans le journal d'audit.` : ""}`,
      });
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setBulkBusy(false);
      setProgress(null);
    }
  }

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (tab !== "all" && r.state !== tab) return false;
      if (!q) return true;
      const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.toLowerCase();
      return name.includes(q) || r.email.toLowerCase().includes(q) || (r.job_title ?? "").toLowerCase().includes(q);
    });
  }, [data, tab, search]);

  const s = data?.summary;
  const max = data?.max ?? 3;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#86868B", maxWidth: 640 }}>
          Actifs au profil complet qui n&apos;ont pas confirmé leur disponibilité : le cron du lundi envoie « êtes-vous toujours disponible ? », 3 fois maximum à 14 jours d&apos;écart, puis met le compte en pause. Toute réponse remet le compteur à zéro et « Oui » réactive un compte en pause.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading} style={btnGhost}>Actualiser</button>
          <button onClick={remindAllDue} disabled={bulkBusy || !s || s.due === 0} style={{ ...btnGhost, color: "#fff", background: "#0A7A5A", border: "none", opacity: bulkBusy || !s || s.due === 0 ? 0.6 : 1 }}>
            {bulkBusy ? (progress ? `Envoi ${progress.done} / ${progress.total}…` : "Préparation…") : `Relancer les « à relancer » (${s?.due ?? 0})`}
          </button>
        </div>
      </div>

      {progress && <ProgressBar progress={progress} />}

      {s && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          <Stat label="Sans dispo confirmée" value={s.total - s.paused} />
          <Stat label="À relancer au prochain cron" value={s.due} accent />
          <Stat label="Relancés, en attente" value={s.cooldown} />
          <Stat label="3 relances envoyées" value={s.exhausted} />
          <Stat label="Mis en pause" value={s.paused} />
          <Stat label="Dormants (> 6 mois)" value={s.dormant} />
        </div>
      )}

      <Message msg={msg} />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {AVAIL_TABS.map((t) => {
            const count = t.value === "all" ? (s ? s.total : 0) : (s ? s[t.value] : 0);
            return <TabButton key={t.value} label={t.label} count={count} active={tab === t.value} onClick={() => setTab(t.value)} />;
          })}
        </div>
        <SearchInput value={search} onChange={setSearch} />
      </div>

      {loading && !data ? (
        <div style={{ textAlign: "center", padding: 40, color: "#86868B" }}>Chargement…</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 40, color: "#b91c1c" }}>{error}</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa", color: "#86868B", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {["Testeur", "Dernière activité", "Missions", "Relances", "État", "Prochaine action", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#86868B" }}>Aucun testeur dans cette vue.</td></tr>
              )}
              {rows.map((r) => {
                const meta = AVAIL_STATE_META[r.state];
                const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
                const canRemind = r.state === "paused" || r.reminder_count < max;
                const inactiveDays = daysAgo(r.last_activity_at);
                return (
                  <tr key={r.id} style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <TesterCell name={name} email={r.email} sub={[r.job_title, r.sector].filter(Boolean).join(" · ")} onOpen={() => setDrawerId(r.id)} />
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "#6e6e73" }}>
                      {fmtDate(r.last_activity_at)}
                      <div style={{ fontSize: 11, color: r.engagement === "dormant" ? "#b91c1c" : "#86868B" }}>
                        il y a {inactiveDays} j{r.engagement === "dormant" ? " · dormant" : ""}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{r.missions_completed}</td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 700 }}>{r.reminder_count}</span><span style={{ color: "#86868B" }}> / {max}</span>
                      <div style={{ fontSize: 11, color: "#86868B" }}>{r.reminder_sent_at ? `dernière : ${fmtDate(r.reminder_sent_at)}` : "jamais relancé"}</div>
                      {r.responded_at && <div style={{ fontSize: 11, color: "#86868B" }}>a répondu le {fmtDate(r.responded_at)}</div>}
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span title={meta.hint} style={{ display: "inline-block", padding: "3px 10px", borderRadius: 980, fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.fg }}>{meta.label}</span>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "#6e6e73" }}>
                      {r.state === "due" ? "Prochain cron" : r.state === "exhausted" ? `Pause le ${fmtDate(r.next_at)}` : r.state === "paused" ? "Aucune" : `Relance le ${fmtDate(r.next_at)}`}
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", textAlign: "right" }}>
                      {canRemind && (
                        <button onClick={() => remindNow(r)} disabled={busyId === r.id} style={{ ...btnPrimary, opacity: busyId === r.id ? 0.6 : 1 }}>
                          {busyId === r.id ? "Envoi…" : r.state === "paused" ? "Renvoyer le lien" : "Relancer maintenant"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TesterDrawer testerId={drawerId} onClose={(action) => { setDrawerId(null); if (action.type !== "unchanged") load(); }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Briques partagees                                                   */
/* ------------------------------------------------------------------ */

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ background: accent ? "#f0faf5" : "#fff", border: `0.5px solid ${accent ? "rgba(10,122,90,0.25)" : "rgba(0,0,0,0.08)"}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ? "#0A7A5A" : "#1d1d1f", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: CampaignProgress }) {
  const pct = progress.total === 0 ? 100 : Math.round((progress.done / progress.total) * 100);
  return (
    <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6e6e73", marginBottom: 6 }}>
        <span>Envoi en cours, par lots de 5. Vous pouvez rester sur la page.</span>
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#1d1d1f" }}>
          {progress.done} / {progress.total} · {progress.sent} envoyé{progress.sent > 1 ? "s" : ""}{progress.errors > 0 ? ` · ${progress.errors} en erreur` : ""}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "#e5e5ea", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#0A7A5A", transition: "width 300ms" }} />
      </div>
    </div>
  );
}

function Message({ msg }: { msg: { kind: "ok" | "err"; text: string } | null }) {
  if (!msg) return null;
  return (
    <div style={{ background: msg.kind === "ok" ? "#f0faf5" : "#fef2f2", border: `1px solid ${msg.kind === "ok" ? "rgba(10,122,90,0.2)" : "rgba(185,28,28,0.2)"}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: msg.kind === "ok" ? "#0A7A5A" : "#b91c1c", fontSize: 13 }}>
      {msg.text}
    </div>
  );
}

function TabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "7px 14px", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#0A7A5A" : "#6e6e73", background: active ? "#f0faf5" : "transparent", border: active ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
      {label} <span style={{ opacity: 0.7 }}>({count})</span>
    </button>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Rechercher nom, email, métier…" style={{ marginLeft: "auto", padding: "8px 14px", fontSize: 13, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980, fontFamily: "inherit", minWidth: 240 }} />
  );
}

function TesterCell({ name, email, sub, onOpen }: { name: string; email: string; sub: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
      <div style={{ fontWeight: 600, color: "#1d1d1f" }}>{name || "Sans nom"}</div>
      <div style={{ color: "#86868B", fontSize: 12 }}>{email}</div>
      {sub && <div style={{ color: "#6e6e73", fontSize: 12 }}>{sub}</div>}
    </button>
  );
}
