"use client";

/**
 * Outline canvas pour la composition d'un test (scenarios > criteres > questions).
 *
 * Design : un canvas hierarchique type Notion/Linear (pas un formulaire).
 *  - Drag-and-drop pour reordonner scenarios et questions (@dnd-kit/sortable)
 *  - Autosave debounce 1.5s, plus de bouton "Enregistrer" — indicateur d'etat
 *  - "Dupliquer le scenario" pour reutiliser une grille au sein d'un projet
 *  - Collapsibles, ajout/suppression inline
 *
 * Le contrat API (PUT /api/staff/projects/[id]/use-cases) reste identique :
 * positions et orders sont recalcules a partir de l'index dans le tableau
 * local au moment de la serialisation.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { ProjectUseCase, QuestionType, BinaryAnswerValue } from "@/types/staff";
import { useConfirm } from "@/components/ui/ConfirmModal";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Markdown from "@/components/ui/Markdown";
import MissionPreviewModal from "@/components/staff/MissionPreviewModal";

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
  question_type: QuestionType;
  /** _key (stable client-side) du parent. Null = question non conditionnelle. */
  parent_key: string | null;
  parent_show_when_values: BinaryAnswerValue[];
  /** Suggestion soft (texte en input pour edition, parse sur save). */
  min_chars_hint: string;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: "Texte libre",
  binary: "Oui / Non / Partiel",
  scale_1_5: "Echelle 1-5",
};

const BINARY_VALUE_LABELS: Record<BinaryAnswerValue, string> = {
  yes: "Oui",
  no: "Non",
  partial: "Partiellement",
};

interface LocalUseCase {
  _key: string;
  id?: string;
  title: string;
  task_wording: string;
  order: number;
  criteria: LocalCriterion[];
  questions: LocalQuestion[];
  collapsed: boolean;
}

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

let keyCounter = 0;
function nextKey() { return `_k${++keyCounter}`; }

const AUTOSAVE_DEBOUNCE_MS = 1500;

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
const ghostBtn: React.CSSProperties = {
  padding: "6px 12px", fontSize: 12, fontWeight: 600,
  color: "#6e6e73", background: "transparent",
  border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
  cursor: "pointer", fontFamily: "inherit",
};
const removeBtn: React.CSSProperties = {
  padding: "0 12px", fontSize: 18, color: "#e53e3e",
  background: "#fef2f2", border: "none", borderRadius: 10,
  cursor: "pointer", height: 38,
};
const dragHandleStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 22, height: 28, color: "#c7c7cc", cursor: "grab",
  fontSize: 14, lineHeight: 1, userSelect: "none",
  borderRadius: 6,
};

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "#0A7A5A";
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)";
}

/** Statut autosave dans le header. */
function SaveIndicator({ status, errorMsg }: { status: SaveStatus; errorMsg: string | null }) {
  const map: Record<SaveStatus, { color: string; bg: string; label: string }> = {
    idle:    { color: "#86868B", bg: "transparent", label: "Pret"            },
    dirty:   { color: "#86868B", bg: "transparent", label: "Modification non enregistree" },
    saving:  { color: "#0A7A5A", bg: "#f0faf5",     label: "Enregistrement..." },
    saved:   { color: "#0A7A5A", bg: "#f0faf5",     label: "Enregistre"      },
    error:   { color: "#b91c1c", bg: "#fef2f2",     label: errorMsg ?? "Erreur" },
  };
  const s = map[status];
  return (
    <span
      style={{
        fontSize: 12, fontWeight: 600, color: s.color, background: s.bg,
        padding: "5px 12px", borderRadius: 980, transition: "all 200ms",
      }}
      title={errorMsg ?? undefined}
    >
      {s.label}
    </span>
  );
}

// ============================================================
// Sortable wrappers
// ============================================================

function SortableUseCase({ ucKey, children }: { ucKey: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `uc-${ucKey}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  const handle = (
    <span
      {...attributes}
      {...listeners}
      style={dragHandleStyle}
      title="Glisser pour reordonner"
      aria-label="Glisser pour reordonner ce scenario"
    >
      ⋮⋮
    </span>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
}

function SortableQuestion({ qKey, children }: { qKey: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `q-${qKey}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  const handle = (
    <span
      {...attributes}
      {...listeners}
      style={{ ...dragHandleStyle, height: 36 }}
      title="Glisser pour reordonner"
      aria-label="Glisser pour reordonner cette question"
    >
      ⋮⋮
    </span>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
}

// ============================================================
// Composant principal
// ============================================================

export default function ProjectQuestionsTab({ projectId, onUpdate }: ProjectQuestionsTabProps) {
  const [useCases, setUseCases] = useState<LocalUseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  // Set des _key des UC dont le brief est actuellement en mode "Apercu".
  const [previewBriefKeys, setPreviewBriefKeys] = useState<Set<string>>(new Set());
  // Modal de prevue testeur ouvert ou non.
  const [previewOpen, setPreviewOpen] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  // Refs pour orchestrer l'autosave sans recreer la fonction a chaque change.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const useCasesRef = useRef<LocalUseCase[]>([]);
  const inFlightRef = useRef(false);
  const dirtyAfterFlightRef = useRef(false);
  // Ref vers performSave, pour casser la boucle scheduleSave <-> performSave
  // (sinon React Compiler ne peut pas preserver la memoization).
  const performSaveRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => { useCasesRef.current = useCases; }, [useCases]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchUseCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/use-cases`);
      if (res.ok) {
        const data: ProjectUseCase[] = await res.json();
        setUseCases(
          data.map((uc) => {
            // Pass 1 : assigner les _key a chaque question pour pouvoir
            // mapper parent_question_id (id serveur) vers parent_key (local).
            const questionsWithKeys = (uc.questions ?? []).map((q) => ({
              q,
              key: nextKey(),
            }));
            const idToKey = new Map<string, string>();
            for (const { q, key } of questionsWithKeys) {
              if (q.id) idToKey.set(q.id, key);
            }
            return {
              _key: nextKey(),
              id: uc.id,
              title: uc.title,
              task_wording: uc.task_wording ?? "",
              order: uc.order,
              collapsed: false,
              criteria: (uc.criteria ?? []).map((c) => ({
                _key: nextKey(),
                id: c.id,
                label: c.label,
                is_primary: c.is_primary,
                order: c.order,
              })),
              questions: questionsWithKeys.map(({ q, key }) => ({
                _key: key,
                id: q.id,
                question_text: q.question_text,
                question_hint: q.question_hint ?? "",
                position: q.position,
                question_type: (q.question_type ?? "text") as QuestionType,
                parent_key: q.parent_question_id ? idToKey.get(q.parent_question_id) ?? null : null,
                parent_show_when_values: (q.parent_show_when_values ?? []) as BinaryAnswerValue[],
                min_chars_hint: q.min_chars_hint != null ? String(q.min_chars_hint) : "",
              })),
            };
          })
        );
      }
    } catch { /* retry */ }
    setLoading(false);
    setSaveStatus("idle");
  }, [projectId]);

  // Fetch initial : pattern de chargement de donnees au mount. Le linter
  // react-hooks/set-state-in-effect signale les setState synchrones dans
  // les effets, mais c'est attendu pour un fetch initial.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchUseCases(); }, [fetchUseCases]);

  // ---- Autosave -------------------------------------------------------

  const buildPayload = useCallback(() => ({
    use_cases: useCasesRef.current.map((uc, i) => {
      // Sur les questions retenues, on map _key -> position (au sein du UC apres
      // filtrage), pour resoudre les parent_key en parent_position cote payload.
      const kept = uc.questions.filter((q) => q.question_text.trim());
      const keyToPos = new Map<string, number>();
      kept.forEach((q, qi) => keyToPos.set(q._key, qi));

      return {
        id: uc.id || undefined,
        title: uc.title.trim() || `Cas d'usage ${i + 1}`,
        task_wording: uc.task_wording.trim() || null,
        order: i,
        expected_testers_count: null,
        criteria: uc.criteria
          .filter((c) => c.label.trim())
          .map((c, ci) => ({
            label: c.label.trim(),
            is_primary: c.is_primary,
            order: ci,
          })),
        questions: kept.map((q, qi) => {
          // Conditionnel : on ne valide que si le parent existe encore et est
          // place AVANT (qi > parentPos). Sinon on degrade la question en non-conditionnelle.
          let parentPos: number | null = null;
          if (q.parent_key) {
            const pp = keyToPos.get(q.parent_key);
            if (pp !== undefined && pp < qi) {
              const parentQ = kept[pp];
              if (parentQ.question_type === "binary") parentPos = pp;
            }
          }
          const minHintRaw = q.min_chars_hint.trim();
          const minHint = minHintRaw ? parseInt(minHintRaw) : null;
          return {
            id: q.id,
            question_text: q.question_text.trim(),
            question_hint: q.question_hint.trim() || null,
            position: qi,
            question_type: q.question_type,
            parent_position: parentPos,
            parent_show_when_values: parentPos !== null ? q.parent_show_when_values : null,
            min_chars_hint: minHint && minHint > 0 ? minHint : null,
          };
        }),
      };
    }),
  }), []);

  const performSave = useCallback(async () => {
    if (inFlightRef.current) {
      // Une sauvegarde est deja en cours : on retentera apres son retour.
      dirtyAfterFlightRef.current = true;
      return;
    }
    inFlightRef.current = true;
    setSaveStatus("saving");
    setSaveError(null);

    let ok = false;
    let errorMsg: string | null = null;
    let serverData: ProjectUseCase[] | null = null;
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/use-cases`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (res.ok) {
        ok = true;
        serverData = (await res.json()) as ProjectUseCase[];
      } else {
        const data = await res.json().catch(() => ({}));
        errorMsg = (data as { error?: string }).error || `Erreur ${res.status}`;
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erreur reseau";
    } finally {
      inFlightRef.current = false;
    }

    if (ok && serverData) {
      setSaveStatus("saved");
      // Si l'utilisateur a edite pendant le vol, on n'ecrase RIEN : on
      // re-declenche un save dans le prochain debounce. Ainsi pas de risque
      // d'effet "reload" qui efface une saisie en cours.
      if (!dirtyAfterFlightRef.current) {
        const data = serverData;
        // Merge minimaliste : on n'attache que les ids serveur manquants.
        // Aucune autre cle n'est touchee (label, text, type, etc.) →
        // pas de re-render visuel intrusif.
        setUseCases((prev) => prev.map((uc, i) => {
          const remote = data[i];
          if (!remote) return uc;
          const ucNeedsId = !uc.id;
          const newCriteria = uc.criteria.map((c, ci) => {
            if (c.id || !c.label.trim()) return c;
            const remoteId = remote.criteria?.[ci]?.id;
            return remoteId ? { ...c, id: remoteId } : c;
          });
          const newQuestions = uc.questions.map((q, qi) => {
            if (q.id || !q.question_text.trim()) return q;
            const remoteId = remote.questions?.[qi]?.id;
            return remoteId ? { ...q, id: remoteId } : q;
          });
          if (!ucNeedsId && newCriteria === uc.criteria && newQuestions === uc.questions) {
            return uc; // rien a changer, on reutilise la reference (pas de re-render)
          }
          return {
            ...uc,
            id: uc.id ?? remote.id,
            criteria: newCriteria,
            questions: newQuestions,
          };
        }));
      }
      onUpdate();
      if (dirtyAfterFlightRef.current) {
        dirtyAfterFlightRef.current = false;
        setSaveStatus("dirty");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => performSaveRef.current(), AUTOSAVE_DEBOUNCE_MS);
      }
    } else if (!ok) {
      setSaveStatus("error");
      setSaveError(errorMsg);
    }
  }, [projectId, buildPayload, onUpdate]);

  // Garde performSaveRef a jour pour la boucle d'auto-retry.
  useEffect(() => { performSaveRef.current = performSave; }, [performSave]);

  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("dirty");
    debounceRef.current = setTimeout(() => performSaveRef.current(), AUTOSAVE_DEBOUNCE_MS);
  }, []);

  // Cleanup timer en demontage : evite de declencher une sauvegarde
  // apres que le composant ait disparu (changement de tab, etc.).
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  /** Mutation locale + planif autosave. Toutes les editions passent ici. */
  const mutate = useCallback((updater: (prev: LocalUseCase[]) => LocalUseCase[]) => {
    setUseCases((prev) => updater(prev));
    if (inFlightRef.current) dirtyAfterFlightRef.current = true;
    scheduleSave();
  }, [scheduleSave]);

  // ---- Handlers d'edition --------------------------------------------

  function addUseCase() {
    mutate((prev) => [
      ...prev,
      {
        _key: nextKey(),
        title: "",
        task_wording: "",
        order: prev.length,
        criteria: [{ _key: nextKey(), label: "", is_primary: true, order: 0 }],
        questions: [{
          _key: nextKey(), question_text: "", question_hint: "", position: 0,
          question_type: "text" as QuestionType, parent_key: null,
          parent_show_when_values: [], min_chars_hint: "",
        }],
        collapsed: false,
      },
    ]);
  }

  function duplicateUseCase(i: number) {
    mutate((prev) => {
      const src = prev[i];
      const copy: LocalUseCase = {
        _key: nextKey(),
        title: src.title ? `${src.title} (copie)` : "",
        task_wording: src.task_wording,
        order: i + 1,
        collapsed: false,
        criteria: src.criteria.map((c) => ({
          _key: nextKey(),
          label: c.label,
          is_primary: c.is_primary,
          order: c.order,
        })),
        questions: (() => {
          // Duplique en preservant les liens parent-enfant : on remappe les
          // _key des originaux vers les nouveaux _key.
          const oldToNew = new Map<string, string>();
          const cloned: LocalQuestion[] = src.questions.map((q) => {
            const newKey = nextKey();
            oldToNew.set(q._key, newKey);
            return {
              _key: newKey,
              question_text: q.question_text,
              question_hint: q.question_hint,
              position: q.position,
              question_type: q.question_type,
              parent_key: null,
              parent_show_when_values: q.parent_show_when_values,
              min_chars_hint: q.min_chars_hint,
            };
          });
          // Pass 2 : retablir parent_key avec les nouveaux _key.
          src.questions.forEach((q, idx) => {
            if (q.parent_key) {
              cloned[idx].parent_key = oldToNew.get(q.parent_key) ?? null;
            }
          });
          return cloned;
        })(),
      };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
  }

  async function removeUseCase(i: number) {
    const uc = useCases[i];
    const qCount = uc?.questions.length ?? 0;
    const ok = await confirm({
      title: "Supprimer ce scénario ?",
      message:
        qCount > 0
          ? `Ce scénario et ses ${qCount} question${qCount > 1 ? "s" : ""} seront supprimés. Si des testeurs y ont déjà répondu, la suppression sera refusée (les réponses sont protégées).`
          : "Ce scénario sera supprimé définitivement.",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    mutate((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateUc<K extends keyof LocalUseCase>(i: number, key: K, val: LocalUseCase[K]) {
    // collapse/expand n'est pas une vraie edition cote DB : on saute l'autosave.
    if (key === "collapsed") {
      setUseCases((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], [key]: val };
        return next;
      });
      return;
    }
    mutate((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  }

  function addCriterion(ucIdx: number) {
    mutate((prev) => {
      const next = [...prev];
      const uc = next[ucIdx];
      next[ucIdx] = {
        ...uc,
        criteria: [
          ...uc.criteria,
          { _key: nextKey(), label: "", is_primary: false, order: uc.criteria.length },
        ],
      };
      return next;
    });
  }

  async function removeCriterion(ucIdx: number, cIdx: number) {
    const label = useCases[ucIdx]?.criteria[cIdx]?.label?.trim();
    const ok = await confirm({
      title: "Supprimer ce critère de succès ?",
      message: label
        ? `« ${label} » sera retiré. Les complétions déjà cochées pour ce critère seront perdues.`
        : "Ce critère de succès sera supprimé.",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    mutate((prev) => {
      const next = [...prev];
      next[ucIdx] = {
        ...next[ucIdx],
        criteria: next[ucIdx].criteria.filter((_, idx) => idx !== cIdx),
      };
      return next;
    });
  }

  function updateCriterion(ucIdx: number, cIdx: number, key: keyof LocalCriterion, val: string | boolean) {
    mutate((prev) => {
      const next = [...prev];
      const list = [...next[ucIdx].criteria];
      if (key === "is_primary" && val === true) {
        list.forEach((c, i) => { list[i] = { ...c, is_primary: i === cIdx }; });
      } else {
        list[cIdx] = { ...list[cIdx], [key]: val };
      }
      next[ucIdx] = { ...next[ucIdx], criteria: list };
      return next;
    });
  }

  function addQuestion(ucIdx: number) {
    mutate((prev) => {
      const next = [...prev];
      const uc = next[ucIdx];
      next[ucIdx] = {
        ...uc,
        questions: [
          ...uc.questions,
          {
            _key: nextKey(), question_text: "", question_hint: "", position: uc.questions.length,
            question_type: "text" as QuestionType, parent_key: null,
            parent_show_when_values: [], min_chars_hint: "",
          },
        ],
      };
      return next;
    });
  }

  async function removeQuestion(ucIdx: number, qIdx: number) {
    const qText = useCases[ucIdx]?.questions[qIdx]?.question_text?.trim();
    const ok = await confirm({
      title: "Supprimer cette question ?",
      message: qText
        ? `« ${qText.slice(0, 80)}${qText.length > 80 ? "…" : ""} » sera supprimée. Si des testeurs y ont déjà répondu, la suppression sera refusée.`
        : "Cette question sera supprimée. Si des testeurs y ont déjà répondu, la suppression sera refusée.",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    mutate((prev) => {
      const next = [...prev];
      next[ucIdx] = {
        ...next[ucIdx],
        questions: next[ucIdx].questions.filter((_, idx) => idx !== qIdx),
      };
      return next;
    });
  }

  function updateQuestion<K extends keyof LocalQuestion>(
    ucIdx: number, qIdx: number, key: K, val: LocalQuestion[K],
  ) {
    mutate((prev) => {
      const next = [...prev];
      const list = [...next[ucIdx].questions];
      list[qIdx] = { ...list[qIdx], [key]: val };
      // Si on bascule un parent OFF de binary, casser le lien des enfants.
      if (key === "question_type" && val !== "binary") {
        const parentKey = list[qIdx]._key;
        for (let i = 0; i < list.length; i++) {
          if (list[i].parent_key === parentKey) {
            list[i] = { ...list[i], parent_key: null, parent_show_when_values: [] };
          }
        }
      }
      next[ucIdx] = { ...next[ucIdx], questions: list };
      return next;
    });
  }

  function toggleParentShowValue(ucIdx: number, qIdx: number, value: BinaryAnswerValue) {
    mutate((prev) => {
      const next = [...prev];
      const list = [...next[ucIdx].questions];
      const cur = list[qIdx].parent_show_when_values;
      const has = cur.includes(value);
      list[qIdx] = {
        ...list[qIdx],
        parent_show_when_values: has ? cur.filter((v) => v !== value) : [...cur, value],
      };
      next[ucIdx] = { ...next[ucIdx], questions: list };
      return next;
    });
  }

  // ---- Drag-and-drop --------------------------------------------------

  function handleScenarioDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const aId = String(active.id);
    const oId = String(over.id);
    if (!aId.startsWith("uc-") || !oId.startsWith("uc-")) return;
    const fromKey = aId.slice(3);
    const toKey = oId.slice(3);
    mutate((prev) => {
      const fromIdx = prev.findIndex((u) => u._key === fromKey);
      const toIdx = prev.findIndex((u) => u._key === toKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      return arrayMove(prev, fromIdx, toIdx);
    });
  }

  function handleQuestionDragEnd(ucIdx: number, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const aId = String(active.id);
    const oId = String(over.id);
    if (!aId.startsWith("q-") || !oId.startsWith("q-")) return;
    const fromKey = aId.slice(2);
    const toKey = oId.slice(2);
    mutate((prev) => {
      const next = [...prev];
      const list = next[ucIdx].questions;
      const fromIdx = list.findIndex((q) => q._key === fromKey);
      const toIdx = list.findIndex((q) => q._key === toKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next[ucIdx] = { ...next[ucIdx], questions: arrayMove(list, fromIdx, toIdx) };
      return next;
    });
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#86868B", fontSize: 14 }}>Chargement…</div>;
  }

  const totalQ = useCases.reduce((s, uc) => s + uc.questions.filter((q) => q.question_text.trim()).length, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.03em", margin: 0 }}>
            Cas d&apos;usage &amp; questions ({useCases.length} cas · {totalQ} questions)
          </h2>
          <p style={{ fontSize: 12, color: "#86868B", margin: "4px 0 0" }}>
            Chaque cas d&apos;usage regroupe un scénario testeur, des critères de succès et des questions. Les modifications sont sauvegardées automatiquement.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <SaveIndicator status={saveStatus} errorMsg={saveError} />
          {saveStatus === "error" && (
            <button
              onClick={() => performSave()}
              style={{ ...smallBtn, color: "#b91c1c", borderColor: "#b91c1c", background: "#fef2f2" }}
            >
              Reessayer
            </button>
          )}
          {useCases.length > 0 && (
            <button
              onClick={() => setPreviewOpen(true)}
              style={{
                ...smallBtn,
                color: "#fff",
                background: "#1d1d1f",
                borderColor: "#1d1d1f",
                fontWeight: 700,
              }}
              title="Voir le test tel qu'il sera presente au testeur"
            >
              Voir comme un testeur
            </button>
          )}
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

      {useCases.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleScenarioDragEnd}>
          <SortableContext items={useCases.map((u) => `uc-${u._key}`)} strategy={verticalListSortingStrategy}>
            {useCases.map((uc, ucIdx) => (
              <SortableUseCase key={uc._key} ucKey={uc._key}>
                {(handle) => (
                  <div style={card}>
                    {/* UC Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: uc.collapsed ? 0 : 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        {handle}
                        <button
                          type="button"
                          onClick={() => updateUc(ucIdx, "collapsed", !uc.collapsed)}
                          style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", flex: 1, minWidth: 0, textAlign: "left" }}
                        >
                          <span style={{
                            width: 28, height: 28, display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 13, fontWeight: 700,
                            color: "#0A7A5A", background: "#f0faf5", borderRadius: 8,
                            flexShrink: 0,
                          }}>
                            {ucIdx + 1}
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {uc.title || `Cas d'usage ${ucIdx + 1}`}
                          </span>
                          <span style={{ fontSize: 12, color: "#86868B", flexShrink: 0 }}>
                            ({uc.questions.filter((q) => q.question_text.trim()).length} q · {uc.criteria.filter((c) => c.label.trim()).length} critères)
                          </span>
                          <span style={{ fontSize: 12, color: "#86868B", transition: "transform 200ms", transform: uc.collapsed ? "rotate(-90deg)" : "rotate(0)", flexShrink: 0 }}>▼</span>
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => duplicateUseCase(ucIdx)}
                          style={ghostBtn}
                          title="Dupliquer ce scenario avec ses criteres et questions"
                        >
                          Dupliquer
                        </button>
                        <button type="button" onClick={() => removeUseCase(ucIdx)} style={{ ...removeBtn, fontSize: 13, padding: "4px 12px", height: "auto" }}>
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {!uc.collapsed && (
                      <>
                        {/* UC Fields */}
                        <div style={{ marginBottom: 16 }}>
                          <label style={labelStyle}>Titre du cas d&apos;usage</label>
                          <input
                            type="text" value={uc.title}
                            onChange={(e) => updateUc(ucIdx, "title", e.target.value)}
                            placeholder="Ex: S'inscrire et compléter son profil"
                            style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
                          />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>Brief testeur (consigne · Markdown supporté)</label>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewBriefKeys((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(uc._key)) next.delete(uc._key);
                                  else next.add(uc._key);
                                  return next;
                                });
                              }}
                              style={{
                                padding: "4px 12px", fontSize: 11, fontWeight: 600,
                                color: previewBriefKeys.has(uc._key) ? "#fff" : "#0A7A5A",
                                background: previewBriefKeys.has(uc._key) ? "#0A7A5A" : "#f0faf5",
                                border: "1px solid #0A7A5A", borderRadius: 980,
                                cursor: "pointer", fontFamily: "inherit",
                              }}
                            >
                              {previewBriefKeys.has(uc._key) ? "Editer" : "Apercu"}
                            </button>
                          </div>
                          {previewBriefKeys.has(uc._key) ? (
                            <div style={{
                              minHeight: 80,
                              padding: "12px 14px",
                              background: "#fafafa",
                              border: "0.5px solid rgba(0,0,0,0.08)",
                              borderRadius: 10,
                            }}>
                              {uc.task_wording.trim() ? (
                                <Markdown>{uc.task_wording}</Markdown>
                              ) : (
                                <span style={{ color: "#86868B", fontSize: 13, fontStyle: "italic" }}>Brief vide.</span>
                              )}
                            </div>
                          ) : (
                            <textarea
                              value={uc.task_wording}
                              onChange={(e) => updateUc(ucIdx, "task_wording", e.target.value)}
                              placeholder="Vous lancez votre activité… **objectif** : inscrivez-vous et complétez votre profil. Listes : - étape 1 - étape 2"
                              rows={4}
                              style={{ ...inputStyle, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 13 }}
                              onFocus={focusBorder} onBlur={blurBorder}
                            />
                          )}
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

                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleQuestionDragEnd(ucIdx, e)}
                          >
                            <SortableContext
                              items={uc.questions.map((q) => `q-${q._key}`)}
                              strategy={verticalListSortingStrategy}
                            >
                              {uc.questions.map((q, qIdx) => {
                                // Parents potentiels : questions binary placees AVANT celle-ci dans le meme UC.
                                const potentialParents = uc.questions
                                  .slice(0, qIdx)
                                  .filter((p) => p.question_type === "binary");
                                const isConditional = q.parent_key !== null && potentialParents.some((p) => p._key === q.parent_key);
                                return (
                                  <SortableQuestion key={q._key} qKey={q._key}>
                                    {(qHandle) => (
                                      <div style={{
                                        marginBottom: 12,
                                        padding: "12px",
                                        background: "#f5f5f7",
                                        borderRadius: 10,
                                        marginLeft: isConditional ? 28 : 0,
                                        borderLeft: isConditional ? "3px solid #0A7A5A" : undefined,
                                      }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                          {qHandle}
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

                                            {/* Type picker + min_chars_hint (text only) */}
                                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                                              <span style={{ fontSize: 11, fontWeight: 600, color: "#86868B" }}>Type</span>
                                              <select
                                                value={q.question_type}
                                                onChange={(e) => updateQuestion(ucIdx, qIdx, "question_type", e.target.value as QuestionType)}
                                                style={{
                                                  fontSize: 12, fontWeight: 500, color: "#1d1d1f",
                                                  background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)",
                                                  borderRadius: 6, padding: "4px 8px", fontFamily: "inherit", cursor: "pointer",
                                                }}
                                              >
                                                {(Object.entries(QUESTION_TYPE_LABELS) as Array<[QuestionType, string]>).map(([val, label]) => (
                                                  <option key={val} value={val}>{label}</option>
                                                ))}
                                              </select>
                                              {q.question_type === "text" && (
                                                <>
                                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#86868B", marginLeft: 8 }}>Suggestion min. caracteres</span>
                                                  <input
                                                    type="number" min={1} value={q.min_chars_hint}
                                                    onChange={(e) => updateQuestion(ucIdx, qIdx, "min_chars_hint", e.target.value)}
                                                    placeholder="—"
                                                    style={{
                                                      width: 70, fontSize: 12, padding: "4px 8px",
                                                      border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 6,
                                                      background: "#fff", fontFamily: "inherit",
                                                    }}
                                                    title="Suggestion non bloquante affichee au testeur s'il repond plus court"
                                                  />
                                                </>
                                              )}
                                            </div>

                                            {/* Conditionnel : disponible si au moins un parent binary existe */}
                                            {potentialParents.length > 0 && (
                                              <div style={{ marginTop: 8, padding: "8px 10px", background: "#fff", border: "0.5px dashed rgba(0,0,0,0.12)", borderRadius: 8 }}>
                                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#86868B" }}>Conditionnelle ?</span>
                                                  <select
                                                    value={q.parent_key ?? ""}
                                                    onChange={(e) => updateQuestion(ucIdx, qIdx, "parent_key", e.target.value || null)}
                                                    style={{
                                                      fontSize: 12, fontWeight: 500, color: "#1d1d1f",
                                                      background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)",
                                                      borderRadius: 6, padding: "4px 8px", fontFamily: "inherit", cursor: "pointer",
                                                    }}
                                                  >
                                                    <option value="">— Toujours afficher</option>
                                                    {potentialParents.map((p) => {
                                                      const realIdx = uc.questions.findIndex((x) => x._key === p._key);
                                                      const label = (p.question_text || `Question ${realIdx + 1}`).slice(0, 50);
                                                      return <option key={p._key} value={p._key}>Q{realIdx + 1} · {label}</option>;
                                                    })}
                                                  </select>
                                                  {q.parent_key && (
                                                    <>
                                                      <span style={{ fontSize: 11, color: "#86868B" }}>Afficher si reponse =</span>
                                                      {(["yes", "no", "partial"] as BinaryAnswerValue[]).map((v) => (
                                                        <label key={v} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#1d1d1f", cursor: "pointer" }}>
                                                          <input
                                                            type="checkbox"
                                                            checked={q.parent_show_when_values.includes(v)}
                                                            onChange={() => toggleParentShowValue(ucIdx, qIdx, v)}
                                                            style={{ accentColor: "#0A7A5A" }}
                                                          />
                                                          {BINARY_VALUE_LABELS[v]}
                                                        </label>
                                                      ))}
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          {uc.questions.length > 1 && (
                                            <button type="button" onClick={() => removeQuestion(ucIdx, qIdx)} style={removeBtn}>&times;</button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </SortableQuestion>
                                );
                              })}
                            </SortableContext>
                          </DndContext>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </SortableUseCase>
            ))}
          </SortableContext>
        </DndContext>
      )}

      <button onClick={addUseCase} style={{ ...smallBtn, padding: "10px 24px", fontSize: 14, marginTop: 4 }}>
        + Ajouter un cas d&apos;usage
      </button>

      <MissionPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        useCases={useCases}
        projectTitle="Aperçu du test"
        categoryLabel="Prévisualisation staff"
      />

      <ConfirmModal />
    </div>
  );
}
