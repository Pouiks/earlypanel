"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import ImageUploader from "@/components/mission/ImageUploader";

export interface MissionWizardTester {
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
}

export interface MissionWizardQuestion {
  id: string;
  position: number;
  question_text: string;
}

interface UploadedImage {
  path: string;
  signed_url: string | null;
}

type SavingState = "idle" | "saving" | "saved";

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

const HINT =
  "Pensez aux étapes, aux messages, au contexte. Les captures d'écran aident l'équipe.";

type Props = {
  projectId: string;
  projectTitle: string;
  /** Libellé du pastille (ex. secteur) */
  categoryLabel: string;
  questions: MissionWizardQuestion[];
  tester: MissionWizardTester | null;
  drafts: Record<string, string>;
  onDraftChange: (questionId: string, text: string) => void;
  onDraftBlur: (questionId: string) => void;
  savingByQuestion: Record<string, SavingState>;
  imagesByQ: Record<string, UploadedImage[]>;
  onImagesChange: (questionId: string, next: UploadedImage[]) => void;
  inProgress: boolean;
  completed: boolean;
  allAnswered: boolean;
  onOpenSubmit: () => void;
};

const SESSION_STORAGE_PREFIX = "missionWizardStep:";

export default function MissionQuestionWizard({
  projectId,
  projectTitle,
  categoryLabel,
  questions,
  tester,
  drafts,
  onDraftChange,
  onDraftBlur,
  savingByQuestion,
  imagesByQ,
  onImagesChange,
  inProgress,
  completed,
  allAnswered,
  onOpenSubmit,
}: Props) {
  const n = questions.length;
  const deviceLabel = useDeviceLabel();
  const [step, setStep] = useState(0);

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
    [n, onDraftBlur]
  );

  if (n === 0) return null;

  const i = Math.min(step, n - 1);
  const q = questions[i];
  const text = drafts[q.id] || "";
  const savingState = savingByQuestion[q.id] || "idle";
  const imgs = imagesByQ[q.id] || [];
  const pct = Math.max(1, Math.round((100 * (i + 1)) / n));
  const isLast = i === n - 1;
  const sessionLine =
    projectTitle.length > 42 ? `Session · ${projectTitle.slice(0, 40)}…` : `Session · ${projectTitle}`;

  return (
    <div
      className="q-widget"
      style={{ maxWidth: 640, margin: "0 auto" }}
    >
      <div className="q-topbar">
        <div className="q-dots" aria-hidden>
          <div className="q-dot" style={{ background: "#FF5F57" }} />
          <div className="q-dot" style={{ background: "#FFBD2E" }} />
          <div className="q-dot" style={{ background: "#28CA41" }} />
        </div>
        <div className="q-session" title={projectTitle}>
          {sessionLine}
        </div>
      </div>

      <div className="q-progress-wrap">
        <div className="q-progress-header">
          <div className="q-progress-label">
            Question {i + 1} sur {n}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {inProgress && (
              <span
                style={{
                  fontSize: 11,
                  color: savingState === "saved" ? "#0A7A5A" : "#86868b",
                  fontWeight: 500,
                }}
              >
                {savingState === "saving" && "Sauvegarde…"}
                {savingState === "saved" && "✓ Enregistré"}
                {savingState === "idle" && ""}
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
        <div className="q-question" style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {q.question_text}
        </div>
        <p className="q-hint">{HINT}</p>

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

        <div className="q-meta-row" style={{ marginTop: 8 }}>
          <div className="q-char-count">{text.length} caractères</div>
        </div>

        <div style={{ marginTop: 14 }}>
          <ImageUploader
            missionId={projectId}
            questionId={q.id}
            images={imgs}
            onChange={(next) => onImagesChange(q.id, next)}
            disabled={!inProgress}
          />
        </div>

        <div
          className="mission-wizard-nav"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 20,
            paddingTop: 16,
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <button
            type="button"
            onClick={goPrev}
            disabled={i === 0}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: i === 0 ? "#b4b4b9" : "#1d1d1f",
              background: "#f5f5f7",
              border: "none",
              borderRadius: 980,
              cursor: i === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Précédent
          </button>

          <div style={{ fontSize: 12, color: "#86868b" }}>
            {i + 1} / {n}
          </div>

          {!isLast ? (
            <button
              type="button"
              onClick={() => goNext(q.id)}
              style={{
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                background: "#0A7A5A",
                border: "none",
                borderRadius: 980,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Suivant →
            </button>
          ) : (
            <div style={{ minWidth: 120 }} />
          )}
        </div>

        {isLast && inProgress && (
          <div
            style={{
              marginTop: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
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
                color: "#fff",
                borderRadius: 980,
                fontSize: 14,
                fontWeight: 700,
                border: "none",
                cursor: allAnswered ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Soumettre ma mission
            </button>
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
          <div
            className="q-avatar"
            style={{ background: "#0A7A5A", color: "#fff", flexShrink: 0 }}
          >
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
