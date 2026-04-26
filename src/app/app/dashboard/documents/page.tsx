"use client";

import { useState, useEffect } from "react";
import { useConfirm } from "@/components/ui/ConfirmModal";

interface NdaDocument {
  id: string;
  project_id: string;
  status: string;
  nda_sent_at: string | null;
  nda_signed_at: string | null;
  nda_document_url: string | null;
  project: { title: string; company_name: string | null } | null;
  nda: { title: string; content_html: string } | null;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<NdaDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<NdaDocument | null>(null);
  const { confirm, notify, ConfirmModal } = useConfirm();

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/testers/documents");
      if (res.ok) setDocuments(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleSign(projectId: string) {
    const ok = await confirm({
      title: "Signer le NDA",
      message:
        "En cliquant sur « Confirmer », vous déclarez avoir lu et accepter les termes de cet accord de confidentialité.",
      confirmLabel: "Confirmer",
    });
    if (!ok) return;

    setSigning(projectId);
    try {
      const res = await fetch(`/api/testers/documents/${projectId}/sign`, { method: "POST" });
      if (res.ok) {
        await fetchDocuments();
        setPreviewDoc(null);
      } else {
        const err = await res.json();
        await notify({ title: "Erreur", message: err.error || "Erreur lors de la signature" });
      }
    } finally {
      setSigning(null);
    }
  }

  const pending = documents.filter((d) => d.status === "nda_sent");
  const signed = documents.filter((d) => d.status !== "nda_sent");

  return (
    <div>
      <h1 style={{
        fontSize: 24, fontWeight: 700, color: "#1d1d1f",
        margin: "0 0 4px", letterSpacing: "-0.04em",
      }}>
        Mes documents
      </h1>
      <p style={{ fontSize: 14, color: "#86868B", margin: "0 0 28px" }}>
        Retrouvez vos accords de confidentialité et documents contractuels
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#86868B", fontSize: 14 }}>
          Chargement…
        </div>
      ) : (
        <>
          {/* Pending signatures */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{
                fontSize: 16, fontWeight: 700, color: "#1d1d1f",
                margin: "0 0 14px", letterSpacing: "-0.03em",
              }}>
                En attente de signature ({pending.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pending.map((doc) => (
                  <div key={doc.id} style={{
                    background: "#fff", borderRadius: 16,
                    border: "1.5px solid #F5C542", padding: "20px 24px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: "#fef3c7", display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 20,
                      }}>🔒</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>
                          {doc.nda?.title || "Accord de confidentialité"}
                        </p>
                        <p style={{ fontSize: 12, color: "#86868B", margin: "2px 0 0" }}>
                          {doc.project?.title || "Projet"}{doc.project?.company_name ? ` — ${doc.project.company_name}` : ""}
                        </p>
                        {doc.nda_sent_at && (
                          <p style={{ fontSize: 11, color: "#b45309", margin: "4px 0 0" }}>
                            Envoyé le {new Date(doc.nda_sent_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        style={{
                          padding: "9px 18px", fontSize: 13, fontWeight: 600,
                          color: "#1d1d1f", background: "#fff",
                          border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        Lire le document
                      </button>
                      <button
                        onClick={() => handleSign(doc.project_id)}
                        disabled={signing === doc.project_id}
                        style={{
                          padding: "9px 22px", fontSize: 13, fontWeight: 700,
                          color: "#fff", background: "#0A7A5A",
                          border: "none", borderRadius: 980,
                          cursor: "pointer", fontFamily: "inherit",
                          opacity: signing === doc.project_id ? 0.6 : 1,
                        }}
                      >
                        {signing === doc.project_id ? "Signature…" : "Signer ce document"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signed documents */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: "#1d1d1f",
              margin: "0 0 14px", letterSpacing: "-0.03em",
            }}>
              Documents signés
            </h2>
            {signed.length === 0 ? (
              <div style={{
                background: "#fff", borderRadius: 16,
                border: "0.5px solid rgba(0,0,0,0.08)", padding: "40px 24px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <p style={{ fontSize: 14, color: "#86868B", margin: 0 }}>
                  {pending.length > 0
                    ? "Signez les documents en attente ci-dessus pour les retrouver ici."
                    : "Aucun document pour le moment. Les NDA vous seront envoyés lors de vos missions."
                  }
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {signed.map((doc) => (
                  <div key={doc.id} style={{
                    background: "#fff", borderRadius: 16,
                    border: "0.5px solid rgba(0,0,0,0.08)", padding: "18px 24px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: "#f0faf5", display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 20,
                      }}>✅</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>
                          {doc.nda?.title || "Accord de confidentialité"}
                        </p>
                        <p style={{ fontSize: 12, color: "#86868B", margin: "2px 0 0" }}>
                          {doc.project?.title || "Projet"}{doc.project?.company_name ? ` — ${doc.project.company_name}` : ""}
                        </p>
                        {doc.nda_signed_at && (
                          <p style={{ fontSize: 11, color: "#0A7A5A", margin: "4px 0 0", fontWeight: 600 }}>
                            Signé le {new Date(doc.nda_signed_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {doc.nda && (
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          style={{
                            padding: "8px 18px", fontSize: 13, fontWeight: 600,
                            color: "#1d1d1f", background: "#fff",
                            border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
                            cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          Consulter
                        </button>
                      )}
                      {doc.nda_document_url && !doc.nda_document_url.startsWith("storage-error") && (
                        <a
                          href={doc.nda_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: "8px 18px", fontSize: 13, fontWeight: 600,
                            color: "#fff", background: "#0A7A5A",
                            border: "none", borderRadius: 980,
                            textDecoration: "none", fontFamily: "inherit",
                          }}
                        >
                          Télécharger PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* NDA Preview Modal */}
      {previewDoc && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.4)", display: "flex",
            alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 20, maxWidth: 680,
              width: "100%", maxHeight: "85vh", overflow: "hidden",
              display: "flex", flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: "20px 28px", borderBottom: "0.5px solid rgba(0,0,0,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>
                  {previewDoc.nda?.title || "Accord de confidentialité"}
                </h3>
                <p style={{ fontSize: 12, color: "#86868B", margin: "4px 0 0" }}>
                  {previewDoc.project?.title}{previewDoc.project?.company_name ? ` — ${previewDoc.project.company_name}` : ""}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: "none", border: "none", fontSize: 22,
                  color: "#86868B", cursor: "pointer", padding: "4px 8px",
                }}
              >&times;</button>
            </div>

            <div style={{
              flex: 1, overflow: "auto", padding: "24px 28px",
              fontSize: 14, lineHeight: 1.7, color: "#1d1d1f",
            }}>
              <div dangerouslySetInnerHTML={{ __html: previewDoc.nda?.content_html || "" }} />
            </div>

            <div style={{
              padding: "16px 28px", borderTop: "0.5px solid rgba(0,0,0,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#f5f5f7",
            }}>
              {previewDoc.status === "nda_sent" ? (
                <>
                  <p style={{ fontSize: 12, color: "#86868B", margin: 0 }}>
                    En signant, vous acceptez les termes ci-dessus.
                  </p>
                  <button
                    onClick={() => handleSign(previewDoc.project_id)}
                    disabled={signing === previewDoc.project_id}
                    style={{
                      padding: "10px 24px", fontSize: 14, fontWeight: 700,
                      color: "#fff", background: "#0A7A5A",
                      border: "none", borderRadius: 980,
                      cursor: "pointer", fontFamily: "inherit",
                      opacity: signing === previewDoc.project_id ? 0.6 : 1,
                    }}
                  >
                    {signing === previewDoc.project_id ? "Signature en cours…" : "Signer ce document"}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "#0A7A5A", fontWeight: 600, margin: 0 }}>
                    Document signé {previewDoc.nda_signed_at
                      ? `le ${new Date(previewDoc.nda_signed_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}`
                      : ""}
                  </p>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    style={{
                      padding: "10px 24px", fontSize: 14, fontWeight: 600,
                      color: "#1d1d1f", background: "#fff",
                      border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Fermer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal />
    </div>
  );
}
