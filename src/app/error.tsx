"use client";

import { useEffect } from "react";

// W5 : page d'erreur globale (s'affiche en cas d'exception runtime sur n'importe
// quelle page enfant). Doit etre Client Component (Next.js requirement).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
    // Hook Sentry : si Sentry est configure, captureException sera appele ici
    // (cf. plan batch 4).
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          textAlign: "center",
          background: "#fff",
          borderRadius: 20,
          border: "0.5px solid rgba(0,0,0,0.08)",
          padding: "48px 32px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            background: "#fef2f2",
            borderRadius: "50%",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}
        >
          ⚠
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1d1d1f",
            margin: "0 0 8px",
            letterSpacing: "-0.03em",
          }}
        >
          Une erreur est survenue
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#6e6e73",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}
        >
          Nous n&apos;avons pas pu charger cette page. Vous pouvez réessayer ou
          revenir à l&apos;accueil.
        </p>
        {error?.digest && (
          <p
            style={{
              fontSize: 11,
              color: "#86868B",
              fontFamily:
                "ui-monospace, 'SF Mono', Menlo, monospace",
              margin: "0 0 24px",
            }}
          >
            Code: {error.digest}
          </p>
        )}
        <div
          style={{ display: "flex", gap: 10, justifyContent: "center" }}
        >
          <button
            onClick={() => reset()}
            style={{
              padding: "12px 24px",
              borderRadius: 980,
              border: "none",
              background: "#0A7A5A",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Réessayer
          </button>
          <a
            href="/"
            style={{
              padding: "12px 24px",
              borderRadius: 980,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              color: "#1d1d1f",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "inherit",
            }}
          >
            Retour accueil
          </a>
        </div>
      </div>
    </div>
  );
}
