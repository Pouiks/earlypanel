import Link from "next/link";

// W5 : page 404 stylisee. Server Component (statique).
export default function NotFound() {
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
            fontSize: 64,
            fontWeight: 700,
            color: "#0A7A5A",
            letterSpacing: "-0.06em",
            margin: "0 0 8px",
          }}
        >
          404
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
          Page introuvable
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#6e6e73",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}
        >
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            borderRadius: 980,
            background: "#0A7A5A",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
