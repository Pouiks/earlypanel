"use client";

/**
 * Wizard testeur : un scenario apres l'autre, une question a la fois.
 *
 * Sur chaque etape :
 *  - Banniere du cas d'usage en haut (titre + brief markdown + criteres a valider)
 *  - Question rendue selon son type (text / binary / scale_1_5)
 *  - Indicateur soft de longueur min pour les textes
 *  - Questions conditionnelles : revelees uniquement si la reponse du parent
 *    correspond a parent_show_when_values
 *
 * Les drafts (reponses) sont passes par le parent qui gere l'autosave 2s.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import ImageUploader from "@/components/mission/ImageUploader";
import Markdown from "@/components/ui/Markdown";

export interface MissionWizardTester {
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
}

export interface MissionWizardQuestion {
  id: string;
  position: number;
  question_text: string;
  question_hint?: string | null;
  question_type?: "text" | "binary" | "scale_1_5";
  parent_question_id?: string | null;
  parent_show_when_values?: string[] | null;
  min_chars_hint?: number | null;
  use_case_id?: string | null;
}

export interface MissionWizardUseCase {
  id: string;
  title: string;
  task_wording: string | null;
  order: number;
  criteria: { id: string; label: string; is_primary: boolean; order: number }[];
}

interface UploadedImage {
  path: string;
  signed_url: string | null;
}

type SavingState = "idle" | "saving" | "saved";

const BINARY_OPTIONS: Array<{ value: "yes" | "no" | "partial"; label: string }> = [
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
  { value: "partial", label: "Partiellement" },
];

function initialsFromTester(t: MissionWizardTester | null | undefined): string {
  if (!t) return "?";
  const a = t.first_name?.trim()?.[0];
  const b = t.last_name?.trim()?.[0];
  if (a && b) return (a + b).toUpperCase();
  if (a) {
    const rest = t.first_name?.trim()?.[1];
    return (a + (rest || a)).toUpperCase().slice(0, 2);
  }
  return "?";
}

function displayNameFromTester(t: MissionWizardTester | null | undefined): string {
  if (!t) return "Vous";
  const fn = t.first_name?.trim();
  const ln = t.last_name?.trim();
  if (fn && ln) return `${fn} ${ln.charAt(0).toUpperCase()}.`;
  if (fn) return fn;
  if (ln) return ln;
  return "Vous";
}

function jobFromTester(t: MissionWizardTester | null | undefined): string {
  return t?.job_title?.trim() || "Testeur";
}

function useDeviceLabel(): string {
  const [label, setLabel] = useState("—");
  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    let browser = "Navigateur";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/Chrome\//.test(ua) && /Google Inc|Google LLC/.test(navigator.vendor || ""))
      browser = "Chrome";
    else if (/Chrome\//.test(ua)) browser = "Chrome";
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    const kind = isMobile ? "Mobile" : "Ordinateur";
    setLabel(`${kind} · ${browser}`);
  }, []);
  return label;
}

const TEXT_HINT =
  "Pensez aux étapes, aux messages, au contexte. Les captures d'écran aident l'équipe.";

type Props = {
  projectId: string;
  projectTitle: string;
  categoryLabel: string;
  questions: MissionWizardQuestion[];
  useCases: MissionWizardUseCase[];
  tester: MissionWizardTester | null;
  drafts: Record<string, string>;
  onDraftChange: (questionId: string, text: string) => void;
  onDraftBlur: (questionId: string) => void;
  savingByQuestion: Record<string, SavingState>;
  imagesByQ: Record<string, UploadedImage[]>;
  onImagesChange: (questionId: string, next: UploadedImage[]) => void;
  inProgress: boolean;
  completed: boolean;
  onOpenSubmit: () => void;
  /** Mode prévisualisation staff : pas d'upload, pas de submit. */
  previewMode?: boolean;
};

const SESSION_STORAGE_PREFIX = "missionWizardStep:";

/**
 * Calcule si une question doit etre visible compte tenu des reponses actuelles.
 * - Pas de parent => visible.
 * - Parent existe : la reponse du parent doit etre dans parent_show_when_values.
 *   (parent_show_when_values vide ou null => pas de filtre, donc visible des
 *   que le parent a une reponse.)
 */
function isQuestionVisible(
  q: MissionWizardQuestion,
  drafts: Record<string, string>,
): boolean {
  if (!q.parent_question_id) return true;
  const parentAnswer = (drafts[q.parent_question_id] || "").trim();
  if (!parentAnswer) return false;
  const showWhen = q.parent_show_when_values ?? [];
  if (showWhen.length === 0) return true;
  return showWhen.includes(parentAnswer);
}

/**
 * Une question est "repondue" si :
 *  - text : draft non vide apres trim
 *  - binary / scale_1_5 : draft est une valeur valide
 */
function isQuestionAnswered(
  q: MissionWizardQuestion,
  drafts: Record<string, string>,
): boolean {
  const v = (drafts[q.id] || "").trim();
  if (!v) return false;
  if (q.question_type === "binary") return ["yes", "no", "partial"].includes(v);
  if (q.question_type === "scale_1_5") return ["1", "2", "3", "4", "5"].includes(v);
  return true;
}

export default function MissionQuestionWizard({
  projectId,
  projectTitle,
  categoryLabel,
  questions,
  useCases,
  tester,
  drafts,
  onDraftChange,
  onDraftBlur,
  savingByQuestion,
  imagesByQ,
  onImagesChange,
  inProgress,
  completed,
  onOpenSubmit,
  previewMode = false,
}: Props) {
  const deviceLabel = useDeviceLabel();
  const [step, setStep] = useState(0);

  // Index des UC par id pour acceder a la banniere depuis la question courante.
  const ucById = useMemo(() => {
    const m = new Map<string, MissionWizardUseCase>();
    for (const uc of useCases) m.set(uc.id, uc);
    return m;
  }, [useCases]);

  // Ordre stable des questions : par UC.order puis par position au sein de l'UC.
  const orderedQuestions = useMemo(() => {
    const ucOrder = new Map<string, number>();
    useCases.forEach((uc) => ucOrder.set(uc.id, uc.order));
    const sorted = [...questions].sort((a, b) => {
      const ao = a.use_case_id ? ucOrder.get(a.use_case_id) ?? 9999 : 9999;
      const bo = b.use_case_id ? ucOrder.get(b.use_case_id) ?? 9999 : 9999;
      if (ao !== bo) return ao - bo;
      return a.position - b.position;
    });
    return sorted;
  }, [questions, useCases]);

  // Filtrage conditionnel — dependance sur drafts pour reactiver l'affichage
  // quand la reponse parent change.
  const visibleQuestions = useMemo(
    () => orderedQuestions.filter((q) => isQuestionVisible(q, drafts)),
    [orderedQuestions, drafts],
  );

  const n = visibleQuestions.length;

  useLayoutEffect(() => {
    if (typeof window === "undefined" || n === 0) return;
    const raw = sessionStorage.getItem(SESSION_STORAGE_PREFIX + projectId);
    if (raw == null) return;
    const saved = parseInt(raw, 10);
    if (!Number.isInteger(saved) || saved < 0) return;
    setStep(Math.min(saved, n - 1));
  }, [projectId, n]);

  useEffect(() => {
    if (n === 0) return;
    // Clamp si une reponse conditionnelle a fait disparaitre des questions
    // et que l'utilisateur etait au-dela.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep((s) => Math.min(s, n - 1));
  }, [n]);

  useEffect(() => {
    if (typeof window === "undefined" || n === 0) return;
    sessionStorage.setItem(SESSION_STORAGE_PREFIX + projectId, String(step));
  }, [projectId, step, n]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const goPrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const goNext = useCallback(
    (currentId: string) => {
      onDraftBlur(currentId);
      setStep((s) => Math.min(n - 1, s + 1));
    },
    [n, onDraftBlur],
  );

  if (n === 0) return null;

  const i = Math.min(step, n - 1);
  const q = visibleQuestions[i];
  const text = drafts[q.id] || "";
  const savingState = savingByQuestion[q.id] || "idle";
  const imgs = imagesByQ[q.id] || [];
  const pct = Math.max(1, Math.round((100 * (i + 1)) / n));
  const isLast = i === n - 1;
  const sessionLine =
    projectTitle.length > 42 ? `Session · ${projectTitle.slice(0, 40)}…` : `Session · ${projectTitle}`;

  // allAnswered : toutes les questions VISIBLES sont repondues.
  const allAnswered = visibleQuestions.every((qq) => isQuestionAnswered(qq, drafts));

  const qType: "text" | "binary" | "scale_1_5" = q.question_type ?? "text";
  const currentUc = q.use_case_id ? ucById.get(q.use_case_id) : null;
  // Position de cette question dans son UC (1-base) — pour aider le testeur a se reperer.
  const questionsOfThisUc = currentUc
    ? visibleQuestions.filter((qq) => qq.use_case_id === currentUc.id)
    : [];
  const idxInUc = currentUc ? questionsOfThisUc.findIndex((qq) => qq.id === q.id) : -1;

  // Indicateur min_chars_hint (text uniquement) — non bloquant.
  const minHintMet = qType !== "text" || !q.min_chars_hint || text.trim().length >= q.min_chars_hint;

  const handleBinaryPick = (value: "yes" | "no" | "partial") => {
    onDraftChange(q.id, value);
    onDraftBlur(q.id);
  };
  const handleScalePick = (value: 1 | 2 | 3 | 4 | 5) => {
    onDraftChange(q.id, String(value));
    onDraftBlur(q.id);
  };

  return (
    <div className="q-widget" style={{ maxWidth: 680, margin: "0 auto" }}>
      <div className="q-topbar">
        <div className="q-dots" aria-hidden>
          <div className="q-dot" style={{ background: "#FF5F57" }} />
          <div className="q-dot" style={{ background: "#FFBD2E" }} />
          <div className="q-dot" style={{ background: "#28CA41" }} />
        </div>
        <div className="q-session" title={projectTitle}>{sessionLine}</div>
      </div>

      <div className="q-progress-wrap">
        <div className="q-progress-header">
          <div className="q-progress-label">Question {i + 1} sur {n}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {inProgress && (
              <span style={{ fontSize: 11, color: savingState === "saved" ? "#0A7A5A" : "#86868b", fontWeight: 500 }}>
                {savingState === "saving" && "Sauvegarde…"}
                {savingState === "saved" && "✓ Enregistré"}
              </span>
            )}
            <div className="q-progress-count">{pct}%</div>
          </div>
        </div>
        <div className="q-progress-track" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={n}>
          <div className="q-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="q-body">
        <div className="q-scenario-label">
          <div className="q-scenario-dot" />
          <span>{categoryLabel}</span>
        </div>

        {/* Banniere du cas d'usage : titre + brief + criteres */}
        {currentUc && (
          <div
            style={{
              background: "#f0faf5",
              border: "1px solid rgba(10,122,90,0.18)",
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0A7A5A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Scénario · {currentUc.title}
              </div>
              {idxInUc >= 0 && questionsOfThisUc.length > 0 && (
                <div style={{ fontSize: 11, color: "#0A7A5A", fontWeight: 600 }}>
                  Question {idxInUc + 1} / {questionsOfThisUc.length} de ce scenario
                </div>
              )}
            </div>
            {currentUc.task_wording?.trim() && (
              <div style={{ marginBottom: currentUc.criteria.length > 0 ? 12 : 0 }}>
                <Markdown testerView>{currentUc.task_wording}</Markdown>
              </div>
            )}
            {currentUc.criteria.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1d1d1f", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Ce que vous devez avoir fait
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {currentUc.criteria.map((c) => (
                    <li
                      key={c.id}
                      style={{
                        fontSize: 13,
                        color: "#1d1d1f",
                        marginBottom: 3,
                        fontWeight: c.is_primary ? 600 : 400,
                      }}
                    >
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="q-question" style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {q.question_text}
        </div>
        {q.question_hint?.trim() ? (
          <p className="q-hint" style={{ marginTop: 4 }}>{q.question_hint}</p>
        ) : qType === "text" ? (
          <p className="q-hint">{TEXT_HINT}</p>
        ) : null}

        {/* Input par type */}
        {qType === "text" && (
          <>
            <textarea
              className="q-textarea"
              value={text}
              onChange={(e) => onDraftChange(q.id, e.target.value)}
              onBlur={() => onDraftBlur(q.id)}
              disabled={!inProgress}
              placeholder="Décrivez le comportement rencontré le plus précisément possible…"
              rows={6}
              style={{ minHeight: 140, resize: "vertical" }}
            />
            <div className="q-meta-row" style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div className="q-char-count">{text.length} caractères</div>
              {!minHintMet && q.min_chars_hint && (
                <div style={{ fontSize: 11, color: "#b45309" }}>
                  Réponse courte. Pourriez-vous donner un exemple concret ? (suggestion : {q.min_chars_hint}+ caractères)
                </div>
              )}
            </div>
          </>
        )}

        {qType === "binary" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            {BINARY_OPTIONS.map((opt) => {
              const selected = text === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleBinaryPick(opt.value)}
                  disabled={!inProgress}
                  style={{
                    flex: "1 1 120px",
                    padding: "14px 18px",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    color: selected ? "#fff" : "#1d1d1f",
                    background: selected ? "#0A7A5A" : "#fff",
                    border: selected ? "1.5px solid #0A7A5A" : "1.5px solid rgba(0,0,0,0.12)",
                    borderRadius: 14,
                    cursor: inProgress ? "pointer" : "not-allowed",
                    opacity: inProgress ? 1 : 0.7,
                    transition: "all 150ms",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {qType === "scale_1_5" && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {[1, 2, 3, 4, 5].map((v) => {
                const selected = text === String(v);
                return (
                  <button
                    type="button"
                    key={v}
                    onClick={() => handleScalePick(v as 1 | 2 | 3 | 4 | 5)}
                    disabled={!inProgress}
                    style={{
                      flex: "1 1 60px",
                      padding: "16px 8px",
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      color: selected ? "#fff" : "#1d1d1f",
                      background: selected ? "#0A7A5A" : "#fff",
                      border: selected ? "1.5px solid #0A7A5A" : "1.5px solid rgba(0,0,0,0.12)",
                      borderRadius: 14,
                      cursor: inProgress ? "pointer" : "not-allowed",
                      opacity: inProgress ? 1 : 0.7,
                      transition: "all 150ms",
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#86868B" }}>
              <span>1 — Pas du tout</span>
              <span>5 — Tout à fait</span>
            </div>
          </>
        )}

        {/* Image uploader : utile pour text et binary ("ecran qui bloque"). Cache en preview staff. */}
        {!previewMode && (
          <div style={{ marginTop: 14 }}>
            <ImageUploader
              missionId={projectId}
              questionId={q.id}
              images={imgs}
              onChange={(next) => onImagesChange(q.id, next)}
              disabled={!inProgress}
            />
          </div>
        )}

        <div
          className="mission-wizard-nav"
          style={{
            display: "flex", flexWrap: "wrap", alignItems: "center",
            justifyContent: "space-between", gap: 12,
            marginTop: 20, paddingTop: 16,
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <button
            type="button"
            onClick={goPrev}
            disabled={i === 0}
            style={{
              padding: "10px 20px", fontSize: 14, fontWeight: 600,
              color: i === 0 ? "#b4b4b9" : "#1d1d1f",
              background: "#f5f5f7",
              border: "none", borderRadius: 980,
              cursor: i === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Précédent
          </button>

          <div style={{ fontSize: 12, color: "#86868b" }}>{i + 1} / {n}</div>

          {!isLast ? (
            <button
              type="button"
              onClick={() => goNext(q.id)}
              style={{
                padding: "10px 22px", fontSize: 14, fontWeight: 700,
                color: "#fff", background: "#0A7A5A",
                border: "none", borderRadius: 980,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Suivant →
            </button>
          ) : (
            <div style={{ minWidth: 120 }} />
          )}
        </div>

        {isLast && inProgress && !previewMode && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            {!allAnswered && (
              <span style={{ fontSize: 12, color: "#d97706" }}>
                Parcourez toutes les questions et remplissez chacune pour soumettre.
              </span>
            )}
            <button
              type="button"
              onClick={onOpenSubmit}
              disabled={!allAnswered}
              style={{
                padding: "12px 28px",
                background: allAnswered ? "#0A7A5A" : "#d1d5db",
                color: "#fff", borderRadius: 980,
                fontSize: 14, fontWeight: 700,
                border: "none",
                cursor: allAnswered ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Soumettre ma mission
            </button>
          </div>
        )}

        {isLast && previewMode && (
          <div style={{ marginTop: 20, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: 12, color: "#92400e", textAlign: "center" }}>
            Mode prévisualisation — vos réponses ne sont pas enregistrées.
          </div>
        )}

        {isLast && completed && (
          <p style={{ margin: "20px 0 0", fontSize: 13, color: "#0A7A5A", fontWeight: 600 }}>
            Mission soumise — lecture seule
          </p>
        )}
      </div>

      <div className="q-footer">
        <div className="q-avatar-row">
          <div className="q-avatar" style={{ background: "#0A7A5A", color: "#fff", flexShrink: 0 }}>
            {initialsFromTester(tester)}
          </div>
          <div className="q-tester-info">
            <strong>{displayNameFromTester(tester)}</strong> · <span>{jobFromTester(tester)}</span>
          </div>
        </div>
        <div className="q-device" title="Contexte de ce navigateur">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          {deviceLabel}
        </div>
      </div>
    </div>
  );
}
