"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

/**
 * Page de confirmation intermediaire pour magic link / recovery staff.
 *
 * Meme principe que /app/auth/confirm/page.tsx (voir ce fichier pour le
 * pourquoi complet) : empeche les scanners email (Gmail Safe Browsing,
 * Outlook ATP) de consommer le token Supabase via verifyOtp en accedant
 * au lien avant l'utilisateur.
 *
 * Le clic redirige vers /staff/auth/callback qui execute le vrai verifyOtp.
 */

function ConfirmInner() {
  const params = useSearchParams();
  const tokenHash = params.get("token_hash");
  const type = params.get("type") || "magiclink";
  const [loading, setLoading] = useState(false);

  const isRecovery = type === "recovery";

  function handleConfirm() {
    if (!tokenHash) return;
    setLoading(true);
    window.location.href = `/staff/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f5f7",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      padding: 20,
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 40,
        maxWidth: 440,
        textAlign: "center",
        boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        border: "0.5px solid rgba(0,0,0,0.08)",
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#f0faf5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 28,
        }}>🔐</div>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
          {isRecovery ? "Confirmer la réinitialisation" : "Confirmer la connexion staff"}
        </p>
        <p style={{ fontSize: 14, color: "#6e6e73", margin: "0 0 24px", lineHeight: 1.55 }}>
          {isRecovery
            ? "Cliquez ci-dessous pour définir un nouveau mot de passe."
            : "Cliquez ci-dessous pour vous connecter à l'espace staff earlypanel."}
        </p>

        {!tokenHash ? (
          <>
            <p style={{ fontSize: 13, color: "#dc2626", margin: "0 0 16px" }}>
              Lien invalide. Demandez un nouveau lien.
            </p>
            <a
              href="/staff/login"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: "#0A7A5A",
                color: "#fff",
                borderRadius: 980,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Demander un nouveau lien →
            </a>
          </>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            style={{
              display: "inline-block",
              padding: "13px 32px",
              background: loading ? "#86868B" : "#0A7A5A",
              color: "#fff",
              borderRadius: 980,
              fontSize: 15,
              fontWeight: 700,
              border: "none",
              cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit",
              transition: "background 150ms ease",
            }}
          >
            {loading
              ? "Connexion…"
              : isRecovery
                ? "Réinitialiser →"
                : "Se connecter →"}
          </button>
        )}

        <p style={{ fontSize: 11, color: "#86868B", margin: "24px 0 0", lineHeight: 1.5 }}>
          Pour votre sécurité, ce lien doit être confirmé manuellement avant
          d'établir votre session.
        </p>
      </div>
    </div>
  );
}

export default function StaffConfirmPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f5f5f7" }} />}>
      <ConfirmInner />
    </Suspense>
  );
}
