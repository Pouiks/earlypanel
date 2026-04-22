"use client";

const STEP_LABELS = [
  "Vous",
  "Métier",
  "Outils",
  "Appareils",
  "Dispo",
];

interface ProgressDotsProps {
  total: number;
  current: number;
}

export default function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      gap: 0,
      padding: "20px 0 4px",
      width: "100%",
      maxWidth: 480,
    }}>
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isComplete = step < current;
        const isCurrent = step === current;
        const isLast = step === total;

        return (
          <div key={step} style={{ display: "flex", alignItems: "flex-start", flex: isLast ? "0 0 auto" : 1 }}>
            {/* Step circle + label */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 48 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: isComplete ? "#0A7A5A" : isCurrent ? "#0A7A5A" : "#e8e8ed",
                color: isComplete || isCurrent ? "#fff" : "#86868B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                transition: "all 300ms ease",
              }}>
                {isComplete ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : step}
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: isCurrent ? 600 : 400,
                color: isComplete || isCurrent ? "#1d1d1f" : "#86868B",
                transition: "all 300ms ease",
                whiteSpace: "nowrap",
              }}>
                {STEP_LABELS[i] || `Étape ${step}`}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div style={{
                flex: 1,
                height: 2,
                background: isComplete ? "#0A7A5A" : "#e8e8ed",
                marginTop: 13,
                marginLeft: 4,
                marginRight: 4,
                borderRadius: 1,
                transition: "background 300ms ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
