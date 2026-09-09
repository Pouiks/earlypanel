"use client";

import type { Project, ProjectStatus, ProjectSummary } from "@/types/staff";

/**
 * Sommaire d'un projet : colonne de gauche de la fiche, a la place des
 * onglets. Une section a l'ecran a la fois ; chaque ligne dit ou en est la
 * section (fait / en cours / a faire / attention) et porte un compteur.
 *
 * Les etats sont derives de `ProjectSummary` (une requete) et du projet
 * deja charge : aucun appel supplementaire.
 */

export type SectionId =
  | "info" | "brief" | "finances"
  | "questionnaire" | "nda"
  | "testers" | "answers" | "review"
  | "payouts" | "report";

export const SECTION_LABELS: Record<SectionId, string> = {
  info: "Informations",
  brief: "Brief client",
  finances: "Finances",
  questionnaire: "Scénarios",
  nda: "NDA",
  testers: "Testeurs",
  answers: "Réponses",
  review: "Dépouillement",
  payouts: "Versements",
  report: "Rapport",
};

export const ALL_SECTIONS = Object.keys(SECTION_LABELS) as SectionId[];

const GROUPS: { title: string; sections: SectionId[] }[] = [
  { title: "Cadrage", sections: ["info", "brief", "finances"] },
  { title: "Test", sections: ["questionnaire", "nda"] },
  { title: "Terrain", sections: ["testers", "answers", "review"] },
  { title: "Clôture", sections: ["payouts", "report"] },
];

type State = "done" | "progress" | "todo" | "warn";

interface Line { state: State; meta: string | null }

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Brouillon", active: "Actif", closed: "Terminé", archived: "Archivé",
};
const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string }> = {
  draft: { bg: "#f5f5f7", text: "#86868B" },
  active: { bg: "#f0faf5", text: "#0A7A5A" },
  closed: { bg: "#fef2f2", text: "#e53e3e" },
  archived: { bg: "#f5f5f7", text: "#6e6e73" },
};

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** Etat + libelle court de chaque section. Exporte pour le bandeau « prochaine etape ». */
export function sectionLines(project: Project, s: ProjectSummary | null): Record<SectionId, Line> {
  const t = s?.testers;
  const signedOrBeyond = t ? t.nda_signed + t.in_progress + t.completed : 0;
  const headcount = project.target_headcount ?? null;
  const quote = project.quote_amount_cents ?? null;

  return {
    info: { state: "done", meta: null },
    brief: !s || s.documents === 0
      ? { state: "todo", meta: "Aucun fichier" }
      : { state: "done", meta: s.documents === 1 ? "1 fichier" : `${s.documents} fichiers` },
    finances: quote === null
      ? { state: project.status === "draft" ? "todo" : "warn", meta: "Devis à saisir" }
      : project.balance_paid_at
        ? { state: "done", meta: EUR.format(quote / 100) }
        : { state: "progress", meta: project.deposit_paid_at ? "Solde à encaisser" : "Acompte à encaisser" },
    questionnaire: !s
      ? { state: "todo", meta: null }
      : s.questions === 0
        ? { state: "todo", meta: "Aucune question" }
        : { state: "done", meta: `${s.use_cases} · ${s.questions} question${s.questions > 1 ? "s" : ""}` },
    nda: !s
      ? { state: "todo", meta: null }
      : t && t.total > 0
        ? { state: signedOrBeyond === t.total ? "done" : t.nda_sent_stale > 0 ? "warn" : "progress", meta: `${signedOrBeyond} / ${t.total} signés` }
        : { state: s.nda_exists ? "done" : "todo", meta: s.nda_exists ? "Rédigé" : "Modèle par défaut" },
    testers: !t || t.total === 0
      ? { state: "todo", meta: headcount ? `0 / ${headcount}` : null }
      : { state: headcount && t.total >= headcount ? "done" : "progress", meta: headcount ? `${t.total} / ${headcount}` : String(t.total) },
    answers: !t || t.completed === 0
      ? { state: "todo", meta: t && t.in_progress > 0 ? `${t.in_progress} en cours` : null }
      : { state: t.completed === t.total ? "done" : "progress", meta: `${t.completed} soumis` },
    review: !t || t.completed === 0
      ? { state: "todo", meta: null }
      : { state: t.rated === t.completed ? "done" : "progress", meta: `${t.rated} / ${t.completed} notés` },
    payouts: !s || s.payouts.total === 0
      ? { state: "todo", meta: null }
      : s.payouts.failed > 0
        ? { state: "warn", meta: `${s.payouts.failed} en échec` }
        : { state: s.payouts.paid === s.payouts.total ? "done" : "progress", meta: `${s.payouts.paid} / ${s.payouts.total} payés` },
    report: !s || !s.report
      ? { state: "todo", meta: null }
      : s.report === "published"
        ? { state: "done", meta: "Livré" }
        : { state: "progress", meta: "Brouillon" },
  };
}

function StateIcon({ state }: { state: State }) {
  if (state === "done") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  const dot: React.CSSProperties = state === "progress"
    ? { background: "#0A7A5A" }
    : state === "warn"
      ? { border: "1.5px solid #b45309" }
      : { border: "1.5px solid #c7c7cc" };
  return (
    <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden>
      <span style={{ width: 7, height: 7, borderRadius: "50%", ...dot }} />
    </span>
  );
}

interface Props {
  project: Project;
  summary: ProjectSummary | null;
  active: SectionId;
  onSelect: (id: SectionId) => void;
}

export default function ProjectSommaire({ project, summary, active, onSelect }: Props) {
  const lines = sectionLines(project, summary);
  const status = project.status as ProjectStatus;
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.draft;

  return (
    <nav className="project-sommaire" aria-label="Sections du projet">
      <div className="project-sommaire-head">
        <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", letterSpacing: "0.04em" }}>{project.ref_number ?? "Projet"}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em", lineHeight: 1.3, marginTop: 4 }}>{project.title}</div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 10px",
          borderRadius: 980, background: colors.bg, color: colors.text, fontSize: 11, fontWeight: 600,
        }}>
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      {GROUPS.map((g) => (
        <div key={g.title} className="project-sommaire-group">
          <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.06em", padding: "8px 12px 4px" }}>
            {g.title}
          </div>
          {g.sections.map((id) => {
            const line = lines[id];
            const isActive = id === active;
            const metaColor = line.state === "warn" ? "#b45309" : "#86868B";
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 12px", borderRadius: 10, border: "none", textAlign: "left",
                  fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#0A7A5A" : line.state === "todo" ? "#86868B" : "#1d1d1f",
                  background: isActive ? "#f0faf5" : "transparent",
                  transition: "all 200ms",
                }}
              >
                <StateIcon state={line.state} />
                <span style={{ flex: 1 }}>{SECTION_LABELS[id]}</span>
                {line.meta && (
                  <span style={{ fontSize: 11, color: isActive ? "#0A7A5A" : metaColor, whiteSpace: "nowrap" }}>{line.meta}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
