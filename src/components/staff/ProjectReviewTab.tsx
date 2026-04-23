"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectUseCase } from "@/types/staff";

interface TesterAnswer {
  tester_name: string;
  tester_id: string;
  answer_text: string | null;
}

interface QuestionWithAnswers {
  id: string;
  question_text: string;
  question_hint?: string | null;
  position: number;
  answers: TesterAnswer[];
}

interface UseCaseBlock {
  id: string;
  title: string;
  task_wording?: string | null;
  order: number;
  questions: QuestionWithAnswers[];
}

interface Props {
  projectId: string;
}

export default function ProjectReviewTab({ projectId }: Props) {
  const [blocks, setBlocks] = useState<UseCaseBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedUcs, setCollapsedUcs] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ucRes, answersRes] = await Promise.all([
        fetch(`/api/staff/projects/${projectId}/use-cases`),
        fetch(`/api/staff/projects/${projectId}/answers`),
      ]);

      if (!ucRes.ok || !answersRes.ok) return;

      const useCases: ProjectUseCase[] = await ucRes.json();
      const answersData = await answersRes.json();
      const submissions: Array<{
        tester: { id: string; first_name: string | null; last_name: string | null };
        answers: Array<{ question_id: string; answer_text: string | null }>;
      }> = answersData.submissions || [];

      const answerMap = new Map<string, TesterAnswer[]>();
      for (const sub of submissions) {
        const name = [sub.tester.first_name, sub.tester.last_name].filter(Boolean).join(" ") || "Testeur";
        for (const a of sub.answers) {
          if (!answerMap.has(a.question_id)) answerMap.set(a.question_id, []);
          answerMap.get(a.question_id)!.push({
            tester_name: name,
            tester_id: sub.tester.id,
            answer_text: a.answer_text,
          });
        }
      }

      const result: UseCaseBlock[] = useCases.map((uc) => ({
        id: uc.id,
        title: uc.title,
        task_wording: uc.task_wording,
        order: uc.order,
        questions: (uc.questions ?? []).map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_hint: q.question_hint,
          position: q.position,
          answers: answerMap.get(q.id) ?? [],
        })),
      }));

      const allQuestions = answersData.questions || [];
      const orphanQuestionIds = allQuestions
        .filter((q: { id: string }) => !useCases.some((uc) => (uc.questions ?? []).some((uq) => uq.id === q.id)))
        .map((q: { id: string }) => q.id);

      if (orphanQuestionIds.length > 0) {
        const orphanBlock: UseCaseBlock = {
          id: "__orphan",
          title: "Questions sans cas d'usage",
          order: 999,
          questions: allQuestions
            .filter((q: { id: string }) => orphanQuestionIds.includes(q.id))
            .map((q: { id: string; question_text: string; position: number }) => ({
              id: q.id,
              question_text: q.question_text,
              position: q.position,
              answers: answerMap.get(q.id) ?? [],
            })),
        };
        result.push(orphanBlock);
      }

      setBlocks(result);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleUc(id: string) {
    setCollapsedUcs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#86868B", fontSize: 14 }}>Chargement du dépouillement…</div>;
  }

  if (blocks.length === 0) {
    return (
      <div style={{
        padding: 48, textAlign: "center", background: "#fff",
        borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.08)",
      }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", marginBottom: 8 }}>Aucun cas d&apos;usage</p>
        <p style={{ fontSize: 13, color: "#86868B" }}>Créez des cas d&apos;usage dans l&apos;onglet Scénarios pour structurer le dépouillement.</p>
      </div>
    );
  }

  const totalAnswers = blocks.reduce((s, b) => s + b.questions.reduce((s2, q) => s2 + q.answers.length, 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.03em", margin: 0 }}>
          Dépouillement ({totalAnswers} réponses)
        </h2>
        <p style={{ fontSize: 12, color: "#86868B", margin: "4px 0 0" }}>
          Vue en lecture seule — toutes les réponses testeurs groupées par cas d&apos;usage et par question.
        </p>
      </div>

      {blocks.map((block) => {
        const isCollapsed = collapsedUcs.has(block.id);
        const blockAnswers = block.questions.reduce((s, q) => s + q.answers.length, 0);

        return (
          <div key={block.id} style={{
            background: "#fff", borderRadius: 20,
            border: "0.5px solid rgba(0,0,0,0.08)",
            marginBottom: 16, overflow: "hidden",
          }}>
            <button
              type="button"
              onClick={() => toggleUc(block.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "18px 24px", background: "none",
                border: "none", borderBottom: isCollapsed ? "none" : "0.5px solid rgba(0,0,0,0.06)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "#0A7A5A", background: "#f0faf5", borderRadius: 8,
                }}>
                  {block.order + 1}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f" }}>{block.title}</span>
                <span style={{ fontSize: 12, color: "#86868B" }}>
                  {block.questions.length} q · {blockAnswers} rép.
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#86868B", transition: "transform 200ms", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)" }}>▼</span>
            </button>

            {!isCollapsed && (
              <div style={{ padding: "0 24px 24px" }}>
                {block.task_wording && (
                  <div style={{
                    padding: "12px 16px", background: "#f5f5f7", borderRadius: 10,
                    marginBottom: 16, marginTop: 8,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.04em" }}>Brief testeur</span>
                    <p style={{ fontSize: 13, color: "#1d1d1f", margin: "6px 0 0", lineHeight: 1.6 }}>{block.task_wording}</p>
                  </div>
                )}

                {block.questions.map((q, qIdx) => (
                  <div key={q.id} style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>
                        {qIdx + 1}. {q.question_text}
                      </span>
                      {q.question_hint && (
                        <span style={{ display: "block", fontSize: 11, color: "#86868B", fontStyle: "italic", marginTop: 2 }}>
                          {q.question_hint}
                        </span>
                      )}
                    </div>

                    {q.answers.length === 0 ? (
                      <div style={{ padding: "10px 14px", background: "#fafafa", borderRadius: 8, fontSize: 12, color: "#86868B", fontStyle: "italic" }}>
                        Aucune réponse
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {q.answers.map((a, aIdx) => (
                          <div key={aIdx} style={{
                            padding: "10px 14px", background: "#f5f5f7", borderRadius: 10,
                            borderLeft: "3px solid #0A7A5A",
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#0A7A5A", marginBottom: 4 }}>
                              {a.tester_name}
                            </div>
                            <div style={{ fontSize: 13, color: "#1d1d1f", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                              {a.answer_text || <em style={{ color: "#86868B" }}>Pas de réponse</em>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
