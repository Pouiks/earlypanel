"use client";

import { useState } from "react";

type LoginState = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/testers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }

      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  }

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
        width: "100%",
        maxWidth: 440,
        background: "#fff",
        borderRadius: 20,
        border: "0.5px solid rgba(0,0,0,0.08)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        padding: "48px 40px",
      }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <span style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1d1d1f",
            letterSpacing: "-0.04em",
          }}>
            early<span style={{ color: "#0A7A5A" }}>panel</span>
          </span>
        </div>

        {state === "sent" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56,
              height: 56,
              background: "#f0faf5",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 24,
            }}>
              ✉️
            </div>
            <h1 style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#1d1d1f",
              margin: "0 0 8px",
              letterSpacing: "-0.04em",
            }}>
              Email envoyé
            </h1>
            <p style={{
              fontSize: 14,
              color: "#6e6e73",
              margin: "0 0 24px",
              lineHeight: 1.6,
            }}>
              Vérifiez votre boîte mail <strong style={{ color: "#1d1d1f" }}>{email}</strong>
              <br />et cliquez sur le lien de connexion.
            </p>
            <button
              onClick={() => { setState("idle"); setEmail(""); }}
              style={{
                background: "none",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 980,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                color: "#1d1d1f",
                cursor: "pointer",
                transition: "all 200ms",
              }}
            >
              Utiliser un autre email
            </button>
          </div>
        ) : (
          <>
            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1d1d1f",
              margin: "0 0 6px",
              textAlign: "center",
              letterSpacing: "-0.04em",
            }}>
              Accéder à mon espace
            </h1>
            <p style={{
              fontSize: 14,
              color: "#6e6e73",
              margin: "0 0 28px",
              textAlign: "center",
              lineHeight: 1.5,
            }}>
              Entrez votre email pour recevoir un lien de connexion
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 15,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  borderRadius: 12,
                  outline: "none",
                  background: "#f5f5f7",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  transition: "border-color 200ms",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
                onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
              />

              {error && (
                <p style={{
                  fontSize: 13,
                  color: "#e53e3e",
                  margin: "8px 0 0",
                }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                style={{
                  width: "100%",
                  padding: "14px",
                  marginTop: 16,
                  background: "#0A7A5A",
                  color: "#fff",
                  border: "none",
                  borderRadius: 980,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: state === "loading" ? "wait" : "pointer",
                  opacity: state === "loading" ? 0.7 : 1,
                  transition: "all 200ms",
                  fontFamily: "inherit",
                }}
              >
                {state === "loading" ? "Envoi en cours…" : "Recevoir mon lien →"}
              </button>
            </form>
          </>
        )}

        <div style={{
          textAlign: "center",
          marginTop: 28,
          paddingTop: 20,
          borderTop: "0.5px solid rgba(0,0,0,0.08)",
        }}>
          <a
            href="/"
            style={{
              fontSize: 13,
              color: "#86868B",
              textDecoration: "none",
            }}
          >
            ← Retour sur earlypanel.fr
          </a>
        </div>
      </div>
    </div>
  );
}
