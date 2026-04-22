"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Project, ProjectStatus } from "@/types/staff";

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

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "draft", label: "Brouillons" },
  { value: "active", label: "Actifs" },
  { value: "closed", label: "Terminés" },
  { value: "archived", label: "Archivés" },
];

export default function StaffDashboardPage() {
  const [projects, setProjects] = useState<(Project & { project_questions?: { id: string }[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchProjects();
  }, [filter]);

  async function fetchProjects() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/staff/projects?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setFetchError("Session expirée ou accès non autorisé. Reconnectez-vous au portail staff.");
        } else {
          setFetchError((err as { error?: string }).error || `Erreur ${res.status}`);
        }
        setProjects([]);
      }
    } catch {
      setFetchError("Impossible de joindre le serveur.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#1d1d1f",
          letterSpacing: "-0.04em",
          margin: 0,
        }}>
          Projets
        </h1>
        <Link
          href="/staff/dashboard/projects/new"
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            background: "#0A7A5A",
            border: "none",
            borderRadius: 980,
            textDecoration: "none",
            transition: "opacity 200ms",
          }}
        >
          + Nouveau projet
        </Link>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: filter === opt.value ? 600 : 400,
              color: filter === opt.value ? "#0A7A5A" : "#6e6e73",
              background: filter === opt.value ? "#f0faf5" : "transparent",
              border: filter === opt.value ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
              borderRadius: 980,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 200ms",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {fetchError && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
          padding: "14px 18px", marginBottom: 20, color: "#b91c1c", fontSize: 14,
        }}>
          {fetchError}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#86868B", fontSize: 14 }}>
          Chargement…
        </div>
      ) : fetchError ? null : projects.length === 0 ? (
        <div style={{
          background: "#fff",
          borderRadius: 20,
          border: "0.5px solid rgba(0,0,0,0.08)",
          padding: "60px 40px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📂</div>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#1d1d1f",
            marginBottom: 8,
            letterSpacing: "-0.03em",
          }}>
            Aucun projet
          </h2>
          <p style={{ fontSize: 14, color: "#86868B", marginBottom: 24, lineHeight: 1.5 }}>
            {filter !== "all"
              ? `Aucun projet avec le statut "${FILTER_OPTIONS.find((o) => o.value === filter)?.label}".`
              : "Créez votre premier projet pour commencer à recruter des testeurs."}
          </p>
          {filter === "all" && (
            <Link
              href="/staff/dashboard/projects/new"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                background: "#0A7A5A",
                borderRadius: 980,
                textDecoration: "none",
              }}
            >
              Créer un projet
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {projects.map((project) => {
            const status = project.status as ProjectStatus;
            const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
            const qCount = project.project_questions?.length ?? 0;

            return (
              <Link
                key={project.id}
                href={`/staff/dashboard/projects/${project.id}`}
                style={{
                  display: "block",
                  background: "#fff",
                  borderRadius: 16,
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  padding: "20px 24px",
                  textDecoration: "none",
                  transition: "box-shadow 200ms, transform 100ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#1d1d1f",
                      letterSpacing: "-0.02em",
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {project.title}
                    </h3>
                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#86868B",
                      marginBottom: 6,
                    }}>
                      {project.company_name && (
                        <span>{project.company_name}</span>
                      )}
                      {project.sector && (
                        <>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span>{project.sector}</span>
                        </>
                      )}
                      {qCount > 0 && (
                        <>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span>{qCount} question{qCount > 1 ? "s" : ""}</span>
                        </>
                      )}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: "#6e6e73",
                      lineHeight: 1.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}>
                      <span>
                        <span style={{ fontWeight: 600, color: "#86868b" }}>Fiche créée : </span>
                        {formatDate(project.created_at)}
                      </span>
                      <span>
                        <span style={{ fontWeight: 600, color: "#86868b" }}>Début campagne : </span>
                        {formatDateTime(project.start_date)}
                        <span style={{ opacity: 0.35, margin: "0 6px" }}>|</span>
                        <span style={{ fontWeight: 600, color: "#86868b" }}>Fin campagne : </span>
                        {formatDateTime(project.end_date)}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    padding: "5px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.text,
                    background: colors.bg,
                    borderRadius: 980,
                    whiteSpace: "nowrap",
                  }}>
                    {STATUS_LABELS[status] || status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
