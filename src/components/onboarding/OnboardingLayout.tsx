"use client";

import ProgressDots from "./ProgressDots";

interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export default function OnboardingLayout({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onBack,
  showBack = true,
}: OnboardingLayoutProps) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background: "#f5f5f7",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      padding: "40px 20px 60px",
    }}>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#1d1d1f",
            letterSpacing: "-0.04em",
          }}>
            early<span style={{ color: "#0A7A5A" }}>panel</span>
          </span>
        </a>
      </div>

      <div style={{ width: "100%", maxWidth: 480 }}>
        <ProgressDots total={totalSteps} current={step} />
      </div>
      <div style={{ height: 20 }} />

      <div style={{
        width: "100%",
        maxWidth: 640,
        background: "#fff",
        borderRadius: 20,
        border: "0.5px solid rgba(0,0,0,0.08)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        padding: "40px",
      }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1d1d1f",
          margin: "0 0 4px",
          letterSpacing: "-0.04em",
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 14,
            color: "#6e6e73",
            margin: "0 0 28px",
            lineHeight: 1.5,
          }}>
            {subtitle}
          </p>
        )}

        {children}

        {showBack && step > 1 && onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: "block",
              margin: "20px auto 0",
              background: "none",
              border: "none",
              fontSize: 14,
              color: "#86868B",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "8px 16px",
            }}
          >
            ← Retour
          </button>
        )}
      </div>
    </div>
  );
}
