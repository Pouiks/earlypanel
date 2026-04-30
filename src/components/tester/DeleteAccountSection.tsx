"use client";

import { useState } from "react";

interface DeleteAccountSectionProps {
  email: string;
  hasMissions: boolean;
}

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: "0.5px solid rgba(0,0,0,0.08)",
  padding: "24px",
  marginBottom: 16,
};

export default function DeleteAccountSection({ email, hasMissions }: DeleteAccountSectionProps) {
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canDelete = confirmInput.trim().toLowerCase() === email.toLowerCase();

  async function handleDelete() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/testers/me", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
      }
      // Compte supprime + session invalidee cote serveur. On force un
      // hard reload pour repartir sur un etat propre + page d'accueil.
      window.location.href = "/?deleted=1";
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur lors de la suppression");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div style={{ ...sectionStyle, borderColor: "rgba(185, 28, 28, 0.18)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#b91c1c", margin: "0 0 8px" }}>
          Zone dangereuse
        </h2>
        <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, margin: "0 0 16px" }}>
          Vous pouvez supprimer définitivement votre compte testeur ainsi que toutes les données associées (informations personnelles, IBAN, NDA en cours, missions non complétées). Cette action est irréversible et conforme à votre droit à l&apos;effacement (RGPD art. 17).
          {hasMissions && (
            <>
              <br /><br />
              <strong>Vous avez des missions complétées</strong> : la suppression complète n&apos;est pas possible automatiquement. Écrivez à <a href="mailto:contact@earlypanel.fr" style={{ color: "#0A7A5A", fontWeight: 600 }}>contact@earlypanel.fr</a> pour une anonymisation manuelle.
            </>
          )}
        </p>
        <button
          onClick={() => { setOpen(true); setConfirmInput(""); setErrorMsg(null); }}
          disabled={hasMissions}
          style={{
            padding: "10px 22px",
            fontSize: 13,
            fontWeight: 600,
            background: "#fff",
            color: hasMissions ? "#86868B" : "#b91c1c",
            border: `1.5px solid ${hasMissions ? "rgba(0,0,0,0.15)" : "#b91c1c"}`,
            borderRadius: 980,
            cursor: hasMissions ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: hasMissions ? 0.6 : 1,
          }}
        >
          Supprimer mon compte…
        </button>
      </div>

      {open && (
        <div
          onClick={() => !submitting && setOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 18, padding: "24px 26px",
              width: "100%", maxWidth: 460,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
              Supprimer définitivement votre compte ?
            </h3>
            <p style={{ fontSize: 13, color: "#3a3a3c", lineHeight: 1.6, margin: "0 0 16px" }}>
              Cette action supprime <strong>définitivement</strong> votre compte ({email}), votre IBAN, votre profil et tous les NDA en cours. Elle est <strong>irréversible</strong>.
            </p>
            <p style={{ fontSize: 12, color: "#86868B", margin: "0 0 8px" }}>
              Pour confirmer, tapez votre email ci-dessous :
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={email}
              autoFocus
              disabled={submitting}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 13,
                border: "1.5px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                fontFamily: "inherit",
                background: "#f5f5f7",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />

            {errorMsg && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 12,
                color: "#b91c1c",
                fontSize: 12,
                lineHeight: 1.5,
              }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                style={{
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "#fff",
                  color: "#1d1d1f",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 980,
                  cursor: submitting ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || submitting}
                style={{
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#b91c1c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 980,
                  cursor: !canDelete ? "not-allowed" : (submitting ? "wait" : "pointer"),
                  fontFamily: "inherit",
                  opacity: !canDelete || submitting ? 0.5 : 1,
                }}
              >
                {submitting ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
