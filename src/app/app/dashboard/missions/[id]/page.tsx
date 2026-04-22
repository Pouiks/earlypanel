"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import CountdownTimer from "@/components/ui/CountdownTimer";
import ImageUploader from "@/components/mission/ImageUploader";

interface UploadedImage { path: string; signed_url: string | null }
interface MissionAnswer {
  question_id: string;
  answer_text: string | null;
  images: UploadedImage[];
}
interface MissionDetail {
  tester_id: string;
  tester_status: string;
  nda_signed_at: string | null;
  completed_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  malus_applied: boolean;
  malus_nda_unsigned_applied?: boolean;
  project_read_only?: boolean;
  project: {
    id: string;
    title: string;
    description: string | null;
    company_name: string | null;
    sector: string | null;
    urls: string[];
    start_date: string | null;
    end_date: string | null;
    ref_number: string | null;
    status: string;
  };
  questions: { id: string; position: number; question_text: string }[];
  answers: MissionAnswer[];
}

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: "0.5px solid rgba(0,0,0,0.08)",
  padding: "24px 28px",
  marginBottom: 16,
};

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}
function isNotStartedYet(startDate: string | null): boolean {
  if (!startDate) return false;
  return new Date(startDate) > new Date();
}

export default function MissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showStartModal, setShowStartModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Draft local per question
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [imagesByQ, setImagesByQ] = useState<Record<string, UploadedImage[]>>({});
  const [savingMap, setSavingMap] = useState<Record<string, "idle" | "saving" | "saved">>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchMission = useCallback(async () => {
    try {
      const res = await fetch(`/api/testers/missions/${projectId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur");
        return;
      }
      const data: MissionDetail = await res.json();
      setMission(data);
      const draftsInit: Record<string, string> = {};
      const imagesInit: Record<string, UploadedImage[]> = {};
      data.answers.forEach((a) => {
        draftsInit[a.question_id] = a.answer_text || "";
        imagesInit[a.question_id] = a.images || [];
      });
      setDrafts(draftsInit);
      setImagesByQ(imagesInit);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMission();
  }, [fetchMission]);

  async function saveAnswer(questionId: string, text: string) {
    setSavingMap((m) => ({ ...m, [questionId]: "saving" }));
    try {
      const res = await fetch(`/api/testers/missions/${projectId}/answers`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question_id: questionId, answer_text: text }),
      });
      if (res.ok) {
        setSavingMap((m) => ({ ...m, [questionId]: "saved" }));
        setTimeout(() => {
          setSavingMap((m) => ({ ...m, [questionId]: "idle" }));
        }, 1500);
      } else {
        setSavingMap((m) => ({ ...m, [questionId]: "idle" }));
      }
    } catch {
      setSavingMap((m) => ({ ...m, [questionId]: "idle" }));
    }
  }

  function handleDraftChange(questionId: string, text: string) {
    setDrafts((d) => ({ ...d, [questionId]: text }));
    if (saveTimers.current[questionId]) clearTimeout(saveTimers.current[questionId]);
    saveTimers.current[questionId] = setTimeout(() => {
      saveAnswer(questionId, text);
    }, 2000);
  }

  function handleDraftBlur(questionId: string) {
    if (saveTimers.current[questionId]) {
      clearTimeout(saveTimers.current[questionId]);
      delete saveTimers.current[questionId];
    }
    saveAnswer(questionId, drafts[questionId] || "");
  }

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`/api/testers/missions/${projectId}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur démarrage");
        return;
      }
      setShowStartModal(false);
      await fetchMission();
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Flush tous les drafts non sauvegardes
      await Promise.all(
        Object.entries(drafts).map(([qid, text]) => saveAnswer(qid, text))
      );

      const res = await fetch(`/api/testers/missions/${projectId}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Erreur soumission");
        return;
      }
      setShowSubmitModal(false);
      await fetchMission();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "#86868B", fontSize: 14 }}>
        Chargement…
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
          Accès refusé
        </h2>
        <p style={{ fontSize: 14, color: "#86868B", margin: "0 0 20px" }}>
          {error || "Cette mission n'est pas accessible."}
        </p>
        <button
          onClick={() => router.push("/app/dashboard/missions")}
          style={{
            padding: "12px 28px", background: "#0A7A5A", color: "#fff",
            borderRadius: 980, fontSize: 14, fontWeight: 700,
            border: "none", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Retour aux missions
        </button>
      </div>
    );
  }

  const { project, questions } = mission;
  const expired = isExpired(project.end_date);
  const notStarted = isNotStartedYet(project.start_date);
  const status = mission.tester_status;
  const readOnlyMission = mission.project_read_only === true;
  const canStart = !readOnlyMission && !expired && !notStarted && (status === "nda_signed" || status === "invited");
  const inProgress = !readOnlyMission && status === "in_progress" && !expired;
  const completed = status === "completed";

  const totalAnswered = questions.filter((q) => (drafts[q.id] || "").trim().length > 0).length;
  const allAnswered = totalAnswered === questions.length;

  return (
    <div>
      <button
        onClick={() => router.push("/app/dashboard/missions")}
        style={{
          background: "none", border: "none", color: "#0A7A5A",
          fontSize: 14, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", padding: 0, marginBottom: 16,
        }}
      >
        &larr; Retour aux missions
      </button>

      {/* Header */}
      <div style={{
        ...sectionStyle,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: "#1d1d1f",
            margin: "0 0 4px", letterSpacing: "-0.04em",
          }}>
            {project.title}
          </h1>
          <p style={{ fontSize: 14, color: "#86868B", margin: 0 }}>
            {project.company_name || ""}
            {project.ref_number ? ` · ${project.ref_number}` : ""}
            {project.sector ? ` · ${project.sector}` : ""}
          </p>
          {(project.start_date || project.end_date) && (
            <p style={{ fontSize: 13, color: "#86868B", margin: "8px 0 0" }}>
              {project.start_date && `Du ${new Date(project.start_date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}`}
              {project.end_date && ` au ${new Date(project.end_date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}`}
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {completed ? (
            <span style={{
              padding: "6px 14px", borderRadius: 980, fontSize: 12, fontWeight: 600,
              color: "#0A7A5A", background: "#f0faf5",
            }}>Soumise {mission.submitted_at ? `le ${new Date(mission.submitted_at).toLocaleDateString("fr-FR")}` : ""}</span>
          ) : expired ? (
            <span style={{
              padding: "6px 14px", borderRadius: 980, fontSize: 12, fontWeight: 700,
              color: "#fff", background: "#dc2626",
            }}>Délai dépassé</span>
          ) : notStarted ? (
            <>
              <span style={{
                padding: "6px 14px", borderRadius: 980, fontSize: 12, fontWeight: 600,
                color: "#6e6e73", background: "#f5f5f7",
              }}>Démarre bientôt</span>
              {project.start_date && (
                <CountdownTimer target={project.start_date} prefix="Dans" />
              )}
            </>
          ) : (
            <>
              <span style={{
                padding: "6px 14px", borderRadius: 980, fontSize: 12, fontWeight: 600,
                color: inProgress ? "#0A7A5A" : "#0A7A5A",
                background: "#f0faf5",
              }}>{inProgress ? "En cours" : "Active"}</span>
              {project.end_date && (
                <CountdownTimer target={project.end_date} prefix="Clôture dans" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Banniere situation */}
      {expired && !completed && (
        <div style={{
          background: "#fef2f2", borderRadius: 12, padding: "14px 20px",
          marginBottom: 16, border: "1px solid #fecaca",
        }}>
          <p style={{ fontSize: 13, color: "#dc2626", margin: 0, fontWeight: 600 }}>
            La mission a expiré. Vous ne pouvez plus y répondre.
            {mission.malus_applied && " Un malus de qualité a été appliqué."}
          </p>
        </div>
      )}

      {notStarted && (
        <div style={{
          background: "#fffbeb", borderRadius: 12, padding: "14px 20px",
          marginBottom: 16, border: "1px solid #fde68a",
        }}>
          <p style={{ fontSize: 13, color: "#92400e", margin: 0, fontWeight: 500 }}>
            La mission n&apos;a pas encore commencé. Le bouton de démarrage sera disponible à l&apos;heure indiquée.
          </p>
        </div>
      )}

      {readOnlyMission && completed && (
        <div style={{
          background: "#f5f5f7", borderRadius: 12, padding: "14px 20px",
          marginBottom: 16, border: "1px solid rgba(0,0,0,0.08)",
        }}>
          <p style={{ fontSize: 13, color: "#6e6e73", margin: 0, fontWeight: 500 }}>
            Ce projet n&apos;est plus actif. Vous consultez votre mission terminée en lecture seule.
          </p>
        </div>
      )}

      {completed && (
        <div style={{
          background: "#f0faf5", borderRadius: 12, padding: "14px 20px",
          marginBottom: 16, border: "1px solid rgba(10,122,90,0.25)",
        }}>
          <p style={{ fontSize: 13, color: "#0A7A5A", margin: 0, fontWeight: 600 }}>
            Mission soumise. Vos réponses sont en attente de validation par l&apos;équipe.
          </p>
        </div>
      )}

      {/* Description */}
      {project.description && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 14px" }}>
            Description de la mission
          </h2>
          <div
            style={{ fontSize: 14, lineHeight: 1.7, color: "#1d1d1f" }}
            dangerouslySetInnerHTML={{ __html: project.description }}
          />
        </div>
      )}

      {/* URLs */}
      {project.urls && project.urls.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 14px" }}>
            URLs à tester
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {project.urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 16px", background: "#f0faf5",
                  borderRadius: 12, fontSize: 14, color: "#0A7A5A",
                  fontWeight: 500, textDecoration: "none",
                  border: "1px solid rgba(10,122,90,0.15)",
                  transition: "all 200ms", wordBreak: "break-all",
                }}
              >
                <span style={{ fontSize: 16 }}>&#128279;</span>
                {url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Bouton demarrer si applicable */}
      {!inProgress && !completed && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
            Démarrer le test
          </h2>
          <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 16px" }}>
            Une fois démarré, vous devrez compléter toutes les réponses avant la clôture. L&apos;action est irréversible.
          </p>
          {expired ? (
            <button
              disabled
              style={{
                padding: "14px 28px", background: "#dc2626", color: "#fff",
                borderRadius: 980, fontSize: 14, fontWeight: 700,
                border: "none", cursor: "not-allowed", fontFamily: "inherit",
                opacity: 0.95,
              }}
            >
              Délai dépassé
            </button>
          ) : (
            <button
              disabled={!canStart}
              onClick={() => setShowStartModal(true)}
              style={{
                padding: "14px 28px",
                background: canStart ? "#0A7A5A" : "#d1d5db",
                color: "#fff", borderRadius: 980, fontSize: 14, fontWeight: 700,
                border: "none", cursor: canStart ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {notStarted ? "Non disponible" : "Démarrer le test"}
            </button>
          )}
        </div>
      )}

      {/* Formulaire reponses */}
      {(inProgress || completed) && questions.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>
              Vos réponses ({totalAnswered} / {questions.length})
            </h2>
            {inProgress && (
              <span style={{ fontSize: 12, color: "#86868b" }}>
                Auto-save activé · 3 images max par question
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {questions.map((q, i) => {
              const savingState = savingMap[q.id] || "idle";
              const text = drafts[q.id] || "";
              const imgs = imagesByQ[q.id] || [];
              return (
                <div
                  key={q.id}
                  style={{
                    padding: 16, background: "#f5f5f7", borderRadius: 14,
                  }}
                >
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <span style={{
                      minWidth: 28, height: 28, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#0A7A5A",
                      background: "#fff", borderRadius: 8,
                    }}>{i + 1}</span>
                    <p style={{ fontSize: 14, color: "#1d1d1f", margin: 0, lineHeight: 1.5, fontWeight: 600, flex: 1 }}>
                      {q.question_text}
                    </p>
                    {inProgress && (
                      <span style={{ fontSize: 11, color: savingState === "saved" ? "#0A7A5A" : "#86868b" }}>
                        {savingState === "saving" && "Sauvegarde…"}
                        {savingState === "saved" && "✓ Enregistré"}
                      </span>
                    )}
                  </div>

                  <textarea
                    value={text}
                    onChange={(e) => handleDraftChange(q.id, e.target.value)}
                    onBlur={() => handleDraftBlur(q.id)}
                    disabled={!inProgress}
                    placeholder="Décrivez le comportement rencontré le plus précisément possible"
                    rows={5}
                    style={{
                      width: "100%", padding: "12px 14px", fontSize: 14,
                      border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10,
                      outline: "none", background: inProgress ? "#fff" : "#fafafa",
                      fontFamily: "inherit", boxSizing: "border-box",
                      resize: "vertical", lineHeight: 1.5, color: "#1d1d1f",
                    }}
                  />

                  <div style={{ marginTop: 12 }}>
                    <ImageUploader
                      missionId={projectId}
                      questionId={q.id}
                      images={imgs}
                      onChange={(next) => setImagesByQ((m) => ({ ...m, [q.id]: next }))}
                      disabled={!inProgress}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {inProgress && (
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              {!allAnswered && (
                <span style={{ fontSize: 12, color: "#d97706" }}>
                  Toutes les questions doivent être remplies avant soumission.
                </span>
              )}
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={!allAnswered}
                style={{
                  padding: "14px 28px",
                  background: allAnswered ? "#0A7A5A" : "#d1d5db",
                  color: "#fff", borderRadius: 980, fontSize: 14, fontWeight: 700,
                  border: "none", cursor: allAnswered ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                Soumettre ma mission
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal demarrage */}
      {showStartModal && (
        <Modal
          title="Démarrer le test ?"
          onClose={() => !starting && setShowStartModal(false)}
        >
          <div style={{ padding: "12px 20px 0 20px" }}>
            <ul style={{ margin: "0 0 16px 18px", padding: 0, color: "#1d1d1f", fontSize: 14, lineHeight: 1.6 }}>
              <li>Le test démarre maintenant et ne peut plus être annulé.</li>
              <li>Vous devez compléter toutes les réponses avant la clôture.</li>
              <li>
                <strong>Travail bâclé non payé</strong> : des points de qualité seront retirés
                et, en cas de récidive, vous pourrez être suspendu·e des missions.
              </li>
              <li>Assurez-vous d&apos;avoir lu la description et ouvert les URLs de test.</li>
            </ul>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "12px 20px 20px" }}>
            <button
              onClick={() => setShowStartModal(false)}
              disabled={starting}
              style={secondaryBtn}
            >
              Annuler
            </button>
            <button
              onClick={handleStart}
              disabled={starting}
              style={primaryBtn(starting)}
            >
              {starting ? "Démarrage…" : "Je démarre maintenant"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal soumission */}
      {showSubmitModal && (
        <Modal
          title="Soumettre votre mission ?"
          onClose={() => !submitting && setShowSubmitModal(false)}
        >
          <div style={{ padding: "12px 20px 0 20px" }}>
            <p style={{ fontSize: 14, color: "#1d1d1f", margin: "0 0 10px" }}>
              Une fois soumises, vos réponses <strong>ne pourront plus être modifiées</strong>.
            </p>
            <p style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>
              L&apos;équipe validera votre travail. Des points de qualité seront gagnés ou retirés selon la rigueur des réponses.
            </p>
            {submitError && (
              <div style={{
                marginTop: 12, padding: "10px 12px", fontSize: 12,
                color: "#dc2626", background: "#fef2f2", borderRadius: 8,
              }}>{submitError}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "12px 20px 20px" }}>
            <button
              onClick={() => setShowSubmitModal(false)}
              disabled={submitting}
              style={secondaryBtn}
            >
              Retour
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={primaryBtn(submitting)}
            >
              {submitting ? "Envoi…" : "Soumettre définitivement"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const primaryBtn = (loading: boolean): React.CSSProperties => ({
  padding: "12px 24px", background: "#0A7A5A", color: "#fff",
  borderRadius: 980, fontSize: 14, fontWeight: 700,
  border: "none", cursor: loading ? "wait" : "pointer",
  fontFamily: "inherit", opacity: loading ? 0.8 : 1,
});

const secondaryBtn: React.CSSProperties = {
  padding: "12px 24px", background: "#f5f5f7", color: "#1d1d1f",
  borderRadius: 980, fontSize: 14, fontWeight: 600,
  border: "none", cursor: "pointer", fontFamily: "inherit",
};

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)", overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 20px 0" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: 0, letterSpacing: "-0.02em" }}>
            {title}
          </h3>
        </div>
        {children}
      </div>
    </div>
  );
}
