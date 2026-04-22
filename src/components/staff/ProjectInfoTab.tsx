"use client";

import type { Project } from "@/types/staff";

interface ProjectInfoTabProps {
  project: Project;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: "#86868B", display: "block", marginBottom: 2 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#1d1d1f", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function ProjectInfoTab({ project }: ProjectInfoTabProps) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{
          background: "#fff",
          borderRadius: 20,
          border: "0.5px solid rgba(0,0,0,0.08)",
          padding: "24px",
        }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, color: "#1d1d1f",
            letterSpacing: "-0.02em", marginBottom: 16,
          }}>Client</h2>
          <InfoRow label="Société" value={project.company_name} />
          <InfoRow label="Secteur" value={project.sector} />
          <InfoRow label="Contact" value={
            [project.contact_first_name, project.contact_last_name].filter(Boolean).join(" ") || null
          } />
          <InfoRow label="Email" value={project.contact_email} />
          <InfoRow label="Téléphone" value={project.contact_phone} />
        </div>

        <div style={{
          background: "#fff",
          borderRadius: 20,
          border: "0.5px solid rgba(0,0,0,0.08)",
          padding: "24px",
        }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, color: "#1d1d1f",
            letterSpacing: "-0.02em", marginBottom: 16,
          }}>Ciblage</h2>
          <InfoRow label="Genre" value={project.target_gender?.length ? project.target_gender.join(", ") : null} />
          <InfoRow label="Âge" value={
            project.target_age_min || project.target_age_max
              ? `${project.target_age_min ?? "–"} à ${project.target_age_max ?? "–"} ans`
              : null
          } />
          <InfoRow label="CSP" value={project.target_csp?.length ? project.target_csp.join(", ") : null} />
          {project.target_sector_restricted && (
            <InfoRow label="Domaine restreint" value={project.target_sector} />
          )}
          <InfoRow label="Lieux" value={project.target_locations?.length ? project.target_locations.join(", ") : null} />
        </div>
      </div>

      {project.urls?.length > 0 && (
        <div style={{
          background: "#fff", borderRadius: 20,
          border: "0.5px solid rgba(0,0,0,0.08)", padding: "24px", marginTop: 20,
        }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, color: "#1d1d1f",
            letterSpacing: "-0.02em", marginBottom: 12,
          }}>URLs à tester</h2>
          {project.urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", fontSize: 14, color: "#0A7A5A", marginBottom: 6, wordBreak: "break-all" }}>
              {url}
            </a>
          ))}
        </div>
      )}

      {project.description && (
        <div style={{
          background: "#fff", borderRadius: 20,
          border: "0.5px solid rgba(0,0,0,0.08)", padding: "24px", marginTop: 20,
        }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, color: "#1d1d1f",
            letterSpacing: "-0.02em", marginBottom: 12,
          }}>Description</h2>
          <div
            style={{ fontSize: 14, lineHeight: 1.7, color: "#1d1d1f" }}
            dangerouslySetInnerHTML={{ __html: project.description }}
          />
        </div>
      )}
    </div>
  );
}
