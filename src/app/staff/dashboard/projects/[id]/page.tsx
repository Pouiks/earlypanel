"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProjectForm from "@/components/staff/ProjectForm";
import ProjectInfoTab from "@/components/staff/ProjectInfoTab";
import ProjectTestersTab from "@/components/staff/ProjectTestersTab";
import ProjectQuestionsTab from "@/components/staff/ProjectQuestionsTab";
import ProjectNdaTab from "@/components/staff/ProjectNdaTab";
import ProjectAnswersTab from "@/components/staff/ProjectAnswersTab";
import ProjectPayoutsTab from "@/components/staff/ProjectPayoutsTab";
import ProjectReviewTab from "@/components/staff/ProjectReviewTab";
import ProjectReportTab from "@/components/staff/ProjectReportTab";
import ProjectFinancesTab from "@/components/staff/ProjectFinancesTab";
import ProjectBriefTab from "@/components/staff/ProjectBriefTab";
import ProjectSommaire, { ALL_SECTIONS, SECTION_LABELS, type SectionId } from "@/components/staff/ProjectSommaire";
import type { ProjectFormData } from "@/components/staff/ProjectForm";
import type { Project, ProjectStatus, ProjectSummary } from "@/types/staff";
import { useConfirm } from "@/components/ui/ConfirmModal";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Brouillon",
  active: "Actif",
  closed: "Terminé",
  archived: "Archivé",
};

const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string }> = {
  draft: { bg: "#f5f5f7", text: "#86868B" },
  active: { bg: "#f0faf5", text: "#0A7A5A" },
  closed: { bg: "#f5f5f7", text: "#1d1d1f" },
  archived: { bg: "#f5f5f7", text: "#6e6e73" },
};

const ALL_STATUSES: ProjectStatus[] = ["draft", "active", "closed", "archived"];

// La section ouverte vit dans le hash (#testers) : un lien profond ou un
// retour navigateur retombe au bon endroit, sans rechargement.
function sectionFromHash(): SectionId {
  if (typeof window === "undefined") return "info";
  const h = window.location.hash.replace(/^#/, "");
  return (ALL_SECTIONS as string[]).includes(h) ? (h as SectionId) : "info";
}

interface NextStep { text: string; section: SectionId; label: string }

/**
 * Bandeau « prochaine etape » : au plus deux actions, dans l'ordre du
 * parcours. Tout est derive du projet et du resume, rien n'est stocke.
 */
function computeNextSteps(project: Project, s: ProjectSummary | null): NextStep[] {
  if (!s) return [];
  const t = s.testers;
  const status = project.status as ProjectStatus;
  const out: NextStep[] = [];

  if (s.questions === 0 && (status === "draft" || status === "active")) {
    out.push({ text: "Aucune question : le questionnaire est à écrire.", section: "questionnaire", label: "Écrire les scénarios" });
  }
  if (s.questions > 0 && t.total === 0 && (status === "draft" || status === "active")) {
    out.push({ text: "Aucun testeur invité.", section: "testers", label: "Inviter des testeurs" });
  }
  if (t.nda_sent_stale > 0) {
    out.push({ text: `${t.nda_sent_stale} NDA en attente de signature depuis plus de 3 jours.`, section: "testers", label: "Voir les testeurs" });
  }
  const toRate = t.completed - t.rated;
  if (toRate > 0) {
    out.push({ text: `${toRate} réponse${toRate > 1 ? "s" : ""} soumise${toRate > 1 ? "s" : ""} à relire et noter.`, section: "answers", label: "Relire" });
  }
  if ((project.quote_amount_cents ?? null) === null && status !== "draft") {
    out.push({ text: "Le devis n'est pas renseigné.", section: "finances", label: "Voir les finances" });
  }
  if (s.payouts.failed > 0) {
    out.push({ text: `${s.payouts.failed} versement${s.payouts.failed > 1 ? "s" : ""} en échec.`, section: "payouts", label: "Voir les versements" });
  } else if (s.payouts.pending > 0 && status === "closed") {
    out.push({ text: `${s.payouts.pending} versement${s.payouts.pending > 1 ? "s" : ""} à payer.`, section: "payouts", label: "Payer" });
  }
  if (status === "closed" && t.completed > 0 && toRate === 0 && s.report !== "published") {
    out.push({ text: s.report === "draft" ? "Le rapport est en brouillon." : "Le rapport est à rédiger.", section: "report", label: s.report === "draft" ? "Livrer le rapport" : "Rédiger le rapport" });
  }
  if (s.report === "published" && project.quote_amount_cents != null && !project.balance_paid_at) {
    out.push({ text: "Rapport livré : le solde est à encaisser.", section: "finances", label: "Voir les finances" });
  }
  return out.slice(0, 2);
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Lecture du hash a l'initialisation : sans risque d'hydratation, le
  // rendu serveur affiche « Chargement… » et n'utilise pas encore `section`.
  const [section, setSection] = useState<SectionId>(sectionFromHash);
  const { confirm, notify, ConfirmModal } = useConfirm();

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/projects/${id}/summary`);
      if (res.ok) setSummary(await res.json());
    } catch {
      // le sommaire s'affiche sans compteurs
    }
  }, [id]);

  const fetchProject = useCallback(async (opts: { silent?: boolean } = {}) => {
    // `loading` demarre a true et n'est jamais remis a true : un refresh
    // (statut, autosave) ne demonte pas les sections enfants (canvas
    // Scenarios) et ne fait pas clignoter la page. `silent` est conserve
    // pour les appelants existants.
    void opts.silent;
    try {
      const res = await fetch(`/api/staff/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.project_questions) {
          data.questions = data.project_questions;
        }
        setProject(data);
      }
    } catch {
      // retry
    } finally {
      setLoading(false);
    }
    fetchSummary();
  }, [id, fetchSummary]);

  useEffect(() => {
    // Chargement initial : tous les setState de fetchProject sont apres un
    // await (pas de rendu en cascade), la regle ne voit pas l'asynchronisme.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProject();
    const onHash = () => setSection(sectionFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [fetchProject]);

  function selectSection(next: SectionId) {
    setSection(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${next}`);
    }
    // Les compteurs peuvent avoir bouge dans la section qu'on quitte.
    fetchSummary();
  }

  async function handleUpdate(data: ProjectFormData) {
    const res = await fetch(`/api/staff/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      await notify({ title: "Erreur", message: err.error || "Erreur lors de la mise à jour" });
      return;
    }

    await fetchProject();
    setEditing(false);
  }

  const [reactivateModal, setReactivateModal] = useState(false);
  const [newEndDate, setNewEndDate] = useState("");

  async function handleStatusChange(newStatus: ProjectStatus) {
    // Déjà dans cet état : ne rien faire (évite un PATCH inutile).
    if (newStatus === project?.status) return;

    if (newStatus === "active" && project?.status !== "draft") {
      setNewEndDate("");
      setReactivateModal(true);
      return;
    }

    // Transitions quasi-destructives : coupent l'envoi de NDA et l'accès
    // testeur aux missions. On confirme explicitement (cf. bandeau d'alerte).
    if (newStatus === "closed" || newStatus === "archived") {
      const ok = await confirm({
        title: newStatus === "closed" ? "Terminer ce projet ?" : "Archiver ce projet ?",
        message:
          "Cela arrête l'envoi de NDA et l'accès des testeurs aux missions en cours. Vous pourrez réactiver le projet ensuite en fixant une nouvelle date de fin.",
        confirmLabel: newStatus === "closed" ? "Terminer" : "Archiver",
        danger: true,
      });
      if (!ok) return;
    }

    await applyStatusChange(newStatus);
  }

  async function applyStatusChange(newStatus: ProjectStatus, extraFields?: Record<string, unknown>) {
    const res = await fetch(`/api/staff/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...extraFields }),
    });

    if (res.ok) {
      setReactivateModal(false);
      await fetchProject();
    } else {
      const err = await res.json();
      await notify({ title: "Erreur", message: err.error || "Erreur" });
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Supprimer ce projet ?",
      message: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;

    setDeleting(true);
    const res = await fetch(`/api/staff/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/staff/dashboard");
    } else {
      setDeleting(false);
      await notify({ title: "Erreur", message: "Erreur lors de la suppression" });
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#86868B", fontSize: 14 }}>
        Chargement…
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", marginBottom: 8 }}>
          Projet introuvable
        </h2>
        <Link href="/staff/dashboard" style={{ fontSize: 14, color: "#0A7A5A", textDecoration: "none" }}>
          Retour aux projets
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setEditing(false)}
            style={{
              fontSize: 13, color: "#86868B", background: "none",
              border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0,
            }}
          >
            &larr; Annuler la modification
          </button>
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: "#1d1d1f",
          letterSpacing: "-0.04em", marginBottom: 28,
        }}>
          Modifier le projet
        </h1>
        <ProjectForm initialData={project} onSubmit={handleUpdate} submitLabel="Enregistrer les modifications" />
      </div>
    );
  }

  const status = project.status as ProjectStatus;
  const nextSteps = computeNextSteps(project, summary);

  return (
    <div className="project-shell">
      <div className="project-sommaire-col">
        <Link href="/staff/dashboard" style={{ display: "block", fontSize: 12, color: "#86868B", textDecoration: "none", padding: "0 12px 6px" }}>
          &larr; Tous les projets
        </Link>
        <ProjectSommaire project={project} summary={summary} active={section} onSelect={selectSection} />
      </div>

      <div className="project-content">
        {/* En-tete de section */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, flexWrap: "wrap", gap: 12,
        }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", margin: 0 }}>
            {SECTION_LABELS[section]}
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setEditing(true)} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#1d1d1f",
              background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
              cursor: "pointer", fontFamily: "inherit", transition: "all 200ms",
            }}>
              Modifier
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#e53e3e",
              background: "#fef2f2", border: "none", borderRadius: 980,
              cursor: "pointer", fontFamily: "inherit", transition: "all 200ms",
              opacity: deleting ? 0.5 : 1,
            }}>
              Supprimer
            </button>
          </div>
        </div>

        {/* A faire : ce qui manque, en une ligne par action, sans couleur d'alerte */}
        {nextSteps.length > 0 && (
          <div style={{
            background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 16,
            padding: "12px 16px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.06em" }}>À faire</div>
            {nextSteps.map((n) => (
              <div key={n.text} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: "#1d1d1f" }}>{n.text}</div>
                <button
                  type="button"
                  onClick={() => selectSection(n.section)}
                  style={{
                    fontSize: 13, fontWeight: 600, color: "#0A7A5A", background: "none",
                    border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  }}
                >
                  {n.label} &rarr;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Statut : inchange, replie sous la forme d'une ligne */}
        <div style={{
          background: "#fff", borderRadius: 16,
          border: "0.5px solid rgba(0,0,0,0.08)", padding: "10px 16px",
          marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", marginRight: 4 }}>Statut</span>
          {ALL_STATUSES.map((s) => (
            <button key={s} onClick={() => handleStatusChange(s)} style={{
              padding: "5px 12px", fontSize: 12,
              fontWeight: s === status ? 700 : 500,
              color: s === status ? STATUS_COLORS[s].text : "#6e6e73",
              background: s === status ? STATUS_COLORS[s].bg : "transparent",
              border: s === status ? `1.5px solid ${STATUS_COLORS[s].text}` : "1px solid rgba(0,0,0,0.08)",
              borderRadius: 980, cursor: "pointer", fontFamily: "inherit", transition: "all 200ms",
            }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
          {status === "draft" && (
            <span style={{ fontSize: 12, color: "#1d1d1f", marginLeft: "auto" }}>
              Le premier envoi de NDA passe le projet en Actif.
            </span>
          )}
          {(status === "closed" || status === "archived") && (
            <span style={{ fontSize: 12, color: "#6e6e73", marginLeft: "auto" }}>
              Plus d&apos;envoi de NDA ni d&apos;assignation de testeurs.
            </span>
          )}
        </div>

        {/* Section ouverte */}
        {section === "info" && <ProjectInfoTab project={project} />}
        {section === "brief" && <ProjectBriefTab projectId={id} onChange={fetchSummary} />}
        {section === "finances" && <ProjectFinancesTab project={project} />}
        {section === "questionnaire" && (
          <ProjectQuestionsTab
            projectId={id}
            questions={project.questions ?? []}
            onUpdate={() => fetchProject({ silent: true })}
          />
        )}
        {section === "nda" && <ProjectNdaTab projectId={id} companyName={project.company_name || ""} />}
        {section === "testers" && <ProjectTestersTab projectId={id} />}
        {section === "answers" && <ProjectAnswersTab projectId={id} />}
        {section === "review" && <ProjectReviewTab projectId={id} />}
        {section === "payouts" && <ProjectPayoutsTab projectId={id} />}
        {section === "report" && <ProjectReportTab projectId={id} />}
      </div>

      {reactivateModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setReactivateModal(false)}>
          <div style={{
            background: "#fff", borderRadius: 20, padding: "32px", width: "100%", maxWidth: 400,
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
              Réactiver le projet
            </h3>
            <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 20px", lineHeight: 1.5 }}>
              Choisissez une nouvelle date et heure de fin pour ce projet. Il sera automatiquement clôturé à cette échéance.
            </p>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
              Date et heure de fin *
            </label>
            <input
              type="datetime-local"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              style={{
                width: "100%", padding: "12px 14px", fontSize: 14,
                border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 12,
                outline: "none", background: "#f5f5f7", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setReactivateModal(false)} style={{
                padding: "10px 20px", fontSize: 13, fontWeight: 500, color: "#6e6e73",
                background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Annuler
              </button>
              <button
                disabled={!newEndDate}
                onClick={() => applyStatusChange("active", { end_date: new Date(newEndDate).toISOString() })}
                style={{
                  padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#fff",
                  background: newEndDate ? "#0A7A5A" : "#ccc", border: "none", borderRadius: 980,
                  cursor: newEndDate ? "pointer" : "default", fontFamily: "inherit", transition: "all 200ms",
                }}
              >
                Réactiver →
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal />

      <style jsx>{`
        /* Le layout staff pose un padding horizontal de 40px : la colonne
           sommaire le compense pour toucher la sidebar, comme la maquette. */
        .project-shell {
          display: flex;
          align-items: flex-start;
          margin-left: -40px;
          margin-top: -8px;
          min-height: calc(100vh - 76px);
        }
        .project-sommaire-col {
          width: 248px;
          flex-shrink: 0;
          background: #fff;
          border-right: 0.5px solid rgba(0,0,0,0.08);
          padding: 20px 12px 24px;
          position: sticky;
          top: 0;
          max-height: 100vh;
          overflow-y: auto;
          box-sizing: border-box;
        }
        .project-content {
          flex: 1;
          min-width: 0;
          padding: 20px 0 0 32px;
        }
        @media (max-width: 768px) {
          .project-shell {
            flex-direction: column;
            margin-left: -20px;
            margin-right: -20px;
          }
          .project-sommaire-col {
            width: 100%;
            position: static;
            max-height: none;
            border-right: none;
            border-bottom: 0.5px solid rgba(0,0,0,0.08);
          }
          .project-content {
            padding: 16px 20px 0;
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
}
