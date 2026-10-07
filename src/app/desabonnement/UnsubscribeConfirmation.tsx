"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/cta-links";

/**
 * Page ouverte par le lien « Si vous souhaitez vous désabonner de l'ensemble
 * des communications, cliquez ici » en pied de chaque email. Le désabonnement
 * est enregistré dès l'ouverture (POST /api/unsubscribe), puis confirmé.
 *
 * Le POST part du navigateur (JavaScript), jamais d'un simple GET : les
 * scanners de liens des messageries qui se contentent de suivre l'URL ne
 * désabonnent personne.
 */

type State =
  | { step: "loading" }
  | { step: "done"; kind: "tester" | "address" }
  | { step: "error" };

const GREEN = "#0A7A5A";

async function unsubscribe(token: string | null): Promise<State> {
  if (!token) return { step: "error" };
  try {
    const res = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { kind?: "tester" | "address" };
    return res.ok ? { step: "done", kind: data.kind === "tester" ? "tester" : "address" } : { step: "error" };
  } catch {
    return { step: "error" };
  }
}

export default function UnsubscribeConfirmation() {
  const [state, setState] = useState<State>({ step: "loading" });
  const started = useRef(false);

  useEffect(() => {
    // Un seul POST, même si React rejoue l'effet en développement.
    if (started.current) return;
    started.current = true;
    unsubscribe(new URLSearchParams(window.location.search).get("token")).then(setState);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 16px 48px",
        background: "radial-gradient(ellipse 80% 50% at 50% 0%, #e3f5ec 0%, #f5f5f7 60%)",
        fontFamily: "var(--font)",
      }}
    >
      <style>{`
        @keyframes ep-unsub-spin { to { transform: rotate(360deg); } }
        @keyframes ep-unsub-draw { from { stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }
        @keyframes ep-unsub-pop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
        .ep-unsub-card { animation: rise .5s ease both; }
        .ep-unsub-badge { animation: ep-unsub-pop .45s .1s ease both; }
        .ep-unsub-check { stroke-dasharray: 30; animation: ep-unsub-draw .4s .45s ease both; }
        .ep-unsub-btn:hover { opacity: .88; }
        @media (prefers-reduced-motion: reduce) {
          .ep-unsub-card, .ep-unsub-badge, .ep-unsub-check { animation: none; }
        }
      `}</style>

      <Link href="/" className="logo" style={{ fontSize: 20, marginBottom: "clamp(40px, 12vh, 110px)" }}>
        early<em>panel</em>
      </Link>

      <div
        className="ep-unsub-card"
        style={{
          width: "100%",
          maxWidth: 500,
          background: "#fff",
          borderRadius: 24,
          border: "0.5px solid rgba(0,0,0,0.08)",
          boxShadow: "0 12px 48px rgba(10,122,90,0.08)",
          padding: "clamp(32px, 6vw, 48px) clamp(22px, 6vw, 44px)",
          textAlign: "center",
        }}
      >
        {state.step === "loading" && (
          <>
            <div
              aria-hidden
              style={{
                width: 44, height: 44, margin: "8px auto 22px", borderRadius: "50%",
                border: "3px solid #e3f5ec", borderTopColor: GREEN,
                animation: "ep-unsub-spin .8s linear infinite",
              }}
            />
            <p role="status" style={{ fontSize: 15, color: "var(--gray)", margin: 0 }}>
              Désabonnement en cours…
            </p>
          </>
        )}

        {state.step === "done" && (
          <>
            <div
              className="ep-unsub-badge"
              aria-hidden
              style={{
                width: 72, height: 72, margin: "0 auto 24px", borderRadius: "50%",
                background: "var(--green-bg)", border: "1px solid rgba(10,122,90,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path className="ep-unsub-check" d="M5 12.5l4.5 4.5L19 7.5" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GREEN, margin: "0 0 12px" }}>
              Désabonnement confirmé
            </p>
            <h1
              role="status"
              style={{ fontSize: "clamp(22px, 4.6vw, 27px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.03em", color: "var(--black)", margin: "0 0 14px" }}
            >
              Vous ne recevrez plus de communication de la part d&apos;early<span style={{ color: GREEN }}>panel</span>
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--gray)", margin: "0 auto 28px", maxWidth: "38ch" }}>
              Votre demande est enregistrée. Seul un lien de connexion que vous demandez vous-même pourra encore vous être envoyé.
            </p>

            <Link
              href="/"
              className="ep-unsub-btn"
              style={{
                display: "inline-block", padding: "13px 30px", borderRadius: "var(--radius-pill)",
                background: GREEN, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none",
                transition: "opacity .15s",
              }}
            >
              Retour au site
            </Link>

            {state.kind === "tester" && (
              <div style={{ marginTop: 28, paddingTop: 22, borderTop: "0.5px solid rgba(0,0,0,0.08)" }}>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--gray-light)", margin: 0 }}>
                  Vous avez changé d&apos;avis ? Réactivez les communications à tout moment depuis{" "}
                  <Link href="/app/login" style={{ color: GREEN, fontWeight: 600, textDecoration: "none" }}>
                    votre espace testeur
                  </Link>
                  .
                </p>
              </div>
            )}
          </>
        )}

        {state.step === "error" && (
          <>
            <div
              aria-hidden
              style={{
                width: 72, height: 72, margin: "0 auto 24px", borderRadius: "50%", background: "#f5f5f7",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: "var(--gray-light)",
              }}
            >
              ?
            </div>
            <h1 role="alert" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--black)", margin: "0 0 12px" }}>
              Ce lien ne fonctionne pas
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--gray)", margin: "0 auto 26px", maxWidth: "38ch" }}>
              Le lien de désabonnement est incomplet ou n&apos;est plus valide. Écrivez-nous à{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Désabonnement")}`} style={{ color: GREEN, fontWeight: 600 }}>
                {CONTACT_EMAIL}
              </a>{" "}
              et nous vous désabonnerons.
            </p>
            <Link
              href="/"
              className="ep-unsub-btn"
              style={{
                display: "inline-block", padding: "13px 30px", borderRadius: "var(--radius-pill)",
                background: "var(--black)", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}
            >
              Retour au site
            </Link>
          </>
        )}
      </div>

      <p style={{ fontSize: 12, color: "var(--gray-light)", margin: "28px 0 0", textAlign: "center" }}>
        <Link href="/confidentialite" style={{ color: "inherit" }}>
          Politique de confidentialité
        </Link>
      </p>
    </main>
  );
}
