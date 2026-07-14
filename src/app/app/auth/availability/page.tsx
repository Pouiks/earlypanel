"use client";

import { useEffect, useState } from "react";

/**
 * Page interstitielle de campagne de disponibilité (publique via /app/auth/*).
 *
 * Anti-scanner : les scanners de liens (Gmail/Outlook) suivent les URL mais ne
 * cliquent pas un bouton. On n'appelle donc la route d'action (qui génère un
 * magic link one-time) que sur un clic HUMAIN — sinon un préfetch brûlerait le
 * token. Même principe que /app/auth/confirm.
 */
export default function AvailabilityInterstitial() {
  const [token, setToken] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setToken(p.get("token"));
    setChoice(p.get("choice"));
  }, []);

  const isOui = choice === "oui";
  const title = isOui ? "Confirmer votre disponibilité" : "Gérer votre disponibilité";
  const desc = isOui
    ? "Vous serez disponible pour recevoir des offres de test pendant les 3 prochains mois."
    : "Vous allez accéder à votre espace pour gérer votre disponibilité ou votre compte.";

  function go() {
    if (token) window.location.href = `/api/testers/availability?token=${encodeURIComponent(token)}`;
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f5f5f7", padding: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 32px", maxWidth: 440, width: "100%",
        textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", background: "#f0faf5", margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
        }}>{isOui ? "✅" : "⚙️"}</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1d1d1f", margin: "0 0 10px" }}>{title}</h1>
        <p style={{ fontSize: 14, color: "#6e6e73", lineHeight: 1.6, margin: "0 0 28px" }}>{desc}</p>

        {token ? (
          <button onClick={go} style={{
            display: "inline-block", background: "#0A7A5A", color: "#fff", padding: "14px 32px",
            borderRadius: 980, fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit",
          }}>
            {isOui ? "Oui, je suis disponible →" : "Accéder à mon espace →"}
          </button>
        ) : (
          <p style={{ fontSize: 13, color: "#b91c1c" }}>Lien invalide ou incomplet.</p>
        )}

        <p style={{ fontSize: 12, color: "#86868B", margin: "24px 0 0" }}>
          earlypanel · Ce lien est valable 3 mois.
        </p>
      </div>
    </div>
  );
}
