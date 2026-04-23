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

      {(project.business_objective || (project.scope_included && project.scope_included.length > 0) || project.client_guidelines || project.test_type) && (
        <div style={{
          background: "#fff", borderRadius: 20,
          border: "0.5px solid rgba(0,0,0,0.08)", padding: "24px", marginTop: 20,
        }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, color: "#1d1d1f",
            letterSpacing: "-0.02em", marginBottom: 16,
          }}>Contexte du rapport</h2>
          <InfoRow label="Objectif business" value={project.business_objective} />
          {project.scope_included && project.scope_included.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#86868B", display: "block", marginBottom: 4 }}>Périmètre inclus</span>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#1d1d1f" }}>
                {project.scope_included.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
              </ul>
            </div>
          )}
          {project.scope_excluded && project.scope_excluded.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#86868B", display: "block", marginBottom: 4 }}>Hors périmètre</span>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#6e6e73", fontStyle: "italic" }}>
                {project.scope_excluded.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
              </ul>
            </div>
          )}
          <InfoRow label="Consignes client" value={project.client_guidelines} />
          <InfoRow label="Type de test" value={project.test_type === "moderated" ? "Modéré" : project.test_type === "unmoderated" ? "Non modéré" : null} />
          {project.audit_enabled && (
            <div style={{ marginTop: 10 }}>
              <span style={{
                display: "inline-block", padding: "4px 10px", fontSize: 11,
                fontWeight: 600, color: "#0A7A5A", background: "#f0faf5",
                borderRadius: 980, border: "1px solid rgba(10,122,90,0.2)",
                marginBottom: 12,
              }}>Audit Lighthouse inclus</span>

              {(project.audit_performance_score != null || project.audit_accessibility_score != null || project.audit_seo_score != null || project.audit_best_practices_score != null) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                  {([
                    { label: "Performance", score: project.audit_performance_score },
                    { label: "Accessibilité", score: project.audit_accessibility_score },
                    { label: "SEO", score: project.audit_seo_score },
                    { label: "Bonnes pratiques", score: project.audit_best_practices_score },
                  ] as const).map((item) => (
                    <div key={item.label} style={{ textAlign: "center", padding: "10px", background: "#f5f5f7", borderRadius: 10 }}>
                      <div style={{
                        fontSize: 22, fontWeight: 700, marginBottom: 4,
                        color: item.score == null ? "#86868B" : item.score >= 90 ? "#0A7A5A" : item.score >= 50 ? "#d97706" : "#dc2626",
                      }}>
                        {item.score ?? "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#86868B", fontWeight: 600 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {project.audit_findings && project.audit_findings.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: "#86868B", display: "block", marginBottom: 6 }}>Constats</span>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#1d1d1f", lineHeight: 1.7 }}>
                    {project.audit_findings.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
