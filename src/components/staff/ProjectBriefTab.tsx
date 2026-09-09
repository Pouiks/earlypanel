"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import type { ProjectDocument } from "@/types/staff";
import { formatBytes, MAX_DOCUMENTS_PER_PROJECT } from "@/lib/document-validation";
import { useConfirm } from "@/components/ui/ConfirmModal";

/**
 * Section « Brief client » : les fichiers recus du client, deposes tels
 * quels. Visible par le staff uniquement, jamais par les testeurs. Le
 * contexte redige (objectif, perimetre, consignes) reste dans Informations.
 */

interface Props {
  projectId: string;
  /** Appele apres un depot ou une suppression, pour rafraichir le sommaire. */
  onChange?: () => void;
}

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.08)", padding: 24,
};

function dateFr(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function FileIcon({ mime }: { mime: string }) {
  const isPdf = mime === "application/pdf";
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      {isPdf ? <path d="M8 15h8M8 18h5" /> : <path d="M8 13h8M8 16h8M8 19h4" />}
    </svg>
  );
}

export default function ProjectBriefTab({ projectId, onChange }: Props) {
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/documents`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Erreur de chargement");
        return;
      }
      const data = await res.json();
      setDocs((data.documents ?? []) as ProjectDocument[]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file, file.name);
        const res = await fetch(`/api/staff/projects/${projectId}/documents`, { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(`${file.name} : ${err.error || "envoi impossible"}`);
          break;
        }
      }
      await load();
      onChange?.();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(doc: ProjectDocument) {
    const ok = await confirm({
      title: "Supprimer ce document ?",
      message: `« ${doc.file_name} » sera retiré du projet et du stockage. Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    const res = await fetch(`/api/staff/projects/${projectId}/documents/${doc.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Suppression impossible");
      return;
    }
    await load();
    onChange?.();
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files?.length) upload(e.dataTransfer.files);
  }

  const full = docs.length >= MAX_DOCUMENTS_PER_PROJECT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em", margin: 0 }}>Brief client</h2>
            <p style={{ fontSize: 12, color: "#86868B", margin: "4px 0 0" }}>
              Visible par le staff uniquement. Déposé tel que reçu, rien à ressaisir. PDF ou texte, 10 Mo maximum.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || full}
            style={{
              padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "#0A7A5A",
              background: "#f0faf5", border: "1.5px solid #0A7A5A", borderRadius: 980,
              cursor: uploading || full ? "default" : "pointer", fontFamily: "inherit",
              opacity: uploading || full ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >
            {uploading ? "Envoi…" : "+ Déposer un fichier"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            multiple
            hidden
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `1.5px dashed ${dragging ? "#0A7A5A" : "rgba(0,0,0,0.15)"}`,
            background: dragging ? "#f0faf5" : "#fafafa",
            borderRadius: 12, padding: "18px 16px", textAlign: "center",
            fontSize: 13, color: "#6e6e73", transition: "all 150ms",
          }}
        >
          {full
            ? `${MAX_DOCUMENTS_PER_PROJECT} documents maximum : supprimez-en un pour en déposer un autre.`
            : "Glissez le brief ici, ou utilisez le bouton."}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{error}</div>
        )}
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em", margin: "0 0 14px" }}>
          Documents{docs.length > 0 ? ` (${docs.length})` : ""}
        </h2>
        {loading ? (
          <p style={{ fontSize: 13, color: "#86868B", margin: 0 }}>Chargement…</p>
        ) : docs.length === 0 ? (
          <p style={{ fontSize: 13, color: "#86868B", margin: 0 }}>Aucun document déposé pour ce projet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {docs.map((d) => (
              <div key={d.id} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12,
              }}>
                <FileIcon mime={d.mime_type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.file_name}</div>
                  <div style={{ fontSize: 12, color: "#86868B" }}>
                    {[dateFr(d.created_at), formatBytes(d.size_bytes), d.uploaded_by_name ? `déposé par ${d.uploaded_by_name}` : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: "#0A7A5A", textDecoration: "none", whiteSpace: "nowrap" }}>
                    Ouvrir
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: "#86868B" }}>Lien indisponible</span>
                )}
                <button
                  type="button"
                  onClick={() => remove(d)}
                  style={{ fontSize: 12, fontWeight: 600, color: "#e53e3e", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 6px" }}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmModal />
    </div>
  );
}
