"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ProjectReport, ReportSummary, ReportKeyFigure,
  ReportBug, ReportFriction, ReportFrictionVerbatim,
  ReportRecommendation, ReportImpactEffortMatrix,
  Severity, Impact, Priority, TechEffort,
} from "@/types/staff";
import { useConfirm } from "@/components/ui/ConfirmModal";

interface Props {
  projectId: string;
}

interface PanelTester {
  id: string;
  name: string;
  pt_id: string;
}

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 20,
  border: "0.5px solid rgba(0,0,0,0.08)", padding: "24px", marginBottom: 16,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 14,
  border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10,
  outline: "none", background: "#f5f5f7", fontFamily: "inherit", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#6e6e73",
  marginBottom: 6, letterSpacing: "-0.01em",
};
const smallBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: 12, fontWeight: 600,
  color: "#0A7A5A", background: "#f0faf5",
  border: "1.5px solid #0A7A5A", borderRadius: 980,
  cursor: "pointer", fontFamily: "inherit",
};
const removeBtn: React.CSSProperties = {
  padding: "0 12px", fontSize: 18, color: "#e53e3e",
  background: "#fef2f2", border: "none", borderRadius: 10,
  cursor: "pointer", height: 38,
};
const removeBtnSmall: React.CSSProperties = {
  ...removeBtn, fontSize: 14, padding: "0 8px", height: 30,
};
const subCard: React.CSSProperties = {
  padding: "16px", background: "#fafafa", borderRadius: 12,
  border: "0.5px solid rgba(0,0,0,0.06)", marginBottom: 12,
};

function focus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#0A7A5A";
}
function blur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)";
}

const SEVERITY_LABELS: Record<Severity, string> = { blocking: "Bloquant", major: "Majeur", minor: "Mineur" };
const SEVERITY_COLORS: Record<Severity, { bg: string; text: string }> = {
  blocking: { bg: "#fef2f2", text: "#dc2626" },
  major: { bg: "#fffbeb", text: "#d97706" },
  minor: { bg: "#f5f5f7", text: "#6e6e73" },
};
const IMPACT_LABELS: Record<Impact, string> = { blocking: "Bloquant", slow: "Ralentissant", minor: "Mineur" };
const PRIORITY_LABELS: Record<Priority, { label: string; bg: string; text: string }> = {
  P1: { label: "P1 — Critique", bg: "#fef2f2", text: "#dc2626" },
  P2: { label: "P2 — Important", bg: "#fffbeb", text: "#d97706" },
  P3: { label: "P3 — Souhaitable", bg: "#f5f5f7", text: "#6e6e73" },
};
const EFFORT_LABELS: Record<TechEffort, string> = { low: "Faible", medium: "Moyen", high: "Élevé" };
const MATRIX_QUADRANTS: { key: keyof ReportImpactEffortMatrix; label: string; desc: string; color: string }[] = [
  { key: "quick_wins", label: "Quick wins", desc: "Impact fort · Effort faible", color: "#0A7A5A" },
  { key: "strategic", label: "Stratégique", desc: "Impact fort · Effort élevé", color: "#2563eb" },
  { key: "plan", label: "À planifier", desc: "Impact faible · Effort faible", color: "#d97706" },
  { key: "backlog", label: "Backlog", desc: "Impact faible · Effort élevé", color: "#6e6e73" },
];

let _k = 0;
function nk() { return `_rk${++_k}`; }

type LocalBug = ReportBug & { _key: string };
type LocalVerbatim = ReportFrictionVerbatim & { _key: string };
type LocalFriction = Omit<ReportFriction, "verbatims"> & { _key: string; verbatims: LocalVerbatim[] };
type LocalReco = ReportRecommendation & { _key: string };

interface CheckItem {
  label: string;
  done: boolean;
}

export default function ProjectReportTab({ projectId }: Props) {
  const [report, setReport] = useState<ProjectReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [panel, setPanel] = useState<PanelTester[]>([]);
  const [hoverChecklist, setHoverChecklist] = useState(false);
  const { notify, ConfirmModal } = useConfirm();

  // Summary state
  const [deliveryDate, setDeliveryDate] = useState("");
  const [verdict, setVerdict] = useState("");
  const [keyFigures, setKeyFigures] = useState<ReportKeyFigure[]>([{ value: "", label: "" }]);
  const [topActions, setTopActions] = useState<string[]>([""]);

  // Bugs state
  const [bugs, setBugs] = useState<LocalBug[]>([]);

  // Frictions state
  const [frictions, setFrictions] = useState<LocalFriction[]>([]);

  // Recommendations state
  const [recos, setRecos] = useState<LocalReco[]>([]);

  // Matrix state
  const [matrix, setMatrix] = useState<ReportImpactEffortMatrix>({
    quick_wins: [], strategic: [], plan: [], backlog: [],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, testersRes] = await Promise.all([
        fetch(`/api/staff/projects/${projectId}/report`),
        fetch(`/api/staff/projects/${projectId}/testers`),
      ]);

      if (reportRes.ok) {
        const data: ProjectReport | null = await reportRes.json();
        if (data) {
          setReport(data);
          setDeliveryDate(data.delivery_date ?? "");
          const s = data.summary ?? {};
          setVerdict(s.verdict ?? "");
          setKeyFigures(s.key_figures?.length ? s.key_figures : [{ value: "", label: "" }]);
          setTopActions(s.top_actions?.length ? s.top_actions : [""]);
          setBugs((data.bugs ?? []).map((b) => ({ ...b, _key: nk() })));
          setFrictions((data.frictions ?? []).map((f) => ({
            ...f, _key: nk(),
            verbatims: (f.verbatims ?? []).map((v) => ({ ...v, _key: nk() })),
          })));
          setRecos((data.recommendations ?? []).map((r) => ({ ...r, _key: nk() })));
          setMatrix(data.impact_effort_matrix ?? { quick_wins: [], strategic: [], plan: [], backlog: [] });
        }
      }

      if (testersRes.ok) {
        const ptData: Array<{
          id: string; tester_id: string;
          tester: { id: string; first_name: string | null; last_name: string | null } | null;
        }> = await testersRes.json();
        setPanel(ptData.map((pt) => ({
          id: pt.tester?.id ?? pt.tester_id,
          name: [pt.tester?.first_name, pt.tester?.last_name].filter(Boolean).join(" ") || "Testeur",
          pt_id: pt.id,
        })));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function dirty() { setSaved(false); }

  // --- Summary helpers ---
  function addKeyFigure() { setKeyFigures([...keyFigures, { value: "", label: "" }]); dirty(); }
  function removeKeyFigure(i: number) { setKeyFigures(keyFigures.filter((_, idx) => idx !== i)); dirty(); }
  function updateKeyFigure(i: number, field: "value" | "label", val: string) {
    const n = [...keyFigures]; n[i] = { ...n[i], [field]: val }; setKeyFigures(n); dirty();
  }
  function addTopAction() { setTopActions([...topActions, ""]); dirty(); }
  function removeTopAction(i: number) { setTopActions(topActions.filter((_, idx) => idx !== i)); dirty(); }
  function updateTopAction(i: number, val: string) { const n = [...topActions]; n[i] = val; setTopActions(n); dirty(); }

  // --- Bugs helpers ---
  function addBug() {
    setBugs([...bugs, { _key: nk(), id: crypto.randomUUID(), description: "", device: "", affected_testers: [], severity: "minor", step: "" }]);
    dirty();
  }
  function removeBug(i: number) { setBugs(bugs.filter((_, idx) => idx !== i)); dirty(); }
  function updateBug<K extends keyof ReportBug>(i: number, key: K, val: ReportBug[K]) {
    const n = [...bugs]; n[i] = { ...n[i], [key]: val }; setBugs(n); dirty();
  }
  function toggleBugTester(bugIdx: number, testerId: string) {
    const bug = bugs[bugIdx];
    const current = bug.affected_testers;
    const next = current.includes(testerId) ? current.filter((t) => t !== testerId) : [...current, testerId];
    updateBug(bugIdx, "affected_testers", next);
  }

  // --- Frictions helpers ---
  function addFriction() {
    setFrictions([...frictions, {
      _key: nk(), id: crypto.randomUUID(), title: "", step: "",
      impact: "minor", verbatims: [{ _key: nk(), text: "", tester_id: "" }], analysis: "",
    }]);
    dirty();
  }
  function removeFriction(i: number) { setFrictions(frictions.filter((_, idx) => idx !== i)); dirty(); }
  function updateFriction(i: number, key: string, val: unknown) {
    const n = [...frictions];
    n[i] = { ...n[i], [key]: val };
    setFrictions(n); dirty();
  }
  function addVerbatim(fIdx: number) {
    const n = [...frictions];
    n[fIdx] = { ...n[fIdx], verbatims: [...n[fIdx].verbatims, { _key: nk(), text: "", tester_id: "" }] };
    setFrictions(n); dirty();
  }
  function removeVerbatim(fIdx: number, vIdx: number) {
    const n = [...frictions];
    n[fIdx] = { ...n[fIdx], verbatims: n[fIdx].verbatims.filter((_, idx) => idx !== vIdx) };
    setFrictions(n); dirty();
  }
  function updateVerbatim(fIdx: number, vIdx: number, field: "text" | "tester_id", val: string) {
    const n = [...frictions];
    const verbs = [...n[fIdx].verbatims];
    verbs[vIdx] = { ...verbs[vIdx], [field]: val };
    n[fIdx] = { ...n[fIdx], verbatims: verbs };
    setFrictions(n); dirty();
  }

  // --- Recommendations helpers ---
  function addReco() {
    setRecos([...recos, { _key: nk(), id: crypto.randomUUID(), title: "", priority: "P2", solves: "", impact: "", tech_effort: "medium" }]);
    dirty();
  }
  function removeReco(i: number) {
    const removed = recos[i];
    setRecos(recos.filter((_, idx) => idx !== i));
    const m = { ...matrix };
    for (const qKey of Object.keys(m) as (keyof ReportImpactEffortMatrix)[]) {
      m[qKey] = (m[qKey] ?? []).filter((id) => id !== removed.id);
    }
    setMatrix(m);
    dirty();
  }
  function updateReco(i: number, key: string, val: unknown) {
    const n = [...recos]; n[i] = { ...n[i], [key]: val }; setRecos(n); dirty();
  }

  // --- Matrix helpers ---
  function toggleMatrixReco(quadrant: keyof ReportImpactEffortMatrix, recoId: string) {
    const m = { ...matrix };
    for (const qKey of Object.keys(m) as (keyof ReportImpactEffortMatrix)[]) {
      m[qKey] = (m[qKey] ?? []).filter((id) => id !== recoId);
    }
    const current = matrix[quadrant] ?? [];
    if (!current.includes(recoId)) {
      m[quadrant] = [...(m[quadrant] ?? []), recoId];
    }
    setMatrix(m);
    dirty();
  }
  function getRecoQuadrant(recoId: string): string | null {
    for (const qKey of Object.keys(matrix) as (keyof ReportImpactEffortMatrix)[]) {
      if ((matrix[qKey] ?? []).includes(recoId)) return qKey;
    }
    return null;
  }

  // --- Save ---
  async function handleSave() {
    setSaving(true);
    const summary: ReportSummary = {
      verdict: verdict.trim() || undefined,
      key_figures: keyFigures.filter((kf) => kf.value.trim() || kf.label.trim()),
      top_actions: topActions.filter((a) => a.trim()),
    };

    const cleanBugs: ReportBug[] = bugs
      .filter((b) => b.description.trim())
      .map(({ _key, ...b }) => ({ ...b, description: b.description.trim() }));

    const cleanFrictions: ReportFriction[] = frictions
      .filter((f) => f.title.trim())
      .map(({ _key, verbatims, ...f }) => ({
        ...f, title: f.title.trim(),
        verbatims: verbatims
          .filter((v) => v.text.trim())
          .map((v) => ({ text: v.text, tester_id: v.tester_id })),
      }));

    const cleanRecos: ReportRecommendation[] = recos
      .filter((r) => r.title.trim())
      .map(({ _key, ...r }) => ({ ...r, title: r.title.trim() }));

    const res = await fetch(`/api/staff/projects/${projectId}/report`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delivery_date: deliveryDate || null,
        summary,
        bugs: cleanBugs,
        frictions: cleanFrictions,
        recommendations: cleanRecos,
        impact_effort_matrix: matrix,
      }),
    });

    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setReport(data);
      setSaved(true);
    } else {
      const err = await res.json();
      await notify({ title: "Erreur", message: err.error || "Erreur lors de l'enregistrement" });
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#86868B", fontSize: 14 }}>Chargement…</div>;
  }

  const testerName = (id: string) => panel.find((t) => t.id === id)?.name ?? "Inconnu";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.03em", margin: 0 }}>
            Rapport de mission
          </h2>
          <p style={{ fontSize: 12, color: "#86868B", margin: "4px 0 0" }}>
            {report ? `Dernière sauvegarde : ${new Date(report.updated_at).toLocaleString("fr-FR")}` : "Nouveau rapport — aucune donnée enregistrée."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saved && <span style={{ fontSize: 13, color: "#0A7A5A", fontWeight: 500 }}>Enregistré</span>}
          <button onClick={handleSave} disabled={saving} style={{
            padding: "8px 20px", fontSize: 13, fontWeight: 700, color: "#fff",
            background: "#0A7A5A", border: "none", borderRadius: 980,
            cursor: saving ? "wait" : "pointer", fontFamily: "inherit",
            opacity: saving ? 0.6 : 1, transition: "all 200ms",
          }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: "0 0 14px" }}>Informations générales</h3>
        <div style={{ maxWidth: 300 }}>
          <label style={labelStyle}>Date de livraison</label>
          <input type="date" value={deliveryDate} onChange={(e) => { setDeliveryDate(e.target.value); dirty(); }} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
      </div>

      {/* ========== SUMMARY ========== */}
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px" }}>Synthèse executive</h3>
        <p style={{ fontSize: 12, color: "#86868B", margin: "0 0 18px" }}>Page 2 — verdict global, chiffres clés et actions prioritaires.</p>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Verdict</label>
          <textarea value={verdict} onChange={(e) => { setVerdict(e.target.value); dirty(); }}
            placeholder="Le test a révélé une expérience globalement fonctionnelle mais pénalisée par des frictions significatives…"
            rows={4} style={{ ...inputStyle, resize: "vertical" }} onFocus={focus} onBlur={blur} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Chiffres clés</label>
          {keyFigures.map((kf, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input type="text" value={kf.value} onChange={(e) => updateKeyFigure(i, "value", e.target.value)}
                placeholder="73%" style={{ ...inputStyle, width: 100, flex: "0 0 100px" }} onFocus={focus} onBlur={blur} />
              <input type="text" value={kf.label} onChange={(e) => updateKeyFigure(i, "label", e.target.value)}
                placeholder="de complétion globale" style={{ ...inputStyle, flex: 1 }} onFocus={focus} onBlur={blur} />
              {keyFigures.length > 1 && <button type="button" onClick={() => removeKeyFigure(i)} style={removeBtn}>&times;</button>}
            </div>
          ))}
          <button type="button" onClick={addKeyFigure} style={smallBtn}>+ Chiffre clé</button>
        </div>

        <div>
          <label style={labelStyle}>Actions prioritaires (top 3)</label>
          {topActions.map((action, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <span style={{ minWidth: 28, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", background: "#0A7A5A", borderRadius: 8 }}>{i + 1}</span>
              <input type="text" value={action} onChange={(e) => updateTopAction(i, e.target.value)}
                placeholder={`Action prioritaire ${i + 1}`} style={{ ...inputStyle, flex: 1 }} onFocus={focus} onBlur={blur} />
              {topActions.length > 1 && <button type="button" onClick={() => removeTopAction(i)} style={removeBtn}>&times;</button>}
            </div>
          ))}
          <button type="button" onClick={addTopAction} style={smallBtn}>+ Action</button>
        </div>
      </div>

      {/* ========== BUGS — Page 6 ========== */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>Bugs ({bugs.length})</h3>
          <button type="button" onClick={addBug} style={smallBtn}>+ Bug</button>
        </div>
        <p style={{ fontSize: 12, color: "#86868B", margin: "0 0 16px" }}>Page 6 — bugs techniques rencontrés par les testeurs.</p>

        {bugs.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#86868B", fontSize: 13 }}>
            Aucun bug renseigné. Cliquez &quot;+ Bug&quot; pour en ajouter un.
          </div>
        )}

        {bugs.map((bug, bIdx) => (
          <div key={bug._key} style={subCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  padding: "3px 10px", fontSize: 11, fontWeight: 700, borderRadius: 980,
                  background: SEVERITY_COLORS[bug.severity].bg, color: SEVERITY_COLORS[bug.severity].text,
                }}>
                  {SEVERITY_LABELS[bug.severity]}
                </span>
                <span style={{ fontSize: 12, color: "#86868B" }}>Bug #{bIdx + 1}</span>
              </div>
              <button type="button" onClick={() => removeBug(bIdx)} style={removeBtnSmall}>&times;</button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={bug.description} onChange={(e) => updateBug(bIdx, "description", e.target.value)}
                placeholder="Décrivez le bug observé…" rows={2} style={{ ...inputStyle, resize: "vertical" }} onFocus={focus} onBlur={blur} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Sévérité</label>
                <select value={bug.severity} onChange={(e) => updateBug(bIdx, "severity", e.target.value as Severity)}
                  style={{ ...inputStyle, cursor: "pointer" }} onFocus={focus} onBlur={blur}>
                  <option value="minor">Mineur</option>
                  <option value="major">Majeur</option>
                  <option value="blocking">Bloquant</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Device / contexte</label>
                <input type="text" value={bug.device ?? ""} onChange={(e) => updateBug(bIdx, "device", e.target.value)}
                  placeholder="Safari iOS 17" style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={labelStyle}>Étape</label>
                <input type="text" value={bug.step ?? ""} onChange={(e) => updateBug(bIdx, "step", e.target.value)}
                  placeholder="Inscription > Étape 2" style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Testeurs affectés ({bug.affected_testers.length}/{panel.length})</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {panel.map((t) => {
                  const selected = bug.affected_testers.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => toggleBugTester(bIdx, t.id)} style={{
                      padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 980,
                      border: selected ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
                      background: selected ? "#f0faf5" : "#fff",
                      color: selected ? "#0A7A5A" : "#6e6e73",
                      cursor: "pointer", fontFamily: "inherit", transition: "all 150ms",
                    }}>
                      {t.name}
                    </button>
                  );
                })}
                {panel.length === 0 && <span style={{ fontSize: 12, color: "#86868B" }}>Aucun testeur dans le panel</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========== FRICTIONS — Pages 7-8 ========== */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>Frictions ({frictions.length})</h3>
          <button type="button" onClick={addFriction} style={smallBtn}>+ Friction</button>
        </div>
        <p style={{ fontSize: 12, color: "#86868B", margin: "0 0 16px" }}>Pages 7-8 — points de friction UX identifiés, avec verbatims testeurs et analyse.</p>

        {frictions.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#86868B", fontSize: 13 }}>
            Aucune friction renseignée. Cliquez &quot;+ Friction&quot; pour en ajouter une.
          </div>
        )}

        {frictions.map((fr, fIdx) => (
          <div key={fr._key} style={subCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f" }}>Friction #{fIdx + 1}</span>
              <button type="button" onClick={() => removeFriction(fIdx)} style={removeBtnSmall}>&times;</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Titre</label>
                <input type="text" value={fr.title} onChange={(e) => updateFriction(fIdx, "title", e.target.value)}
                  placeholder="Le formulaire d'inscription est confus" style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={labelStyle}>Étape</label>
                <input type="text" value={fr.step ?? ""} onChange={(e) => updateFriction(fIdx, "step", e.target.value)}
                  placeholder="Inscription > Étape 2" style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Impact</label>
                <select value={fr.impact} onChange={(e) => updateFriction(fIdx, "impact", e.target.value as Impact)}
                  style={{ ...inputStyle, cursor: "pointer" }} onFocus={focus} onBlur={blur}>
                  <option value="minor">Mineur</option>
                  <option value="slow">Ralentissant</option>
                  <option value="blocking">Bloquant</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Testeurs touchés</label>
                <input type="number" value={fr.affected_count ?? ""} onChange={(e) => updateFriction(fIdx, "affected_count", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="8" style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={labelStyle}>% du panel</label>
                <input type="number" value={fr.panel_percentage ?? ""} onChange={(e) => updateFriction(fIdx, "panel_percentage", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="53" style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Analyse</label>
              <textarea value={fr.analysis ?? ""} onChange={(e) => updateFriction(fIdx, "analysis", e.target.value)}
                placeholder="Les utilisateurs peinent à identifier le champ de recherche…"
                rows={3} style={{ ...inputStyle, resize: "vertical" }} onFocus={focus} onBlur={blur} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ ...labelStyle, margin: 0 }}>Verbatims ({fr.verbatims.length})</label>
                <button type="button" onClick={() => addVerbatim(fIdx)} style={{ ...smallBtn, fontSize: 11, padding: "4px 10px" }}>+ Verbatim</button>
              </div>
              {fr.verbatims.map((v, vIdx) => (
                <div key={v._key} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <select value={v.tester_id} onChange={(e) => updateVerbatim(fIdx, vIdx, "tester_id", e.target.value)}
                    style={{ ...inputStyle, width: 160, flex: "0 0 160px", cursor: "pointer", fontSize: 12 }} onFocus={focus} onBlur={blur}>
                    <option value="">— Testeur —</option>
                    {panel.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input type="text" value={v.text} onChange={(e) => updateVerbatim(fIdx, vIdx, "text", e.target.value)}
                    placeholder="« Je ne comprenais pas où cliquer… »" style={{ ...inputStyle, flex: 1, fontSize: 13, fontStyle: "italic" }} onFocus={focus} onBlur={blur} />
                  {fr.verbatims.length > 1 && <button type="button" onClick={() => removeVerbatim(fIdx, vIdx)} style={removeBtnSmall}>&times;</button>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ========== RECOMMENDATIONS — Page 10 ========== */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>Recommandations ({recos.length})</h3>
          <button type="button" onClick={addReco} style={smallBtn}>+ Recommandation</button>
        </div>
        <p style={{ fontSize: 12, color: "#86868B", margin: "0 0 16px" }}>Page 10 — actions à mettre en place, classées par priorité et effort technique.</p>

        {recos.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#86868B", fontSize: 13 }}>
            Aucune recommandation. Cliquez &quot;+ Recommandation&quot; pour commencer.
          </div>
        )}

        {recos.map((reco, rIdx) => {
          const p = PRIORITY_LABELS[reco.priority];
          return (
            <div key={reco._key} style={subCard}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "3px 10px", fontSize: 11, fontWeight: 700, borderRadius: 980, background: p.bg, color: p.text }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: 12, color: "#86868B" }}>Reco #{rIdx + 1}</span>
                </div>
                <button type="button" onClick={() => removeReco(rIdx)} style={removeBtnSmall}>&times;</button>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Titre</label>
                <input type="text" value={reco.title} onChange={(e) => updateReco(rIdx, "title", e.target.value)}
                  placeholder="Simplifier le formulaire d'inscription en 2 étapes" style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Priorité</label>
                  <select value={reco.priority} onChange={(e) => updateReco(rIdx, "priority", e.target.value as Priority)}
                    style={{ ...inputStyle, cursor: "pointer" }} onFocus={focus} onBlur={blur}>
                    <option value="P1">P1 — Critique</option>
                    <option value="P2">P2 — Important</option>
                    <option value="P3">P3 — Souhaitable</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Effort technique</label>
                  <select value={reco.tech_effort} onChange={(e) => updateReco(rIdx, "tech_effort", e.target.value as TechEffort)}
                    style={{ ...inputStyle, cursor: "pointer" }} onFocus={focus} onBlur={blur}>
                    <option value="low">Faible</option>
                    <option value="medium">Moyen</option>
                    <option value="high">Élevé</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Résout quel problème</label>
                  <input type="text" value={reco.solves ?? ""} onChange={(e) => updateReco(rIdx, "solves", e.target.value)}
                    placeholder="Friction #2 — formulaire confus" style={inputStyle} onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Impact attendu</label>
                  <input type="text" value={reco.impact ?? ""} onChange={(e) => updateReco(rIdx, "impact", e.target.value)}
                    placeholder="+20% de complétion sur l'inscription" style={inputStyle} onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========== IMPACT/EFFORT MATRIX — Page 11 ========== */}
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px" }}>Matrice impact / effort</h3>
        <p style={{ fontSize: 12, color: "#86868B", margin: "0 0 18px" }}>Page 11 — classez chaque recommandation dans un quadrant.</p>

        {recos.filter((r) => r.title.trim()).length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#86868B", fontSize: 13 }}>
            Ajoutez des recommandations ci-dessus pour alimenter la matrice.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {MATRIX_QUADRANTS.map((q) => (
              <div key={q.key} style={{
                padding: 16, borderRadius: 12, border: `1.5px solid ${q.color}22`,
                background: `${q.color}08`, minHeight: 100,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: q.color, marginBottom: 2 }}>{q.label}</div>
                <div style={{ fontSize: 11, color: "#86868B", marginBottom: 12 }}>{q.desc}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {recos.filter((r) => r.title.trim()).map((reco, rIdx) => {
                    const inThisQuadrant = (matrix[q.key] ?? []).includes(reco.id);
                    const currentQ = getRecoQuadrant(reco.id);
                    const isElsewhere = currentQ !== null && currentQ !== q.key;
                    return (
                      <button
                        key={reco.id}
                        type="button"
                        onClick={() => toggleMatrixReco(q.key, reco.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 10px", borderRadius: 8,
                          border: inThisQuadrant ? `1.5px solid ${q.color}` : "1px solid rgba(0,0,0,0.08)",
                          background: inThisQuadrant ? `${q.color}15` : "#fff",
                          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                          opacity: isElsewhere ? 0.4 : 1,
                          transition: "all 150ms",
                        }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: inThisQuadrant ? `2px solid ${q.color}` : "1.5px solid rgba(0,0,0,0.15)",
                          background: inThisQuadrant ? q.color : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, color: "#fff", fontWeight: 700,
                        }}>
                          {inThisQuadrant && "✓"}
                        </span>
                        <span style={{ fontSize: 12, color: "#1d1d1f", fontWeight: 500 }}>
                          #{recos.findIndex((r) => r.id === reco.id) + 1} {reco.title}
                        </span>
                        <span style={{
                          marginLeft: "auto", fontSize: 10, fontWeight: 600, borderRadius: 980, padding: "2px 6px",
                          background: PRIORITY_LABELS[reco.priority].bg, color: PRIORITY_LABELS[reco.priority].text,
                        }}>
                          {reco.priority}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== EXPORT ========== */}
      {(() => {
        const checks: CheckItem[] = [
          { label: "Date de livraison", done: !!deliveryDate.trim() },
          { label: "Verdict (synthèse executive)", done: !!verdict.trim() },
          { label: "Au moins 1 chiffre clé", done: keyFigures.some((kf) => kf.value.trim() && kf.label.trim()) },
          { label: "Au moins 1 action prioritaire", done: topActions.some((a) => a.trim()) },
          { label: "Au moins 1 friction renseignée", done: frictions.some((f) => f.title.trim()) },
          { label: "Au moins 1 recommandation", done: recos.some((r) => r.title.trim()) },
          { label: "Matrice impact/effort remplie", done: Object.values(matrix).some((arr) => arr.length > 0) },
        ];
        const missing = checks.filter((c) => !c.done);
        const allDone = missing.length === 0;

        return (
          <div style={{
            ...card,
            background: allDone ? "#f0faf5" : "#f5f5f7",
            border: allDone ? "1.5px solid rgba(10,122,90,0.2)" : "1.5px solid rgba(0,0,0,0.08)",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px" }}>Export &amp; Livrables</h3>
            <p style={{ fontSize: 12, color: "#86868B", margin: "0 0 16px" }}>
              {allDone
                ? "Toutes les étapes sont complètes. Vous pouvez générer le rapport."
                : `${missing.length} étape${missing.length > 1 ? "s" : ""} manquante${missing.length > 1 ? "s" : ""} avant de pouvoir générer le rapport.`}
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ position: "relative" }}
                onMouseEnter={() => setHoverChecklist(true)}
                onMouseLeave={() => setHoverChecklist(false)}
              >
                <a
                  href={allDone ? `/api/staff/projects/${projectId}/export?format=json` : undefined}
                  download={allDone ? true : undefined}
                  onClick={allDone ? undefined : (e) => e.preventDefault()}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 20px", fontSize: 13, fontWeight: 700,
                    color: allDone ? "#fff" : "#86868B",
                    background: allDone ? "#0A7A5A" : "#e5e5e5",
                    border: "none", borderRadius: 980, textDecoration: "none",
                    cursor: allDone ? "pointer" : "default",
                    fontFamily: "inherit", transition: "all 200ms",
                  }}
                >
                  Générer le rapport
                </a>

                {hoverChecklist && !allDone && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", left: 0,
                    background: "#fff", borderRadius: 14, padding: "16px 20px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "0.5px solid rgba(0,0,0,0.08)",
                    minWidth: 280, zIndex: 50,
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f", margin: "0 0 10px" }}>
                      Checklist du rapport
                    </p>
                    {checks.map((c, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 0", fontSize: 13,
                        color: c.done ? "#0A7A5A" : "#e53e3e",
                      }}>
                        <span style={{ fontSize: 14 }}>{c.done ? "✓" : "✗"}</span>
                        <span style={{
                          fontWeight: c.done ? 400 : 600,
                          textDecoration: c.done ? "line-through" : "none",
                          opacity: c.done ? 0.6 : 1,
                        }}>
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <a
                href={`/api/staff/projects/${projectId}/export?format=csv`}
                download
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", fontSize: 13, fontWeight: 700,
                  color: "#1d1d1f", background: "#fff",
                  border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
                  textDecoration: "none", cursor: "pointer", fontFamily: "inherit",
                  transition: "all 200ms",
                }}
              >
                Télécharger le CSV réponses
              </a>
            </div>
          </div>
        );
      })()}
      <ConfirmModal />
    </div>
  );
}
