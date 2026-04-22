"use client";

import { useState } from "react";
import type { ProjectQuestion } from "@/types/staff";

interface ProjectQuestionsTabProps {
  projectId: string;
  questions: ProjectQuestion[];
  onUpdate: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 14,
  border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10,
  outline: "none", background: "#f5f5f7", fontFamily: "inherit", boxSizing: "border-box",
};

export default function ProjectQuestionsTab({ projectId, questions: initialQuestions, onUpdate }: ProjectQuestionsTabProps) {
  const [questions, setQuestions] = useState<string[]>(
    initialQuestions.length ? initialQuestions.map((q) => q.question_text) : [""]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addQuestion() { setQuestions([...questions, ""]); setSaved(false); }
  function removeQuestion(i: number) { setQuestions(questions.filter((_, idx) => idx !== i)); setSaved(false); }
  function updateQuestion(i: number, val: string) {
    const next = [...questions];
    next[i] = val;
    setQuestions(next);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const filtered = questions.filter((q) => q.trim());
    await fetch(`/api/staff/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: filtered.map((q) => ({ question_text: q.trim() })),
      }),
    });
    setSaving(false);
    setSaved(true);
    onUpdate();
  }

  return (
    <div>
      <div style={{
        background: "#fff", borderRadius: 20,
        border: "0.5px solid rgba(0,0,0,0.08)", padding: "28px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20,
        }}>
          <h2 style={{
            fontSize: 17, fontWeight: 700, color: "#1d1d1f",
            letterSpacing: "-0.03em", margin: 0,
          }}>
            Questions du test ({questions.filter((q) => q.trim()).length})
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saved && (
              <span style={{ fontSize: 13, color: "#0A7A5A", fontWeight: 500 }}>
                Enregistré
              </span>
            )}
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

        {questions.map((q, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
            <span style={{
              minWidth: 28, height: 38, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 700,
              color: "#0A7A5A", background: "#f0faf5", borderRadius: 8,
            }}>
              {i + 1}
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => updateQuestion(i, e.target.value)}
              placeholder={`Question ${i + 1}`}
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
            {questions.length > 1 && (
              <button type="button" onClick={() => removeQuestion(i)} style={{
                padding: "0 14px", fontSize: 18, color: "#e53e3e",
                background: "#fef2f2", border: "none", borderRadius: 10,
                cursor: "pointer", height: 38, transition: "all 150ms",
              }}>
                &times;
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addQuestion} style={{
          padding: "8px 18px", fontSize: 13, fontWeight: 600,
          color: "#0A7A5A", background: "#f0faf5",
          border: "1.5px solid #0A7A5A", borderRadius: 980,
          cursor: "pointer", fontFamily: "inherit", marginTop: 4,
        }}>
          + Ajouter une question
        </button>
      </div>
    </div>
  );
}
