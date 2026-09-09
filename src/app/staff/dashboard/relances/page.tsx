"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TesterDrawer from "@/components/staff/TesterDrawer";

/**
 * Page staff « Relances profil » : qui est en attente de completion, ou en
 * est le cron de relance pour chacun, et bouton pour relancer a la main.
 * Source : GET /api/staff/testers/profile-reminders.
 */

type StateKind = "too_recent" | "due" | "cooldown" | "exhausted" | "paused";

interface Row {
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
  state: StateKind;
  next_at: string | null;
}

interface Payload {
  summary: Record<"total" | StateKind, number>;
  rows: Row[];
  max: number;
}

const STATE_META: Record<StateKind, { label: string; hint: string; bg: string; fg: string }> = {
  due: { label: "À relancer", hint: "Partira au prochain passage du cron (9h)", bg: "#f5f5f7", fg: "#1d1d1f" },
  too_recent: { label: "Trop récent", hint: "Inscrit depuis moins de 2 jours", bg: "#f5f5f7", fg: "#6e6e73" },
  cooldown: { label: "Relancé", hint: "Prochaine relance après 5 jours", bg: "#eef4ff", fg: "#1d4ed8" },
  exhausted: { label: "3 relances envoyées", hint: "Sera mis en pause 5 jours après la dernière", bg: "#fef2f2", fg: "#b91c1c" },
  paused: { label: "Mis en pause", hint: "Désactivé après 3 relances sans réponse", bg: "#f1f1f3", fg: "#6e6e73" },
};

const TABS: { value: StateKind | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "due", label: "À relancer" },
  { value: "cooldown", label: "Relancés" },
  { value: "exhausted", label: "3/3 envoyées" },
  { value: "too_recent", label: "Trop récents" },
  { value: "paused", label: "Mis en pause" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "Aucune";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function StaffRelancesPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StateKind | "all">("all");
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

  async function remindNow(row: Row) {
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", margin: 0 }}>
            Relances profil
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#86868B", maxWidth: 640 }}>
            Inscrits en attente dont le profil n&apos;est pas complet : ils ne sont pas sélectionnables pour un projet tant qu&apos;il manque des champs. Le cron relance à J+2, puis tous les 5 jours, 3 fois maximum, puis met le compte en pause.
          </p>
        </div>
        <button onClick={load} disabled={loading} style={{ padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#0A7A5A", background: "#f0faf5", border: "1px solid rgba(10,122,90,0.25)", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
          Actualiser
        </button>
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

      {msg && (
        <div style={{ background: msg.kind === "ok" ? "#f0faf5" : "#fef2f2", border: `1px solid ${msg.kind === "ok" ? "rgba(10,122,90,0.2)" : "rgba(185,28,28,0.2)"}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: msg.kind === "ok" ? "#0A7A5A" : "#b91c1c", fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const count = t.value === "all" ? (s ? s.total : 0) : (s ? s[t.value] : 0);
            const active = tab === t.value;
            return (
              <button key={t.value} onClick={() => setTab(t.value)} style={{ padding: "7px 14px", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#0A7A5A" : "#6e6e73", background: active ? "#f0faf5" : "transparent", border: active ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
                {t.label} <span style={{ opacity: 0.7 }}>({count})</span>
              </button>
            );
          })}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher nom, email, métier…" style={{ marginLeft: "auto", padding: "8px 14px", fontSize: 13, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980, fontFamily: "inherit", minWidth: 240 }} />
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
                const meta = STATE_META[r.state];
                const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
                const canRemind = r.state !== "paused" && r.reminder_count < (data?.max ?? 3);
                return (
                  <tr key={r.id} style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <button onClick={() => setDrawerId(r.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                        <div style={{ fontWeight: 600, color: "#1d1d1f" }}>{name || "Sans nom"}</div>
                        <div style={{ color: "#86868B", fontSize: 12 }}>{r.email}</div>
                        {(r.job_title || r.sector) && <div style={{ color: "#6e6e73", fontSize: 12 }}>{[r.job_title, r.sector].filter(Boolean).join(" · ")}</div>}
                      </button>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "#6e6e73" }}>{fmtDate(r.created_at)}<div style={{ fontSize: 11, color: "#86868B" }}>il y a {daysAgo(r.created_at)} j</div></td>
                    <td style={{ padding: "12px 14px", minWidth: 200 }}>
                      <div style={{ fontWeight: 600, color: r.missing_count > 8 ? "#1d1d1f" : "#1d1d1f" }}>{r.missing_count} champ{r.missing_count > 1 ? "s" : ""} manquant{r.missing_count > 1 ? "s" : ""}</div>
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
                        <button onClick={() => remindNow(r)} disabled={busyId === r.id} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#fff", background: "#0A7A5A", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit", opacity: busyId === r.id ? 0.6 : 1 }}>
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

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ background: accent ? "#f0faf5" : "#fff", border: `0.5px solid ${accent ? "rgba(10,122,90,0.25)" : "rgba(0,0,0,0.08)"}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ? "#0A7A5A" : "#1d1d1f", marginTop: 4 }}>{value}</div>
    </div>
  );
}
