"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectUseCase } from "@/types/staff";
import { useConfirm } from "@/components/ui/ConfirmModal";

interface ProjectQuestionsTabProps {
  projectId: string;
  questions: { id: string; question_text: string }[];
  onUpdate: () => void;
}

interface LocalCriterion {
  _key: string;
  id?: string;
  label: string;
  is_primary: boolean;
  order: number;
}

interface LocalQuestion {
  _key: string;
  id?: string;
  question_text: string;
  question_hint: string;
  position: number;
}

interface LocalUseCase {
  _key: string;
  id?: string;
  title: string;
  task_wording: string;
  order: number;
  expected_testers_count: string;
  criteria: LocalCriterion[];
  questions: LocalQuestion[];
  collapsed: boolean;
}

let keyCounter = 0;
function nextKey() { return `_k${++keyCounter}`; }

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

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "#0A7A5A";
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)";
}

export default function ProjectQuestionsTab({ projectId, onUpdate }: ProjectQuestionsTabProps) {
  const [useCases, setUseCases] = useState<LocalUseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { notify, ConfirmModal } = useConfirm();

  const fetchUseCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/use-cases`);
      if (res.ok) {
        const data: ProjectUseCase[] = await res.json();
        setUseCases(
          data.map((uc) => ({
            _key: nextKey(),
            id: uc.id,
            title: uc.title,
            task_wording: uc.task_wording ?? "",
            order: uc.order,
            expected_testers_count: uc.expected_testers_count?.toString() ?? "",
            collapsed: false,
            criteria: (uc.criteria ?? []).map((c) => ({
              _key: nextKey(),
              id: c.id,
              label: c.label,
              is_primary: c.is_primary,
              order: c.order,
            })),
            questions: (uc.questions ?? []).map((q) => ({
              _key: nextKey(),
              id: q.id,
              question_text: q.question_text,
              question_hint: q.question_hint ?? "",
              position: q.position,
            })),
          }))
        );
      }
    } catch { /* retry */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchUseCases(); }, [fetchUseCases]);

  function addUseCase() {
    setUseCases([
      ...useCases,
      {
        _key: nextKey(),
        title: "",
        task_wording: "",
        order: useCases.length,
        expected_testers_count: "",
        criteria: [{ _key: nextKey(), label: "", is_primary: true, order: 0 }],
        questions: [{ _key: nextKey(), question_text: "", question_hint: "", position: 0 }],
        collapsed: false,
      },
    ]);
    setSaved(false);
  }

  function removeUseCase(i: number) {
    setUseCases(useCases.filter((_, idx) => idx !== i));
    setSaved(false);
  }

  function updateUc<K extends keyof LocalUseCase>(i: number, key: K, val: LocalUseCase[K]) {
    const next = [...useCases];
    next[i] = { ...next[i], [key]: val };
    setUseCases(next);
    setSaved(false);
  }

  function addCriterion(ucIdx: number) {
    const uc = useCases[ucIdx];
    updateUc(ucIdx, "criteria", [
      ...uc.criteria,
      { _key: nextKey(), label: "", is_primary: false, order: uc.criteria.length },
    ]);
  }

  function removeCriterion(ucIdx: number, cIdx: number) {
    const uc = useCases[ucIdx];
    updateUc(ucIdx, "criteria", uc.criteria.filter((_, idx) => idx !== cIdx));
  }

  function updateCriterion(ucIdx: number, cIdx: number, key: keyof LocalCriterion, val: string | boolean) {
    const uc = useCases[ucIdx];
    const next = [...uc.criteria];
    if (key === "is_primary" && val === true) {
      next.forEach((c, i) => { next[i] = { ...c, is_primary: i === cIdx }; });
    } else {
      next[cIdx] = { ...next[cIdx], [key]: val };
    }
    updateUc(ucIdx, "criteria", next);
  }

  function addQuestion(ucIdx: number) {
    const uc = useCases[ucIdx];
    updateUc(ucIdx, "questions", [
      ...uc.questions,
      { _key: nextKey(), question_text: "", question_hint: "", position: uc.questions.length },
    ]);
  }

  function removeQuestion(ucIdx: number, qIdx: number) {
    const uc = useCases[ucIdx];
    updateUc(ucIdx, "questions", uc.questions.filter((_, idx) => idx !== qIdx));
  }

  function updateQuestion(ucIdx: number, qIdx: number, key: keyof LocalQuestion, val: string) {
    const uc = useCases[ucIdx];
    const next = [...uc.questions];
    next[qIdx] = { ...next[qIdx], [key]: val };
    updateUc(ucIdx, "questions", next);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      use_cases: useCases.map((uc, i) => ({
        id: uc.id || undefined,
        title: uc.title.trim() || `Cas d'usage ${i + 1}`,
        task_wording: uc.task_wording.trim() || null,
        order: i,
        expected_testers_count: uc.expected_testers_count ? parseInt(uc.expected_testers_count) : null,
        criteria: uc.criteria
          .filter((c) => c.label.trim())
          .map((c, ci) => ({
            label: c.label.trim(),
            is_primary: c.is_primary,
            order: ci,
          })),
        questions: uc.questions
          .filter((q) => q.question_text.trim())
          .map((q, qi) => ({
            question_text: q.question_text.trim(),
            question_hint: q.question_hint.trim() || null,
            position: qi,
          })),
      })),
    };

    const res = await fetch(`/api/staff/projects/${projectId}/use-cases`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (res.ok) {
      setSaved(true);
      await fetchUseCases();
      onUpdate();
    } else {
      const err = await res.json();
      await notify({ title: "Erreur", message: err.error || "Erreur lors de l'enregistrement" });
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#86868B", fontSize: 14 }}>Chargement…</div>;
  }

  const totalQ = useCases.reduce((s, uc) => s + uc.questions.filter((q) => q.question_text.trim()).length, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.03em", margin: 0 }}>
            Cas d&apos;usage &amp; questions ({useCases.length} cas · {totalQ} questions)
          </h2>
          <p style={{ fontSize: 12, color: "#86868B", margin: "4px 0 0" }}>
            Chaque cas d&apos;usage regroupe un scénario testeur, des critères de succès et des questions.
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
            {saving ? "Enregistrement…" : "Enregistrer tout"}
          </button>
        </div>
      </div>

      {useCases.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: 48, color: "#86868B" }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", marginBottom: 8 }}>Aucun cas d&apos;usage</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Créez votre premier cas d&apos;usage pour structurer le test.</p>
          <button onClick={addUseCase} style={{ ...smallBtn, padding: "10px 24px", fontSize: 14 }}>
            + Créer un cas d&apos;usage
          </button>
        </div>
      )}

      {useCases.map((uc, ucIdx) => (
        <div key={uc._key} style={card}>
          {/* UC Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: uc.collapsed ? 0 : 20 }}>
            <button
              type="button"
              onClick={() => updateUc(ucIdx, "collapsed", !uc.collapsed)}
              style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
            >
              <span style={{
                width: 28, height: 28, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 13, fontWeight: 700,
                color: "#0A7A5A", background: "#f0faf5", borderRadius: 8,
              }}>
                {ucIdx + 1}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f" }}>
                {uc.title || `Cas d'usage ${ucIdx + 1}`}
              </span>
              <span style={{ fontSize: 12, color: "#86868B" }}>
                ({uc.questions.filter((q) => q.question_text.trim()).length} q · {uc.criteria.filter((c) => c.label.trim()).length} critères)
              </span>
              <span style={{ fontSize: 12, color: "#86868B", transition: "transform 200ms", transform: uc.collapsed ? "rotate(-90deg)" : "rotate(0)" }}>▼</span>
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {useCases.length > 1 && (
                <button type="button" onClick={() => removeUseCase(ucIdx)} style={{ ...removeBtn, fontSize: 13, padding: "4px 12px", height: "auto" }}>
                  Supprimer
                </button>
              )}
            </div>
          </div>

          {!uc.collapsed && (
            <>
              {/* UC Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Titre du cas d&apos;usage</label>
                  <input
                    type="text" value={uc.title}
                    onChange={(e) => updateUc(ucIdx, "title", e.target.value)}
                    placeholder="Ex: S'inscrire et compléter son profil"
                    style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Testeurs attendus</label>
                  <input
                    type="number" value={uc.expected_testers_count}
                    onChange={(e) => updateUc(ucIdx, "expected_testers_count", e.target.value)}
                    placeholder="15"
                    style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Brief testeur (consigne)</label>
                <textarea
                  value={uc.task_wording}
                  onChange={(e) => updateUc(ucIdx, "task_wording", e.target.value)}
                  placeholder="Vous lancez votre activité et avez entendu parler de… Inscrivez-vous et complétez votre profil."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={focusBorder} onBlur={blurBorder}
                />
              </div>

              {/* Criteria */}
              <div style={{ marginBottom: 20, padding: "16px", background: "#fafafa", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f" }}>Critères de succès</span>
                  <button type="button" onClick={() => addCriterion(ucIdx)} style={smallBtn}>+ Critère</button>
                </div>
                {uc.criteria.length === 0 && (
                  <p style={{ fontSize: 12, color: "#86868B", margin: 0 }}>Aucun critère. Le taux de complétion ne sera pas calculable.</p>
                )}
                {uc.criteria.map((c, cIdx) => (
                  <div key={c._key} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", minWidth: 70, fontSize: 11, color: c.is_primary ? "#0A7A5A" : "#86868B", fontWeight: 600 }}>
                      <input
                        type="radio"
                        name={`primary_${uc._key}`}
                        checked={c.is_primary}
                        onChange={() => updateCriterion(ucIdx, cIdx, "is_primary", true)}
                        style={{ accentColor: "#0A7A5A" }}
                      />
                      Principal
                    </label>
                    <input
                      type="text" value={c.label}
                      onChange={(e) => updateCriterion(ucIdx, cIdx, "label", e.target.value)}
                      placeholder="J'ai réussi à…"
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={focusBorder} onBlur={blurBorder}
                    />
                    {uc.criteria.length > 1 && (
                      <button type="button" onClick={() => removeCriterion(ucIdx, cIdx)} style={removeBtn}>&times;</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Questions */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f" }}>Questions</span>
                  <button type="button" onClick={() => addQuestion(ucIdx)} style={smallBtn}>+ Question</button>
                </div>
                {uc.questions.map((q, qIdx) => (
                  <div key={q._key} style={{ marginBottom: 12, padding: "12px", background: "#f5f5f7", borderRadius: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{
                        minWidth: 24, height: 36, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 12, fontWeight: 700,
                        color: "#0A7A5A", background: "#e0f5ec", borderRadius: 6,
                      }}>
                        {qIdx + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text" value={q.question_text}
                          onChange={(e) => updateQuestion(ucIdx, qIdx, "question_text", e.target.value)}
                          placeholder={`Question ${qIdx + 1}`}
                          style={{ ...inputStyle, marginBottom: 6 }}
                          onFocus={focusBorder} onBlur={blurBorder}
                        />
                        <input
                          type="text" value={q.question_hint}
                          onChange={(e) => updateQuestion(ucIdx, qIdx, "question_hint", e.target.value)}
                          placeholder="Conseil de rédaction (optionnel) — aide le testeur à mieux répondre"
                          style={{ ...inputStyle, fontSize: 12, background: "#fff", border: "0.5px dashed rgba(0,0,0,0.12)" }}
                          onFocus={focusBorder} onBlur={blurBorder}
                        />
                      </div>
                      {uc.questions.length > 1 && (
                        <button type="button" onClick={() => removeQuestion(ucIdx, qIdx)} style={removeBtn}>&times;</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ))}

      <button onClick={addUseCase} style={{ ...smallBtn, padding: "10px 24px", fontSize: 14, marginTop: 4 }}>
        + Ajouter un cas d&apos;usage
      </button>
      <ConfirmModal />
    </div>
  );
}
