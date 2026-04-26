"use client";

import { useState, useEffect, use } from "react";
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
import type { ProjectFormData } from "@/components/staff/ProjectForm";
import type { Project, ProjectStatus } from "@/types/staff";
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
  closed: { bg: "#fef2f2", text: "#e53e3e" },
  archived: { bg: "#f5f5f7", text: "#6e6e73" },
};

const ALL_STATUSES: ProjectStatus[] = ["draft", "active", "closed", "archived"];

type TabId = "info" | "testers" | "nda" | "questionnaire" | "answers" | "review" | "payouts" | "report";

const TABS: { id: TabId; label: string }[] = [
  { id: "info", label: "Informations" },
  { id: "testers", label: "Testeurs" },
  { id: "nda", label: "NDA" },
  { id: "questionnaire", label: "Scénarios" },
  { id: "answers", label: "Réponses" },
  { id: "review", label: "Dépouillement" },
  { id: "payouts", label: "Versements" },
  { id: "report", label: "Rapport" },
];

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const { confirm, notify, ConfirmModal } = useConfirm();

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function fetchProject() {
    setLoading(true);
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
    if (newStatus === "active" && project?.status !== "draft") {
      setNewEndDate("");
      setReactivateModal(true);
      return;
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
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.draft;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/staff/dashboard" style={{ fontSize: 13, color: "#86868B", textDecoration: "none" }}>
          &larr; Retour aux projets
        </Link>
      </div>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: "#1d1d1f",
            letterSpacing: "-0.04em", margin: "0 0 8px",
          }}>
            {project.title}
          </h1>
          <span style={{
            display: "inline-block", padding: "5px 14px", fontSize: 12,
            fontWeight: 600, color: statusColors.text, background: statusColors.bg, borderRadius: 980,
          }}>
            {STATUS_LABELS[status]}
          </span>
        </div>
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

      {/* Status bar */}
      <div style={{
        background: "#fff", borderRadius: 16,
        border: "0.5px solid rgba(0,0,0,0.08)", padding: "12px 20px",
        marginBottom: 20, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>Statut :</span>
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => handleStatusChange(s)} style={{
            padding: "6px 14px", fontSize: 12,
            fontWeight: s === status ? 700 : 500,
            color: s === status ? STATUS_COLORS[s].text : "#6e6e73",
            background: s === status ? STATUS_COLORS[s].bg : "transparent",
            border: s === status ? `1.5px solid ${STATUS_COLORS[s].text}` : "1px solid rgba(0,0,0,0.08)",
            borderRadius: 980, cursor: "pointer", fontFamily: "inherit", transition: "all 200ms",
          }}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {status === "draft" && (
        <div style={{
          background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12,
          padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#92400e",
        }}>
          <strong>Brouillon.</strong> Vous pouvez préparer testeurs et NDA. Le premier envoi de NDA passe le projet en <strong>Actif</strong> et ouvre les missions côté testeurs.
        </div>
      )}
      {(status === "closed" || status === "archived") && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
          padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#b91c1c",
        }}>
          Projet terminé ou archivé : plus d&apos;envoi de NDA ni d&apos;assignation de testeurs.
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 24,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 24px", fontSize: 14,
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? "#0A7A5A" : "#6e6e73",
              background: "none", border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #0A7A5A" : "2px solid transparent",
              cursor: "pointer", fontFamily: "inherit", transition: "all 200ms",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "info" && <ProjectInfoTab project={project} />}
      {activeTab === "testers" && <ProjectTestersTab projectId={id} />}
      {activeTab === "nda" && <ProjectNdaTab projectId={id} companyName={project.company_name || ""} />}
      {activeTab === "questionnaire" && (
        <ProjectQuestionsTab
          projectId={id}
          questions={project.questions ?? []}
          onUpdate={fetchProject}
        />
      )}
      {activeTab === "answers" && <ProjectAnswersTab projectId={id} />}
      {activeTab === "review" && <ProjectReviewTab projectId={id} />}
      {activeTab === "payouts" && <ProjectPayoutsTab projectId={id} />}
      {activeTab === "report" && <ProjectReportTab projectId={id} />}

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
    </div>
  );
}
