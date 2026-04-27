"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type State = "checking" | "ready" | "loading" | "done" | "error";

const MIN_LENGTH = 12;

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: "—", color: "#d2d2d7" };
  let score = 0;
  if (pw.length >= MIN_LENGTH) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Très faible", "Faible", "Moyen", "Bon", "Fort"];
  const colors = ["#e53e3e", "#dd6b20", "#d69e2e", "#38a169", "#0A7A5A"];
  const idx = Math.max(0, Math.min(score - 1, 4));
  return { score, label: labels[idx] ?? "—", color: colors[idx] ?? "#d2d2d7" };
}

export default function StaffResetPage() {
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setState("error");
        setError("Session expirée. Demandez un nouveau lien de réinitialisation.");
        return;
      }
      const role = user.app_metadata?.role;
      if (role !== "staff" && role !== "admin") {
        setState("error");
        setError("Ce compte n'a pas les droits staff.");
        return;
      }
      setState("ready");
    })();
    return () => { cancelled = true; };
  }, []);

  const strength = passwordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    setError("");

    if (password.length < MIN_LENGTH) {
      setError(`Le mot de passe doit faire au moins ${MIN_LENGTH} caractères.`);
      return;
    }
    if (strength.score < 3) {
      setError("Mot de passe trop faible. Mélangez majuscules, minuscules, chiffres et caractères spéciaux.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setState("loading");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setState("done");
      setTimeout(() => { window.location.href = "/staff/dashboard"; }, 1200);
    } catch (err) {
      setState("ready");
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
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
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em" }}>
            early<span style={{ color: "#0A7A5A" }}>panel</span>
          </span>
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: "#0A7A5A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Espace Staff
          </div>
        </div>

        {state === "checking" && (
          <p style={{ textAlign: "center", color: "#6e6e73", fontSize: 14 }}>Vérification du lien…</p>
        )}

        {state === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, background: "#f0faf5", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 24,
            }}>✓</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
              Mot de passe mis à jour
            </h1>
            <p style={{ fontSize: 14, color: "#6e6e73", margin: 0 }}>
              Redirection vers votre espace…
            </p>
          </div>
        )}

        {(state === "ready" || state === "loading" || (state === "error" && password)) && (
          <>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: "#1d1d1f",
              margin: "0 0 6px", textAlign: "center", letterSpacing: "-0.04em",
            }}>
              Nouveau mot de passe
            </h1>
            <p style={{ fontSize: 14, color: "#6e6e73", margin: "0 0 28px", textAlign: "center", lineHeight: 1.5 }}>
              Choisissez un mot de passe fort. Minimum {MIN_LENGTH} caractères, mélangez lettres, chiffres et symboles.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={MIN_LENGTH}
                  autoComplete="new-password"
                  style={inputStyle}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
                />
                {password.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: "#f5f5f7", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        width: `${(strength.score / 5) * 100}%`,
                        height: "100%",
                        background: strength.color,
                        transition: "all 200ms",
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: strength.color, minWidth: 80, textAlign: "right" }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={MIN_LENGTH}
                  autoComplete="new-password"
                  style={inputStyle}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
                />
              </div>

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
                {state === "loading" ? "Mise à jour…" : "Définir le mot de passe"}
              </button>
            </form>
          </>
        )}

        {state === "error" && !password && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, background: "#fef2f2", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 24,
            }}>&#9888;&#65039;</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
              Lien invalide
            </h1>
            <p style={{ fontSize: 14, color: "#6e6e73", margin: "0 0 24px", lineHeight: 1.6 }}>
              {error}
            </p>
            <a
              href="/staff/forgot"
              style={{
                display: "inline-block", padding: "12px 28px",
                background: "#0A7A5A", color: "#fff",
                borderRadius: 980, fontSize: 14, fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Demander un nouveau lien &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
