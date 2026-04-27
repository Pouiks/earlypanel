"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const REASONS: Record<string, { title: string; body: string }> = {
  not_staff: {
    title: "Accès refusé",
    body: "Ce compte n'a pas les droits d'accès à l'espace staff. Si vous pensez que c'est une erreur, contactez un administrateur.",
  },
  not_member: {
    title: "Compte révoqué",
    body: "Ce compte staff a été désactivé. Contactez un administrateur si vous devez retrouver l'accès.",
  },
  default: {
    title: "Lien expiré ou invalide",
    body: "Ce lien a expiré ou a déjà été utilisé. Cela peut arriver si vous l'avez ouvert dans un navigateur différent de celui utilisé pour la demande.",
  },
};

function ErrorContent() {
  const params = useSearchParams();
  const reason = params.get("reason") ?? "default";
  const config = REASONS[reason] ?? REASONS.default;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f5f7",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      padding: "20px",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: "40px",
        maxWidth: 420,
        width: "100%",
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
          {config.title}
        </p>
        <p style={{ fontSize: 14, color: "#6e6e73", margin: "0 0 20px", lineHeight: 1.5 }}>
          {config.body}
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
          Retour à la connexion &rarr;
        </a>
      </div>
    </div>
  );
}

export default function StaffAuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}
