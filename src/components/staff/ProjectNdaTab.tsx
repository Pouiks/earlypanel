"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ProjectNda } from "@/types/staff";
import { NDA_VARIABLE_LIST } from "@/lib/nda-pdf";

const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor"), { ssr: false });

interface ProjectNdaTabProps {
  projectId: string;
  companyName: string;
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6,
};

function VariableReference() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "12px 16px", display: "flex",
          alignItems: "center", justifyContent: "space-between",
          background: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
          Variables disponibles
        </span>
        <span style={{
          fontSize: 10, color: "#86868B",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 200ms",
        }}>▼</span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          <p style={{ fontSize: 12, color: "#86868B", margin: "0 0 12px", lineHeight: 1.5 }}>
            Utilisez ces variables dans votre NDA avec la syntaxe <code style={{
              background: "#f0faf5", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 11,
              color: "#0A7A5A",
            }}>{"{{variable}}"}</code>. Elles seront automatiquement remplacées par les vraies valeurs lors de la signature.
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
          }}>
            {NDA_VARIABLE_LIST.map((v) => (
              <div key={v.key} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                background: "#f5f5f7", borderRadius: 8, fontSize: 11,
              }}>
                <code style={{
                  fontFamily: "monospace", fontSize: 10, color: "#0A7A5A",
                  background: "#f0faf5", padding: "2px 6px", borderRadius: 4,
                  whiteSpace: "nowrap", fontWeight: 600,
                }}>{`{{${v.key}}}`}</code>
                <span style={{ color: "#6e6e73", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {v.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectNdaTab({ projectId, companyName }: ProjectNdaTabProps) {
  const [nda, setNda] = useState<ProjectNda | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("Accord de confidentialité (NDA)");
  const [contentHtml, setContentHtml] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const fetchNda = useCallback(async () => {
    const res = await fetch(`/api/staff/projects/${projectId}/nda`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        setNda(data);
        setTitle(data.title);
        setContentHtml(data.content_html);
      }
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchNda(); }, [fetchNda]);

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/nda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const data = await res.json();
        setNda(data);
        setTitle(data.title);
        setContentHtml(data.content_html);
        showToast("NDA créé avec le template par défaut");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/nda`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content_html: contentHtml }),
      });
      if (res.ok) {
        const data = await res.json();
        setNda(data);
        showToast("NDA enregistré");
      }
    } finally {
      setSaving(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "#86868B", fontSize: 14 }}>Chargement…</div>;
  }

  if (!nda) {
    return (
      <div style={{
        background: "#fff", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.08)",
        padding: "48px 32px", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
          Aucun NDA configuré
        </h3>
        <p style={{ fontSize: 14, color: "#86868B", margin: "0 0 24px", maxWidth: 400, marginInline: "auto" }}>
          Créez un accord de confidentialité pour ce projet. Un template standard sera généré automatiquement
          {companyName ? ` pour ${companyName}` : ""}.
        </p>
        <button onClick={handleCreate} disabled={saving} style={{
          padding: "12px 28px", fontSize: 14, fontWeight: 700, color: "#fff",
          background: "#0A7A5A", border: "none", borderRadius: 980,
          cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1,
        }}>
          {saving ? "Création…" : "Créer le NDA"}
        </button>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: "#0A7A5A", color: "#fff", padding: "12px 24px",
          borderRadius: 12, fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          animation: "fadeIn 200ms",
        }}>
          {toast}
        </div>
      )}

      <div style={{
        background: "#fff", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.08)",
        padding: "28px 28px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>
            Accord de confidentialité
          </h3>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "8px 22px", fontSize: 13, fontWeight: 700, color: "#fff",
            background: "#0A7A5A", border: "none", borderRadius: 980,
            cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Titre du document</label>
          <input
            type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", fontSize: 14,
              border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10,
              outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Contenu du NDA</label>
          <div style={{
            border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 12,
            overflow: "hidden", background: "#fff",
          }}>
            <RichTextEditor
              content={contentHtml}
              onChange={setContentHtml}
              placeholder="Rédigez ou modifiez les termes de l'accord de confidentialité…"
            />
          </div>
        </div>

        <div style={{
          padding: "16px 20px", background: "#f5f5f7", borderRadius: 12,
          fontSize: 12, color: "#86868B", lineHeight: 1.6, marginBottom: 16,
        }}>
          <strong style={{ color: "#1d1d1f" }}>Fonctionnement :</strong> Lorsque vous envoyez le NDA aux testeurs
          sélectionnés, ils reçoivent un email les invitant à signer le document dans leur espace personnel.
          La signature est tracée (horodatage, IP, hash SHA-256) et un PDF signé est généré automatiquement.
        </div>

        <VariableReference />
      </div>
    </div>
  );
}
