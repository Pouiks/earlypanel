"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------
// Rapport de mission — vue CONSULTABLE et IMPRIMABLE (→ PDF).
// Agrège les données via l'export JSON existant (/export?format=json) et
// les rend mises en page. Le bouton "Télécharger en PDF" déclenche
// window.print() ; le print CSS masque la sidebar/header et les contrôles.
// ---------------------------------------------------------------------

type KeyFigure = { value: string; label: string };
type Bug = {
  id: string; description: string; device?: string; step?: string;
  severity: "blocking" | "major" | "minor"; affected_testers_readable?: string[];
};
type Verbatim = { text: string; tester_readable?: string };
type Friction = {
  id: string; title: string; step?: string; impact: "blocking" | "slow" | "minor";
  affected_count?: number; panel_percentage?: number; analysis?: string; verbatims?: Verbatim[];
};
type Reco = {
  id: string; title: string; priority: "P1" | "P2" | "P3";
  solves?: string; impact?: string; tech_effort: "low" | "medium" | "high";
};
type Matrix = { quick_wins?: string[]; strategic?: string[]; plan?: string[]; backlog?: string[] };
type PanelRow = {
  readable_id: string; gender: string; age: number | null; city: string | null;
  digital_level: string | null; device_summary: string; job_title: string | null; sector: string | null;
};
interface ReportExport {
  project: {
    title: string; company_name: string | null; sector: string | null;
    start_date: string | null; end_date: string | null;
    business_objective: string | null; scope_included: string[]; scope_excluded: string[];
    client_guidelines: string | null; test_type: string; audit_enabled: boolean;
    audit_scores?: { performance: number | null; accessibility: number | null; seo: number | null; best_practices: number | null };
    audit_findings?: string[];
  };
  panel: PanelRow[];
  panel_stats: { total: number; avg_age: number | null; gender_distribution: Record<string, number>; digital_level_distribution: Record<string, number> };
  use_cases: { title: string; task_wording: string | null; expected_testers_count: number | null; criteria: { label: string; is_primary: boolean }[]; questions: { question_text: string }[] }[];
  report: {
    delivery_date: string | null;
    summary: { verdict?: string; key_figures?: KeyFigure[]; top_actions?: string[] } | null;
    bugs: Bug[]; frictions: Friction[]; recommendations: Reco[]; impact_effort_matrix: Matrix;
  } | null;
}

const SEVERITY = {
  blocking: { label: "Bloquant", bg: "#fef2f2", color: "#dc2626" },
  major: { label: "Majeur", bg: "#fffbeb", color: "#d97706" },
  minor: { label: "Mineur", bg: "#f5f5f7", color: "#6e6e73" },
};
const IMPACT = { blocking: "Bloquant", slow: "Ralentissant", minor: "Mineur" };
const PRIORITY = {
  P1: { label: "P1 — Critique", bg: "#fef2f2", color: "#dc2626" },
  P2: { label: "P2 — Important", bg: "#fffbeb", color: "#d97706" },
  P3: { label: "P3 — Souhaitable", bg: "#f5f5f7", color: "#6e6e73" },
};
const EFFORT = { low: "Effort faible", medium: "Effort moyen", high: "Effort élevé" };
const QUADRANTS: { key: keyof Matrix; label: string; desc: string; color: string }[] = [
  { key: "quick_wins", label: "Quick wins", desc: "Impact fort · Effort faible", color: "#0A7A5A" },
  { key: "strategic", label: "Stratégique", desc: "Impact fort · Effort élevé", color: "#2563eb" },
  { key: "plan", label: "À planifier", desc: "Impact faible · Effort faible", color: "#d97706" },
  { key: "backlog", label: "Backlog", desc: "Impact faible · Effort élevé", color: "#6e6e73" },
];

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ReportViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ReportExport | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [exportRes, metaRes] = await Promise.all([
        fetch(`/api/staff/projects/${id}/export?format=json`),
        fetch(`/api/staff/projects/${id}/report`),
      ]);
      if (!exportRes.ok) { setError(true); return; }
      setData(await exportRes.json());
      if (metaRes.ok) {
        const meta = await metaRes.json();
        setPublishedAt(meta?.published_at ?? null);
        setStatus(meta?.status ?? "draft");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#86868B" }}>Chargement du rapport…</div>;
  if (error || !data) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <p style={{ color: "#b91c1c", marginBottom: 16 }}>Impossible de charger le rapport.</p>
        <Link href={`/staff/dashboard/projects/${id}`} style={{ color: "#0A7A5A" }}>← Retour au projet</Link>
      </div>
    );
  }

  const r = data.report;
  const recoById = new Map((r?.recommendations ?? []).map((x) => [x.id, x]));
  const published = status === "published";

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      {/* Barre de contrôle (non imprimée) */}
      <div className="no-print" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 12, flexWrap: "wrap", marginBottom: 20,
      }}>
        <Link href={`/staff/dashboard/projects/${id}`} style={{ fontSize: 13, color: "#86868B", textDecoration: "none" }}>
          ← Retour au projet
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 980,
            background: published ? "#D1FAE5" : "#F1F1F3", color: published ? "#065F46" : "#6E6E73",
          }}>
            {published ? `Livré le ${fmtDate(publishedAt)}` : "Brouillon"}
          </span>
          <button onClick={() => window.print()} style={{
            padding: "9px 20px", fontSize: 13, fontWeight: 700, color: "#fff",
            background: "#0A7A5A", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
          }}>
            Télécharger en PDF
          </button>
        </div>
      </div>

      {!r && (
        <div style={{ padding: 40, textAlign: "center", background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)" }}>
          <p style={{ color: "#86868B", margin: 0 }}>Le rapport n&apos;a pas encore été rédigé pour ce projet.</p>
          <Link className="no-print" href={`/staff/dashboard/projects/${id}`} style={{ color: "#0A7A5A", fontSize: 13, display: "inline-block", marginTop: 12 }}>
            Rédiger le rapport →
          </Link>
        </div>
      )}

      {r && (
        <div className="report-doc" style={{ background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)", padding: "48px 56px", color: "#1d1d1f" }}>
          {/* ===== Couverture ===== */}
          <section style={{ borderBottom: "2px solid #0A7A5A", paddingBottom: 24, marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0A7A5A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Rapport de test utilisateur
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 10px" }}>{data.project.title}</h1>
            <div style={{ fontSize: 15, color: "#6e6e73" }}>
              {data.project.company_name && <span>{data.project.company_name}</span>}
              {data.project.sector && <span> · {data.project.sector}</span>}
            </div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 16, fontSize: 13, color: "#6e6e73" }}>
              <span><strong style={{ color: "#1d1d1f" }}>Méthodologie :</strong> {data.project.test_type === "moderated" ? "Test modéré" : "Test non modéré"}</span>
              <span><strong style={{ color: "#1d1d1f" }}>Panel :</strong> {data.panel_stats.total} testeur{data.panel_stats.total > 1 ? "s" : ""}</span>
              <span><strong style={{ color: "#1d1d1f" }}>Période :</strong> {fmtDate(data.project.start_date)} → {fmtDate(data.project.end_date)}</span>
              <span><strong style={{ color: "#1d1d1f" }}>Livré le :</strong> {fmtDate(r.delivery_date ?? publishedAt)}</span>
            </div>
          </section>

          {/* ===== Contexte ===== */}
          {(data.project.business_objective || data.project.scope_included?.length > 0 || data.project.client_guidelines) && (
            <Section title="Contexte">
              {data.project.business_objective && (
                <Block label="Pourquoi ce test">{data.project.business_objective}</Block>
              )}
              {(data.project.scope_included?.length > 0 || data.project.scope_excluded?.length > 0) && (
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginTop: 12 }}>
                  {data.project.scope_included?.length > 0 && (
                    <div><strong style={{ fontSize: 13 }}>Dans le périmètre</strong>
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 14 }}>{data.project.scope_included.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}
                  {data.project.scope_excluded?.length > 0 && (
                    <div><strong style={{ fontSize: 13 }}>Hors périmètre</strong>
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 14, color: "#6e6e73" }}>{data.project.scope_excluded.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
              {data.project.client_guidelines && <Block label="Consignes du client">{data.project.client_guidelines}</Block>}
            </Section>
          )}

          {/* ===== Synthèse ===== */}
          {r.summary && (r.summary.verdict || r.summary.key_figures?.length || r.summary.top_actions?.length) && (
            <Section title="Synthèse">
              {r.summary.verdict && <p style={{ fontSize: 15, lineHeight: 1.7, margin: "0 0 20px" }}>{r.summary.verdict}</p>}
              {(r.summary.key_figures?.length ?? 0) > 0 && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
                  {r.summary.key_figures!.filter((k) => k.value || k.label).map((kf, i) => (
                    <div key={i} style={{ flex: "1 1 140px", background: "#f0faf5", borderRadius: 12, padding: "16px 18px" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: "#0A7A5A" }}>{kf.value}</div>
                      <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 2 }}>{kf.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {(r.summary.top_actions?.length ?? 0) > 0 && (
                <div>
                  <strong style={{ fontSize: 13 }}>Actions prioritaires</strong>
                  <ol style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
                    {r.summary.top_actions!.filter(Boolean).map((a, i) => <li key={i}>{a}</li>)}
                  </ol>
                </div>
              )}
            </Section>
          )}

          {/* ===== Panel ===== */}
          <Section title={`Panel de test (${data.panel_stats.total})`}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#6e6e73", marginBottom: 14 }}>
              {data.panel_stats.avg_age != null && <span>Âge moyen : <strong style={{ color: "#1d1d1f" }}>{data.panel_stats.avg_age} ans</strong></span>}
              {Object.entries(data.panel_stats.digital_level_distribution).map(([k, v]) => <span key={k}>{k} : <strong style={{ color: "#1d1d1f" }}>{v}</strong></span>)}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#f5f5f7" }}>
                    {["ID", "Genre", "Âge", "Ville", "Niveau", "Métier", "Configuration"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.panel.map((p) => (
                    <tr key={p.readable_id} style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0A7A5A" }}>{p.readable_id}</td>
                      <td style={{ padding: "8px 10px" }}>{p.gender}</td>
                      <td style={{ padding: "8px 10px" }}>{p.age ?? "—"}</td>
                      <td style={{ padding: "8px 10px" }}>{p.city ?? "—"}</td>
                      <td style={{ padding: "8px 10px" }}>{p.digital_level ?? "—"}</td>
                      <td style={{ padding: "8px 10px" }}>{p.job_title ?? "—"}</td>
                      <td style={{ padding: "8px 10px", color: "#6e6e73" }}>{p.device_summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ===== Scénarios testés ===== */}
          {data.use_cases.length > 0 && (
            <Section title="Scénarios testés">
              {data.use_cases.map((uc, i) => (
                <div key={i} style={{ marginBottom: 18, breakInside: "avoid" }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{i + 1}. {uc.title}</div>
                  {uc.task_wording && <p style={{ fontSize: 14, color: "#6e6e73", margin: "4px 0 8px", lineHeight: 1.6 }}>{uc.task_wording}</p>}
                  {uc.criteria.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
                      {uc.criteria.map((c, j) => <li key={j} style={{ fontWeight: c.is_primary ? 700 : 400 }}>{c.label}{c.is_primary ? " (critère principal)" : ""}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* ===== Bugs ===== */}
          {r.bugs.length > 0 && (
            <Section title={`Bugs (${r.bugs.length})`}>
              {r.bugs.map((b) => (
                <div key={b.id} style={{ ...itemCard, breakInside: "avoid" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <Pill bg={SEVERITY[b.severity].bg} color={SEVERITY[b.severity].color}>{SEVERITY[b.severity].label}</Pill>
                    {(b.affected_testers_readable?.length ?? 0) > 0 && (
                      <span style={{ fontSize: 12, color: "#6e6e73" }}>{b.affected_testers_readable!.join(", ")}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{b.description}</div>
                  {(b.device || b.step) && (
                    <div style={{ fontSize: 12, color: "#86868B", marginTop: 6 }}>
                      {b.step && <span>Étape : {b.step}</span>}{b.step && b.device && " · "}{b.device && <span>{b.device}</span>}
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* ===== Frictions ===== */}
          {r.frictions.length > 0 && (
            <Section title={`Frictions UX (${r.frictions.length})`}>
              {r.frictions.map((f) => (
                <div key={f.id} style={{ ...itemCard, breakInside: "avoid" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{f.title}</span>
                    <Pill bg="#eef2ff" color="#3730a3">{IMPACT[f.impact]}</Pill>
                    {f.panel_percentage != null && <span style={{ fontSize: 12, color: "#6e6e73" }}>{f.panel_percentage}% du panel{f.affected_count != null ? ` (${f.affected_count})` : ""}</span>}
                  </div>
                  {f.step && <div style={{ fontSize: 12, color: "#86868B", marginBottom: 6 }}>Étape : {f.step}</div>}
                  {f.analysis && <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>{f.analysis}</p>}
                  {(f.verbatims?.length ?? 0) > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {f.verbatims!.filter((v) => v.text).map((v, i) => (
                        <div key={i} style={{ borderLeft: "3px solid #0A7A5A", paddingLeft: 12, fontSize: 13.5, fontStyle: "italic", color: "#3f3f46" }}>
                          « {v.text} » {v.tester_readable && <span style={{ fontStyle: "normal", color: "#86868B" }}>— {v.tester_readable}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* ===== Recommandations ===== */}
          {r.recommendations.length > 0 && (
            <Section title={`Recommandations (${r.recommendations.length})`}>
              {r.recommendations.map((reco) => (
                <div key={reco.id} style={{ ...itemCard, breakInside: "avoid" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <Pill bg={PRIORITY[reco.priority].bg} color={PRIORITY[reco.priority].color}>{PRIORITY[reco.priority].label}</Pill>
                    <span style={{ fontSize: 12, color: "#6e6e73" }}>{EFFORT[reco.tech_effort]}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{reco.title}</div>
                  {reco.solves && <div style={{ fontSize: 13, color: "#6e6e73", marginTop: 4 }}>Résout : {reco.solves}</div>}
                  {reco.impact && <div style={{ fontSize: 13, color: "#0A7A5A", marginTop: 2 }}>Impact attendu : {reco.impact}</div>}
                </div>
              ))}
            </Section>
          )}

          {/* ===== Matrice impact/effort ===== */}
          {Object.values(r.impact_effort_matrix ?? {}).some((a) => (a?.length ?? 0) > 0) && (
            <Section title="Matrice impact / effort">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {QUADRANTS.map((q) => {
                  const ids = r.impact_effort_matrix[q.key] ?? [];
                  return (
                    <div key={q.key} style={{ padding: 14, borderRadius: 12, border: `1.5px solid ${q.color}33`, background: `${q.color}0a`, breakInside: "avoid" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: q.color }}>{q.label}</div>
                      <div style={{ fontSize: 11, color: "#86868B", marginBottom: 8 }}>{q.desc}</div>
                      {ids.length === 0 ? <div style={{ fontSize: 12, color: "#c4c4c8" }}>—</div> : (
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                          {ids.map((rid) => <li key={rid}>{recoById.get(rid)?.title ?? "—"}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ===== Audit (optionnel) ===== */}
          {data.project.audit_enabled && data.project.audit_scores && (
            <Section title="Audit technique">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                {([["Performance", data.project.audit_scores.performance], ["Accessibilité", data.project.audit_scores.accessibility], ["SEO", data.project.audit_scores.seo], ["Best practices", data.project.audit_scores.best_practices]] as const).map(([label, score]) => (
                  <div key={label} style={{ flex: "1 1 120px", background: "#f5f5f7", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: (score ?? 0) >= 90 ? "#0A7A5A" : (score ?? 0) >= 50 ? "#d97706" : "#dc2626" }}>{score ?? "—"}</div>
                    <div style={{ fontSize: 12, color: "#6e6e73" }}>{label}</div>
                  </div>
                ))}
              </div>
              {(data.project.audit_findings?.length ?? 0) > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
                  {data.project.audit_findings!.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              )}
            </Section>
          )}

          <div style={{ marginTop: 40, paddingTop: 16, borderTop: "0.5px solid rgba(0,0,0,0.08)", fontSize: 11, color: "#c4c4c8", textAlign: "center" }}>
            earlypanel · Rapport de test utilisateur · {data.project.title}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .staff-sidebar-desktop { display: none !important; }
          .staff-content { margin-left: 0 !important; padding: 0 !important; }
          header { display: none !important; }
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-doc { border: none !important; border-radius: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const itemCard: React.CSSProperties = {
  background: "#fafafa", border: "0.5px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: "14px 16px", marginBottom: 12,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32, breakInside: "avoid" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 14px", color: "#1d1d1f" }}>{title}</h2>
      {children}
    </section>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>{children}</p>
    </div>
  );
}

function Pill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return <span style={{ padding: "3px 10px", fontSize: 11, fontWeight: 700, borderRadius: 980, background: bg, color }}>{children}</span>;
}
