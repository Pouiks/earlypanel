"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectUseCase, QuestionType } from "@/types/staff";

/**
 * Depouillement : une question a la fois, toutes les reponses des testeurs
 * en dessous. Le staff lit, replie ce qui est lu (persiste, migration 042)
 * et note le testeur sans changer de section. Pas de scoring automatique :
 * le compteur de caracteres est un chiffre, pas une evaluation.
 */

interface TesterLite {
  id: string;
  first_name: string | null;
  last_name: string | null;
  tier: string | null;
  job_title?: string | null;
  devices?: string[] | null;
}

interface AnswerImage { path: string; signed_url: string | null }

interface RawAnswer {
  question_id: string;
  answer_text: string | null;
  image_urls: string[];
  images: AnswerImage[];
  reviewed_at?: string | null;
}

interface Submission {
  id: string; // project_tester_id
  tester_id: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  staff_rating: number | null;
  staff_note: string | null;
  tester: TesterLite | TesterLite[] | null;
  answers: RawAnswer[];
}

interface Question {
  id: string;
  question_text: string;
  question_hint?: string | null;
  question_type?: QuestionType;
  min_chars_hint?: number | null;
  position: number;
}

interface Block { id: string; title: string; task_wording?: string | null; questions: Question[] }

interface Card {
  sub: Submission;
  tester: TesterLite;
  readableId: string;
  answer: RawAnswer | null;
  text: string;
  chars: number;
  reviewed: boolean;
}

type Sort = "unread" | "shortest" | "submitted";

const BINARY_LABELS: Record<string, string> = { yes: "Oui", no: "Non", partial: "Partiellement" };
const TIER_LABELS: Record<string, string> = { standard: "Standard", expert: "Expert", premium: "Premium" };

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.08)",
};

function pill(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px", borderRadius: 980, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
    background: active ? "#1d1d1f" : "#fff", color: active ? "#fff" : "#6e6e73",
    border: active ? "1px solid #1d1d1f" : "0.5px solid rgba(0,0,0,0.12)", fontWeight: active ? 600 : 400,
  };
}

function testerOf(sub: Submission): TesterLite {
  const t = Array.isArray(sub.tester) ? sub.tester[0] : sub.tester;
  return t ?? { id: sub.tester_id, first_name: null, last_name: null, tier: null };
}

function fmtDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")}`;
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#0A7A5A" : "none"} stroke={filled ? "#0A7A5A" : "#c7c7cc"} strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
    </svg>
  );
}

export default function ProjectReviewTab({ projectId }: { projectId: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("unread");
  const [hideRead, setHideRead] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [ucRes, ansRes] = await Promise.all([
        fetch(`/api/staff/projects/${projectId}/use-cases`),
        fetch(`/api/staff/projects/${projectId}/answers`),
      ]);
      if (!ucRes.ok || !ansRes.ok) {
        setError("Erreur de chargement du dépouillement");
        return;
      }
      const useCases: ProjectUseCase[] = await ucRes.json();
      const ans = await ansRes.json();
      const submissions: Submission[] = (ans.submissions ?? []).filter((s: Submission) => s.status === "completed");

      const result: Block[] = useCases.map((uc) => ({
        id: uc.id,
        title: uc.title,
        task_wording: uc.task_wording,
        questions: (uc.questions ?? []).map((q) => ({
          id: q.id, question_text: q.question_text, question_hint: q.question_hint,
          question_type: q.question_type, min_chars_hint: q.min_chars_hint, position: q.position,
        })),
      }));
      const known = new Set(result.flatMap((b) => b.questions.map((q) => q.id)));
      const orphans = ((ans.questions ?? []) as Question[]).filter((q) => !known.has(q.id));
      if (orphans.length > 0) {
        result.push({ id: "__orphan", title: "Questions sans cas d'usage", questions: orphans });
      }

      // Identifiant lisible stable : ordre de soumission (T01, T02...).
      submissions.sort((a, b) => (a.submitted_at ?? "").localeCompare(b.submitted_at ?? ""));

      setBlocks(result);
      setSubs(submissions);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const flat = useMemo(() => blocks.flatMap((b) => b.questions.map((q) => ({ block: b, q }))), [blocks]);
  const currentIdx = Math.max(0, flat.findIndex((f) => f.q.id === current));
  const active = flat[currentIdx] ?? null;

  const cards: Card[] = useMemo(() => {
    if (!active) return [];
    const list = subs.map((sub, i) => {
      const answer = sub.answers.find((a) => a.question_id === active.q.id) ?? null;
      const text = (answer?.answer_text ?? "").trim();
      return {
        sub, tester: testerOf(sub), readableId: `T${String(i + 1).padStart(2, "0")}`,
        answer, text, chars: text.length, reviewed: !!answer?.reviewed_at,
      };
    });
    if (sort === "shortest") list.sort((a, b) => a.chars - b.chars);
    else if (sort === "unread") list.sort((a, b) => Number(a.reviewed) - Number(b.reviewed));
    return list;
  }, [subs, active, sort]);

  // Compteurs par question pour le navigateur.
  const readByQuestion = useMemo(() => {
    const m = new Map<string, { read: number; total: number }>();
    for (const f of flat) {
      let read = 0;
      for (const s of subs) if (s.answers.find((a) => a.question_id === f.q.id)?.reviewed_at) read++;
      m.set(f.q.id, { read, total: subs.length });
    }
    return m;
  }, [flat, subs]);

  const goTo = useCallback((idx: number) => {
    const target = flat[Math.min(Math.max(idx, 0), flat.length - 1)];
    if (target) setCurrent(target.q.id);
  }, [flat]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable) return;
      if (e.key === "ArrowRight") goTo(currentIdx + 1);
      if (e.key === "ArrowLeft") goTo(currentIdx - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, currentIdx]);

  async function toggleReviewed(c: Card, reviewed: boolean) {
    if (!c.answer) return;
    // Optimiste : la case se replie tout de suite, on recharge en cas d'echec.
    setSubs((prev) => prev.map((s) => s.tester_id !== c.tester.id ? s : {
      ...s,
      answers: s.answers.map((a) => a.question_id !== c.answer!.question_id ? a : { ...a, reviewed_at: reviewed ? new Date().toISOString() : null }),
    }));
    const res = await fetch(`/api/staff/projects/${projectId}/answers/reviewed`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tester_id: c.tester.id, question_id: c.answer.question_id, reviewed }),
    });
    if (!res.ok) {
      setError("Impossible d'enregistrer l'état « lu »");
      load();
    }
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#86868B", fontSize: 14 }}>Chargement du dépouillement…</div>;
  }
  if (flat.length === 0) {
    return (
      <div style={{ ...card, padding: 48, textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", marginBottom: 8 }}>Aucune question</p>
        <p style={{ fontSize: 13, color: "#86868B", margin: 0 }}>Créez des scénarios et des questions dans la section Scénarios pour structurer le dépouillement.</p>
      </div>
    );
  }
  if (subs.length === 0) {
    return (
      <div style={{ ...card, padding: 48, textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", marginBottom: 8 }}>Aucune mission soumise</p>
        <p style={{ fontSize: 13, color: "#86868B", margin: 0 }}>Le dépouillement s&apos;ouvre dès qu&apos;un testeur a soumis sa mission.</p>
      </div>
    );
  }

  const rated = subs.filter((s) => s.staff_rating != null).length;
  const visible = hideRead ? cards.filter((c) => !c.reviewed) : cards;
  const remaining = cards.filter((c) => !c.reviewed).length;

  return (
    <div className="review-shell">
      {/* Navigateur de questions */}
      <aside className="review-nav">
        <div style={{ padding: "0 4px 12px", borderBottom: "0.5px solid rgba(0,0,0,0.08)", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#86868B" }}>{subs.length} soumis · {rated} noté{rated > 1 ? "s" : ""} · {subs.length - rated} à noter</div>
          <div style={{ height: 4, background: "#f0f0f2", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: `${subs.length ? Math.round((rated / subs.length) * 100) : 0}%`, height: "100%", background: "#0A7A5A" }} />
          </div>
          <a href="#answers" style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "#0A7A5A", textDecoration: "none" }}>Voir par testeur &rarr;</a>
        </div>
        {blocks.map((b, bi) => (
          <div key={b.id}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 4px 4px" }}>
              {bi + 1} · {b.title}
            </div>
            {b.questions.map((q) => {
              const isActive = active?.q.id === q.id;
              const rq = readByQuestion.get(q.id);
              const done = rq && rq.total > 0 && rq.read === rq.total;
              const n = flat.findIndex((f) => f.q.id === q.id) + 1;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrent(q.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                    padding: "8px 8px", borderRadius: 10, border: "none", fontFamily: "inherit", cursor: "pointer",
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#0A7A5A" : done ? "#86868B" : "#1d1d1f",
                    background: isActive ? "#f0faf5" : "transparent",
                  }}
                >
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
                  ) : (
                    <span style={{ width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: rq && rq.read > 0 ? "#0A7A5A" : "transparent", border: rq && rq.read > 0 ? "none" : "1.5px solid #c7c7cc" }} />
                    </span>
                  )}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Q{n} · {q.question_text}</span>
                  <span style={{ fontSize: 11, color: "#86868B" }}>{rq ? `${rq.read}/${rq.total}` : ""}</span>
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {/* Question courante */}
      <div className="review-main">
        {error && (
          <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{error}</div>
        )}
        {active && (
          <div className="review-head">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0A7A5A" }}>
                {active.block.title} · Question {currentIdx + 1} sur {flat.length}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0A7A5A", letterSpacing: "-0.03em", margin: "4px 0 0", lineHeight: 1.25 }}>
                {active.q.question_text}
              </h2>
              {active.q.question_hint && (
                <div style={{ fontSize: 12, color: "#86868B", fontStyle: "italic", marginTop: 4 }}>{active.q.question_hint}</div>
              )}
              {active.block.task_wording && currentIdx === flat.findIndex((f) => f.block.id === active.block.id) && (
                <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 8, padding: "8px 12px", background: "#f5f5f7", borderRadius: 10 }}>
                  <strong>Consigne du scénario.</strong> {active.block.task_wording}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button type="button" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0} style={{ ...pill(false), padding: "8px 14px", opacity: currentIdx === 0 ? 0.4 : 1 }}>
                &larr; Q{currentIdx}
              </button>
              <button type="button" onClick={() => goTo(currentIdx + 1)} disabled={currentIdx >= flat.length - 1} style={{ ...pill(true), padding: "8px 14px", background: "#0A7A5A", border: "1px solid #0A7A5A", opacity: currentIdx >= flat.length - 1 ? 0.4 : 1 }}>
                Q{currentIdx + 2} &rarr;
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6e6e73", margin: "12px 0 14px", flexWrap: "wrap" }}>
          <span>Trier :</span>
          <button type="button" style={pill(sort === "unread")} onClick={() => setSort("unread")}>Non lus d&apos;abord</button>
          <button type="button" style={pill(sort === "shortest")} onClick={() => setSort("shortest")}>Plus courtes</button>
          <button type="button" style={pill(sort === "submitted")} onClick={() => setSort("submitted")}>Ordre de soumission</button>
          <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={hideRead} onChange={(e) => setHideRead(e.target.checked)} />
            Masquer les lus
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.length === 0 && (
            <div style={{ ...card, padding: 24, fontSize: 13, color: "#86868B", textAlign: "center" }}>Tout est lu sur cette question.</div>
          )}
          {visible.map((c) => {
            const key = `${c.tester.id}:${active?.q.id}`;
            const collapsed = c.reviewed && !expanded.has(key);
            return (
              <AnswerCard
                key={key}
                projectId={projectId}
                c={c}
                question={active!.q}
                collapsed={collapsed}
                onToggleCollapsed={() => toggleExpanded(key)}
                onToggleReviewed={(r) => toggleReviewed(c, r)}
                onRated={load}
              />
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <span style={{ fontSize: 12, color: "#86868B" }}>
            {remaining === 0 ? "Toutes les réponses de cette question sont lues" : `${remaining} réponse${remaining > 1 ? "s" : ""} à lire sur cette question`} · flèches ← → pour naviguer
          </span>
          {currentIdx < flat.length - 1 && (
            <button type="button" onClick={() => goTo(currentIdx + 1)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#fff", background: "#0A7A5A", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
              Question suivante &rarr;
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .review-shell { display: flex; gap: 20px; align-items: flex-start; }
        .review-nav {
          width: 260px; flex-shrink: 0; position: sticky; top: 16px;
          max-height: calc(100vh - 32px); overflow-y: auto;
          background: #fff; border-radius: 20px; border: 0.5px solid rgba(0,0,0,0.08); padding: 14px 8px;
          box-sizing: border-box;
        }
        .review-main { flex: 1; min-width: 0; }
        .review-head {
          position: sticky; top: 0; z-index: 2; background: #f5f5f7;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 4px 0 8px;
        }
        @media (max-width: 900px) {
          .review-shell { flex-direction: column; }
          .review-nav { width: 100%; position: static; max-height: none; }
        }
      `}</style>
    </div>
  );
}

function AnswerCard({
  projectId, c, question, collapsed, onToggleCollapsed, onToggleReviewed, onRated,
}: {
  projectId: string;
  c: Card;
  question: Question;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleReviewed: (reviewed: boolean) => void;
  onRated: () => void;
}) {
  const [rating, setRating] = useState<number>(c.sub.staff_rating ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [sloppy, setSloppy] = useState(false);
  const [note, setNote] = useState<string>(c.sub.staff_note ?? "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const alreadyRated = c.sub.staff_rating != null;
  const name = [c.tester.first_name, c.tester.last_name].filter(Boolean).join(" ") || "Testeur";
  const qType: QuestionType = question.question_type ?? "text";
  const minHint = question.min_chars_hint ?? null;
  const short = qType === "text" && c.chars > 0 && ((minHint && c.chars < minHint) || (!minHint && c.chars < 60));
  const meta = [
    c.tester.job_title,
    c.tester.devices?.length ? c.tester.devices.join(", ") : null,
    c.sub.submitted_at ? `soumis le ${fmtDateTime(c.sub.submitted_at)}` : null,
    fmtDuration(c.sub.started_at, c.sub.submitted_at),
    c.answer?.images?.length ? `${c.answer.images.length} capture${c.answer.images.length > 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(" · ");

  async function save() {
    if (rating < 1 || rating > 5) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/answers`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_tester_id: c.sub.id, rating, note, sloppy }),
      });
      if (res.ok) {
        setMsg("Note enregistrée");
        setOpen(false);
        onRated();
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg(data?.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  }

  if (collapsed) {
    return (
      <div style={{ ...card, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, opacity: 0.75 }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#f5f5f7", color: "#86868B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{c.readableId}</span>
        <div style={{ flex: 1, fontSize: 13, minWidth: 0 }}>
          <strong>{name}</strong>
          <span style={{ color: "#86868B" }}> · {c.chars} caractères · lu{alreadyRated ? ` · noté ${c.sub.staff_rating}/5` : " · pas encore noté"}</span>
        </div>
        <button type="button" onClick={onToggleCollapsed} style={{ fontSize: 12, color: "#0A7A5A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Déplier</button>
      </div>
    );
  }

  const value = qType === "binary"
    ? (BINARY_LABELS[c.text] ?? c.text)
    : qType === "scale_1_5" ? `${c.text} / 5` : null;

  return (
    <div style={{ ...card, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0faf5", color: "#0A7A5A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{c.readableId}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>
            {name}
            {c.tester.tier && c.tester.tier !== "standard" && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0A7A5A", background: "#f0faf5", padding: "2px 8px", borderRadius: 980, marginLeft: 6 }}>{TIER_LABELS[c.tester.tier] ?? c.tester.tier}</span>
            )}
          </div>
          {meta && <div style={{ fontSize: 12, color: "#86868B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</div>}
        </div>
        {qType === "text" && (
          <span style={{ fontSize: 12, fontWeight: short ? 600 : 400, color: short ? "#1d1d1f" : "#86868B", whiteSpace: "nowrap" }}>
            {c.chars} caractères{short && minHint ? ` (suggéré : ${minHint})` : ""}
          </span>
        )}
      </div>

      {value ? (
        <span style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: 980, background: "#f5f5f7", fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>{value}</span>
      ) : c.text ? (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#1d1d1f", margin: 0, whiteSpace: "pre-wrap" }}>{c.text}</p>
      ) : (
        <p style={{ fontSize: 13, color: "#86868B", fontStyle: "italic", margin: 0 }}>Pas de réponse</p>
      )}

      {c.answer?.images && c.answer.images.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {c.answer.images.map((img) => img.signed_url ? (
            <a key={img.path} href={img.signed_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: 120, height: 76, borderRadius: 8, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.08)", background: "#f0f0f2" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL signee temporaire, pas d'optimisation possible */}
              <img src={img.signed_url} alt="Capture d'écran du testeur" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </a>
          ) : null)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 10, borderTop: "0.5px solid rgba(0,0,0,0.06)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onClick={() => { setRating(n); setOpen(true); }}
              title={`${n} / 5`}
              style={{ background: "none", border: "none", padding: 2, cursor: "pointer", lineHeight: 0 }}
            >
              <Star filled={n <= (hover || rating)} />
            </button>
          ))}
          <span style={{ fontSize: 12, color: alreadyRated ? "#0A7A5A" : "#86868B", fontWeight: alreadyRated ? 600 : 400, marginLeft: 8 }}>
            {alreadyRated ? `Noté ${c.sub.staff_rating}/5 · pour toutes ses réponses` : "Note globale du testeur, pour toutes ses réponses"}
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {msg && <span style={{ fontSize: 12, color: msg === "Note enregistrée" ? "#0A7A5A" : "#b91c1c" }}>{msg}</span>}
          {c.answer && (
            c.reviewed ? (
              <button type="button" onClick={() => onToggleReviewed(false)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0A7A5A", background: "#f0faf5", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
                Lu
              </button>
            ) : (
              <button type="button" onClick={() => onToggleReviewed(true)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#1d1d1f", background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
                Marquer lu
              </button>
            )
          )}
        </div>
      </div>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, background: "#f5f5f7", borderRadius: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
            Noter {name} : {rating}/5{alreadyRated ? " (correction, sans nouveau scoring)" : ""}
          </div>
          {!alreadyRated && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1d1d1f", cursor: "pointer" }}>
              <input type="checkbox" checked={sloppy} onChange={(e) => setSloppy(e.target.checked)} />
              Travail bâclé : test refusé, non payé, malus de 20 points
            </label>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note interne (optionnelle)"
            rows={2}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13, border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10, fontFamily: "inherit", resize: "vertical", background: "#fff" }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setOpen(false); setRating(c.sub.staff_rating ?? 0); }} style={{ padding: "8px 16px", fontSize: 13, color: "#6e6e73", background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
            <button type="button" onClick={save} disabled={saving || rating < 1} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "#fff", background: "#0A7A5A", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Enregistrement…" : "Enregistrer la note"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
