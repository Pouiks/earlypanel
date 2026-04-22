import type { TesterStatus } from "@/types/tester";

interface StatusBannerProps {
  status: TesterStatus;
}

export default function StatusBanner({ status }: StatusBannerProps) {
  if (status !== "pending") return null;

  return (
    <div style={{
      background: "#FFF8EB",
      border: "0.5px solid #F5C542",
      borderRadius: 16,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 24,
    }}>
      <span style={{ fontSize: 20 }}>⏳</span>
      <div>
        <p style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#92600A",
          margin: "0 0 2px",
        }}>
          Profil en cours de validation
        </p>
        <p style={{
          fontSize: 13,
          color: "#B8860B",
          margin: 0,
        }}>
          Notre équipe examine votre profil sous 48h ouvrées.
        </p>
      </div>
    </div>
  );
}
