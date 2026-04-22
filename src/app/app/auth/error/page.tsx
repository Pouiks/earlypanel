"use client";

export default function AuthErrorPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f5f7",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: "40px",
        maxWidth: 400,
        textAlign: "center",
        boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        border: "0.5px solid rgba(0,0,0,0.08)",
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#fef2f2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: 24,
        }}>&#9888;&#65039;</div>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>
          Lien expiré ou invalide
        </p>
        <p style={{ fontSize: 14, color: "#6e6e73", margin: "0 0 20px", lineHeight: 1.5 }}>
          Ce lien de connexion a expiré ou a déjà été utilisé.
          Cela peut arriver si vous avez ouvert le lien dans un
          navigateur différent de celui utilisé pour la demande.
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
          Demander un nouveau lien &rarr;
        </a>
      </div>
    </div>
  );
}
