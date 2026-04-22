"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LoginState = "idle" | "loading" | "error";

export default function StaffLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
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
      setError(
        err instanceof Error ? err.message : "Identifiants incorrects"
      );
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
            test<span style={{ color: "#0A7A5A" }}>panel</span>
          </span>
          <div style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "#0A7A5A",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            Espace Staff
          </div>
        </div>

        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1d1d1f",
          margin: "0 0 6px",
          textAlign: "center",
          letterSpacing: "-0.04em",
        }}>
          Connexion
        </h1>
        <p style={{
          fontSize: 14,
          color: "#6e6e73",
          margin: "0 0 28px",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          Entrez vos identifiants pour accéder à l&apos;espace de gestion
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#1d1d1f",
              marginBottom: 6,
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom@testpanel.fr"
              required
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#1d1d1f",
              marginBottom: 6,
            }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>

          {error && (
            <p style={{
              fontSize: 13,
              color: "#e53e3e",
              margin: "12px 0 0",
              padding: "10px 14px",
              background: "#fef2f2",
              borderRadius: 10,
              lineHeight: 1.4,
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
              marginTop: 20,
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
            {state === "loading" ? "Connexion…" : "Se connecter"}
          </button>
        </form>

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
            &larr; Retour sur testpanel.fr
          </a>
        </div>
      </div>
    </div>
  );
}
