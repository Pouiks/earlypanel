"use client";

/**
 * Modal "Voir comme un testeur" appele depuis le canvas de creation projet.
 *
 * Reconstruit la vue testeur (MissionQuestionWizard) a partir du state local
 * du canvas (LocalUseCase[]). Pas de backend, pas d'upload d'images : les
 * reponses tapees sont stockees en RAM le temps de la prévisualisation.
 *
 * Limites assumees :
 *  - Les questions vides sont filtrees (pas affichees)
 *  - Les questions sans use_case sont rattachees a un cas d'usage virtuel
 *    (ne devrait pas arriver en pratique, on a toujours au moins un UC)
 */

import { useState } from "react";
import MissionQuestionWizard, {
  type MissionWizardQuestion,
  type MissionWizardUseCase,
} from "@/components/mission/MissionQuestionWizard";
import type { QuestionType, BinaryAnswerValue } from "@/types/staff";

interface PreviewQuestion {
  _key: string;
  question_text: string;
  question_hint: string;
  position: number;
  question_type: QuestionType;
  parent_key: string | null;
  parent_show_when_values: BinaryAnswerValue[];
  min_chars_hint: string;
}

interface PreviewCriterion {
  _key: string;
  label: string;
  is_primary: boolean;
  order: number;
}

interface PreviewUseCase {
  _key: string;
  title: string;
  task_wording: string;
  order: number;
  criteria: PreviewCriterion[];
  questions: PreviewQuestion[];
}

interface MissionPreviewModalProps {
  open: boolean;
  onClose: () => void;
  useCases: PreviewUseCase[];
  projectTitle: string;
  categoryLabel: string;
}

export default function MissionPreviewModal({
  open,
  onClose,
  useCases,
  projectTitle,
  categoryLabel,
}: MissionPreviewModalProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!open) return null;

  // Map LocalUseCase → wizard shapes. On filtre les questions et UC vides
  // pour ne montrer au testeur que ce qu'il aurait reellement.
  const wizardUseCases: MissionWizardUseCase[] = [];
  const wizardQuestions: MissionWizardQuestion[] = [];

  useCases.forEach((uc, ucIdx) => {
    const keptQuestions = uc.questions.filter((q) => q.question_text.trim());
    if (keptQuestions.length === 0) return;
    wizardUseCases.push({
      id: uc._key,
      title: uc.title.trim() || `Cas d'usage ${ucIdx + 1}`,
      task_wording: uc.task_wording.trim() || null,
      order: ucIdx,
      criteria: uc.criteria
        .filter((c) => c.label.trim())
        .map((c, ci) => ({
          id: c._key,
          label: c.label.trim(),
          is_primary: c.is_primary,
          order: ci,
        })),
    });
    keptQuestions.forEach((q, qi) => {
      // Le parent doit pointer vers un _key d'une question retenue (pas filtree).
      const parent =
        q.parent_key && keptQuestions.find((p) => p._key === q.parent_key && p.question_type === "binary")
          ? q.parent_key
          : null;
      const minHintRaw = q.min_chars_hint.trim();
      const minHint = minHintRaw ? parseInt(minHintRaw) : null;
      wizardQuestions.push({
        id: q._key,
        position: qi,
        question_text: q.question_text.trim(),
        question_hint: q.question_hint.trim() || null,
        question_type: q.question_type,
        parent_question_id: parent,
        parent_show_when_values: parent ? q.parent_show_when_values : null,
        min_chars_hint: minHint && minHint > 0 ? minHint : null,
        use_case_id: uc._key,
      });
    });
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, overflow: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fafafa", borderRadius: 20,
          width: "100%", maxWidth: 760, maxHeight: "92vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{
          padding: "16px 20px",
          borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#fff",
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0A7A5A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              Prévisualisation testeur
            </div>
            <div style={{ fontSize: 13, color: "#86868B" }}>
              Vous voyez exactement ce que verra un testeur. Les réponses tapées ici ne sont pas enregistrées.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f5f5f7", border: "none",
              padding: "8px 14px", borderRadius: 980,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", color: "#1d1d1f",
            }}
          >
            Fermer
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "20px 16px" }}>
          {wizardQuestions.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#86868B", fontSize: 14 }}>
              Aucune question rédigée. Ajoutez du contenu dans le canvas pour prévisualiser.
            </div>
          ) : (
            <MissionQuestionWizard
              projectId="preview"
              projectTitle={projectTitle}
              categoryLabel={categoryLabel}
              questions={wizardQuestions}
              useCases={wizardUseCases}
              tester={null}
              drafts={drafts}
              onDraftChange={(qid, text) => setDrafts((d) => ({ ...d, [qid]: text }))}
              onDraftBlur={() => { /* no-op en preview */ }}
              savingByQuestion={{}}
              imagesByQ={{}}
              onImagesChange={() => { /* no-op en preview */ }}
              inProgress={true}
              completed={false}
              onOpenSubmit={() => { /* no-op en preview */ }}
              previewMode={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
