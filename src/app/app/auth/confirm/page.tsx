"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

/**
 * Page de confirmation intermediaire pour magic link testeur.
 *
 * Pourquoi cette page existe :
 *   - Gmail Safe Browsing, Outlook ATP, et autres scanners email visitent
 *     systematiquement les liens cliquables qu'ils trouvent dans les mails
 *     (anti-phishing). Si le lien va direct sur /app/auth/callback, le bot
 *     consomme le token Supabase (verifyOtp marche une seule fois). Quand
 *     l'utilisateur reel clique apres, c'est mort.
 *   - Avec une page intermediaire qui demande une action humaine (clic sur
 *     un bouton), les scanners ne consomment plus le token : ils ne cliquent
 *     pas. Le user clique → verifyOtp s'execute → session OK.
 *   - Pattern industry-standard : Stripe, Notion, Linear, GitHub le font tous.
 *
 * Le clic redirige vers /app/auth/callback qui execute le vrai verifyOtp.
 */

function ConfirmInner() {
  const params = useSearchParams();
  const tokenHash = params.get("token_hash");
  const type = params.get("type") || "magiclink";
  const [loading, setLoading] = useState(false);

  function handleConfirm() {
    if (!tokenHash) return;
    setLoading(true);
    // Redirection cote client, pas un <a> direct : empeche les bots de
    // suivre. Les scanners email ne cliquent pas un onClick.
    window.location.href = `/app/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;
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
          Confirmer la connexion
        </p>
        <p style={{ fontSize: 14, color: "#6e6e73", margin: "0 0 24px", lineHeight: 1.55 }}>
          Cliquez ci-dessous pour vous connecter à votre espace earlypanel.
        </p>

        {!tokenHash ? (
          <>
            <p style={{ fontSize: 13, color: "#dc2626", margin: "0 0 16px" }}>
              Lien de connexion invalide. Demandez un nouveau lien.
            </p>
            <a
              href="/app/login"
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
            {loading ? "Connexion…" : "Se connecter →"}
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

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f5f5f7" }} />}>
      <ConfirmInner />
    </Suspense>
  );
}
