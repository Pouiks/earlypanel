"use client";

import { useEffect } from "react";

// W5 : fallback ultime quand une erreur survient dans le root layout
// (avant que `error.tsx` puisse rendre son fallback). Doit fournir son
// propre `<html>` et `<body>` car aucun layout n'aura ete rendu.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
          background: "#f5f5f7",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 480,
              textAlign: "center",
              background: "#fff",
              borderRadius: 20,
              padding: "48px 32px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#1d1d1f",
                margin: "0 0 8px",
                letterSpacing: "-0.03em",
              }}
            >
              Erreur critique
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "#6e6e73",
                lineHeight: 1.6,
                margin: "0 0 28px",
              }}
            >
              L&apos;application a rencontré une erreur inattendue. Nos équipes
              ont été notifiées.
            </p>
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
              Recharger
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
