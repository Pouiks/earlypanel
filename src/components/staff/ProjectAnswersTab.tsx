"use client";

import { useCallback, useEffect, useState } from "react";

interface Question {
  id: string;
  position: number;
  question_text: string;
}

interface AnswerImage {
  path: string;
  signed_url: string | null;
}

interface Answer {
  question_id: string;
  answer_text: string | null;
  image_urls: string[];
  images: AnswerImage[];
  updated_at: string;
}

interface TesterInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  quality_score: number;
  tier: string;
}

interface Submission {
  id: string;
  tester_id: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  staff_rating: number | null;
  staff_note: string | null;
  tester: TesterInfo;
  answers: Answer[];
}

interface ProjectAnswersTabProps {
  projectId: string;
}

export default function ProjectAnswersTab({ projectId }: ProjectAnswersTabProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/answers`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setSubmissions(data.submissions || []);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  if (loading) {
    return <div style={{ padding: 24, color: "#86868b", fontSize: 13 }}>Chargement…</div>;
  }

  if (submissions.length === 0) {
    return (
      <div style={{
        padding: 40, textAlign: "center", background: "#fff",
        borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)",
      }}>
        <p style={{ fontSize: 14, color: "#86868b", margin: 0 }}>
          Aucune soumission pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      {/* Liste */}
      <div style={{
        background: "#fff", borderRadius: 16,
        border: "0.5px solid rgba(0,0,0,0.08)", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", margin: 0, letterSpacing: "-0.02em" }}>
            Soumissions ({submissions.length})
          </h3>
        </div>
        <div style={{ maxHeight: 600, overflowY: "auto" }}>
          {submissions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "12px 16px",
                background: selectedId === s.id ? "#f0faf5" : "transparent",
                border: "none", borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f" }}>
                {s.tester.first_name} {s.tester.last_name}
              </div>
              <div style={{ fontSize: 11, color: "#86868b", marginTop: 2 }}>
                {s.status === "completed"
                  ? `Soumise · ${s.submitted_at ? new Date(s.submitted_at).toLocaleDateString("fr-FR") : ""}`
                  : "En cours"}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {s.staff_rating != null && (
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 980,
                    background: "#f0faf5", color: "#0A7A5A", fontWeight: 600,
                  }}>★ {s.staff_rating}/5</span>
                )}
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 980,
                  background: "#f5f5f7", color: "#6e6e73", fontWeight: 600,
                }}>Score {s.tester.quality_score}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      {selected ? (
        <SubmissionViewer
          key={selected.id}
          projectId={projectId}
          submission={selected}
          questions={questions}
          onRated={fetchData}
        />
      ) : (
        <div style={{
          background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)",
          padding: 40, textAlign: "center", fontSize: 13, color: "#86868b",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          Sélectionnez une soumission pour afficher le détail
        </div>
      )}
    </div>
  );
}

function SubmissionViewer({
  projectId,
  submission,
  questions,
  onRated,
}: {
  projectId: string;
  submission: Submission;
  questions: Question[];
  onRated: () => void;
}) {
  const alreadyRated = submission.staff_rating != null;
  const [editing, setEditing] = useState(!alreadyRated);
  const [rating, setRating] = useState<number>(submission.staff_rating ?? 0);
  const [note, setNote] = useState<string>(submission.staff_note ?? "");
  const [sloppy, setSloppy] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const answersByQ = new Map<string, Answer>();
  submission.answers.forEach((a) => answersByQ.set(a.question_id, a));

  async function save() {
    if (rating < 1 || rating > 5) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/answers`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_tester_id: submission.id,
          rating,
          note,
          sloppy,
        }),
      });
      if (res.ok) {
        setSavedMsg("Évaluation enregistrée");
        setEditing(false);
        onRated();
      } else {
        const data = await res.json();
        setSavedMsg(data?.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "0.5px solid rgba(0,0,0,0.08)", padding: 24,
    }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
          {submission.tester.first_name} {submission.tester.last_name}
        </h3>
        <p style={{ fontSize: 12, color: "#86868b", margin: 0 }}>
          {submission.tester.email} · Score qualité {submission.tester.quality_score}/100
          {submission.submitted_at && ` · Soumise le ${new Date(submission.submitted_at).toLocaleString("fr-FR")}`}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        {questions.map((q, i) => {
          const a = answersByQ.get(q.id);
          return (
            <div key={q.id} style={{ padding: 14, background: "#f5f5f7", borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", marginBottom: 6 }}>
                {i + 1}. {q.question_text}
              </div>
              <div style={{ fontSize: 13, color: "#1d1d1f", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {a?.answer_text || <em style={{ color: "#86868b" }}>Pas de réponse</em>}
              </div>
              {a?.images && a.images.length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                  gap: 6, marginTop: 10,
                }}>
                  {a.images.map((img) => (
                    <a
                      key={img.path}
                      href={img.signed_url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        aspectRatio: "1", borderRadius: 8, overflow: "hidden",
                        background: "#eee", display: "block",
                      }}
                    >
                      {img.signed_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.signed_url} alt="" style={{
                          width: "100%", height: "100%", objectFit: "cover",
                        }} />
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {submission.status === "completed" && (
        <div style={{
          padding: 16, background: "#fafafa", borderRadius: 12,
          border: "0.5px solid rgba(0,0,0,0.06)",
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", margin: "0 0 12px" }}>
            Évaluation
          </h4>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                disabled={saving || !editing}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: rating >= n ? "#0A7A5A" : "#fff",
                  color: rating >= n ? "#fff" : "#86868b",
                  border: "1px solid rgba(0,0,0,0.1)",
                  cursor: !editing ? "not-allowed" : "pointer",
                  fontSize: 15, fontWeight: 700, fontFamily: "inherit",
                }}
              >
                ★
              </button>
            ))}
            <span style={{ alignSelf: "center", marginLeft: 8, fontSize: 12, color: "#6e6e73" }}>
              {rating > 0 ? `${rating}/5` : "Notez de 1 à 5"}
            </span>
          </div>

          <label style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 12, color: "#1d1d1f", marginBottom: 12,
          }}>
            <input
              type="checkbox"
              checked={sloppy}
              onChange={(e) => setSloppy(e.target.checked)}
              disabled={saving || !editing}
              style={{ accentColor: "#dc2626" }}
            />
            Marquer comme <strong>travail bâclé</strong> (malus -20)
          </label>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note interne (optionnelle)"
            rows={2}
            disabled={saving || !editing}
            style={{
              width: "100%", padding: "10px 12px", fontSize: 13,
              border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10,
              outline: "none", background: "#fff", fontFamily: "inherit",
              boxSizing: "border-box", resize: "vertical", marginBottom: 12,
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {editing ? (
              <button
                onClick={save}
                disabled={saving || rating < 1}
                style={{
                  padding: "10px 20px",
                  background: rating < 1 ? "#d1d5db" : "#0A7A5A",
                  color: "#fff", borderRadius: 980, fontSize: 13, fontWeight: 700,
                  border: "none",
                  cursor: saving || rating < 1 ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Enregistrement…" : alreadyRated ? "Mettre à jour l\u2019évaluation" : "Valider l\u2019évaluation"}
              </button>
            ) : (
              <>
                <span style={{ fontSize: 12, color: "#0A7A5A", fontWeight: 600 }}>
                  ✓ Note appliquée ({submission.staff_rating}/5)
                </span>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    padding: "6px 14px",
                    background: "transparent", color: "#0A7A5A",
                    border: "1px solid #0A7A5A", borderRadius: 980,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Modifier
                </button>
              </>
            )}
            {savedMsg && (
              <span style={{ fontSize: 12, color: "#0A7A5A" }}>{savedMsg}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
