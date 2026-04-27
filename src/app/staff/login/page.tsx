"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";
type LoginState = "idle" | "loading" | "sent" | "error";

export default function StaffLoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState("");

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setState("loading");
    setError("");

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      const role = data.user?.app_metadata?.role;
      if (role !== "staff" && role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("Ce compte n'a pas les droits d'accès staff.");
      }

      window.location.href = "/staff/dashboard";
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Identifiants incorrects");
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/staff/login/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi");
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  }

  const inputStyle: React.CSSProperties = {
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
  };

  function switchMode(next: Mode) {
    setMode(next);
    setState("idle");
    setError("");
    setPassword("");
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
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em" }}>
            early<span style={{ color: "#0A7A5A" }}>panel</span>
          </span>
          <div style={{
            marginTop: 6, fontSize: 12, fontWeight: 600,
            color: "#0A7A5A", textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Espace Staff
          </div>
        </div>

        {state === "sent" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, background: "#f0faf5", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 24,
            }}>✉️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
              Email envoyé
            </h1>
            <p style={{ fontSize: 14, color: "#6e6e73", margin: "0 0 24px", lineHeight: 1.6 }}>
              Si un compte staff existe pour <strong style={{ color: "#1d1d1f" }}>{email}</strong>,
              <br />vous recevrez un lien de connexion.
            </p>
            <button
              onClick={() => { setState("idle"); setEmail(""); }}
              style={{
                background: "none", border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 980, padding: "10px 24px",
                fontSize: 14, fontWeight: 600, color: "#1d1d1f",
                cursor: "pointer",
              }}
            >
              Utiliser un autre email
            </button>
          </div>
        ) : (
          <>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: "#1d1d1f",
              margin: "0 0 6px", textAlign: "center", letterSpacing: "-0.04em",
            }}>
              Connexion
            </h1>
            <p style={{ fontSize: 14, color: "#6e6e73", margin: "0 0 24px", textAlign: "center", lineHeight: 1.5 }}>
              {mode === "password"
                ? "Entrez vos identifiants pour accéder à l'espace de gestion."
                : "Recevez un lien de connexion sécurisé sur votre email."}
            </p>

            <div style={{
              display: "flex", gap: 4, padding: 4, marginBottom: 24,
              background: "#f5f5f7", borderRadius: 12,
            }}>
              <button
                type="button"
                onClick={() => switchMode("password")}
                style={{
                  flex: 1, padding: "8px 12px",
                  background: mode === "password" ? "#fff" : "transparent",
                  border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  color: mode === "password" ? "#1d1d1f" : "#86868B",
                  cursor: "pointer",
                  boxShadow: mode === "password" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 150ms",
                  fontFamily: "inherit",
                }}
              >
                Mot de passe
              </button>
              <button
                type="button"
                onClick={() => switchMode("magic")}
                style={{
                  flex: 1, padding: "8px 12px",
                  background: mode === "magic" ? "#fff" : "transparent",
                  border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  color: mode === "magic" ? "#1d1d1f" : "#86868B",
                  cursor: "pointer",
                  boxShadow: mode === "magic" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 150ms",
                  fontFamily: "inherit",
                }}
              >
                Lien magique
              </button>
            </div>

            <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom@earlypanel.fr"
                  required
                  autoComplete="email"
                  style={inputStyle}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
                />
              </div>

              {mode === "password" && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
                      Mot de passe
                    </label>
                    <a href="/staff/forgot" style={{ fontSize: 12, color: "#0A7A5A", textDecoration: "none", fontWeight: 600 }}>
                      Oublié ?
                    </a>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={inputStyle}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
                  />
                </div>
              )}

              {error && (
                <p style={{
                  fontSize: 13, color: "#e53e3e", margin: "12px 0 0",
                  padding: "10px 14px", background: "#fef2f2", borderRadius: 10, lineHeight: 1.4,
                }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                style={{
                  width: "100%", padding: "14px", marginTop: 20,
                  background: "#0A7A5A", color: "#fff", border: "none",
                  borderRadius: 980, fontSize: 15, fontWeight: 700,
                  cursor: state === "loading" ? "wait" : "pointer",
                  opacity: state === "loading" ? 0.7 : 1,
                  transition: "all 200ms", fontFamily: "inherit",
                }}
              >
                {state === "loading"
                  ? (mode === "password" ? "Connexion…" : "Envoi…")
                  : (mode === "password" ? "Se connecter" : "Recevoir le lien →")}
              </button>
            </form>
          </>
        )}

        <div style={{
          textAlign: "center", marginTop: 28, paddingTop: 20,
          borderTop: "0.5px solid rgba(0,0,0,0.08)",
        }}>
          <a href="/" style={{ fontSize: 13, color: "#86868B", textDecoration: "none" }}>
            &larr; Retour sur earlypanel.fr
          </a>
        </div>
      </div>
    </div>
  );
}
