import Link from "next/link";
import type { TesterStatus } from "@/types/tester";

interface StatusBannerProps {
  status: TesterStatus;
  /** Si false, le testeur peut terminer l’inscription. Si true + pending, anomalie rare (affichage sans promesse d’équipe). */
  profileCompleted: boolean;
}

export default function StatusBanner({ status, profileCompleted }: StatusBannerProps) {
  if (status !== "pending") return null;

  if (profileCompleted) {
    return (
      <div style={{
        background: "#f0faf5",
        border: "0.5px solid rgba(10, 122, 90, 0.25)",
        borderRadius: 16,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 24,
      }}>
        <span style={{ fontSize: 20 }}>✓</span>
        <div>
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#0A7A5A",
            margin: "0 0 2px",
          }}>
            Profil complété
          </p>
          <p style={{
            fontSize: 13,
            color: "#1d1d1f",
            margin: 0,
            lineHeight: 1.45,
          }}>
            Aucune validation manuelle côté équipe : l&apos;activation de votre
            compte se fait automatiquement. Rechargez la page dans un instant, ou
            contactez le support si le message persiste.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#FFF8EB",
      border: "0.5px solid #F5C542",
      borderRadius: 16,
      padding: "16px 20px",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 200 }}>
        <span style={{ fontSize: 20 }}>⏳</span>
        <div>
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#92600A",
            margin: "0 0 2px",
          }}>
            Dernière étape : finaliser votre profil
          </p>
          <p style={{
            fontSize: 13,
            color: "#6e6e73",
            margin: 0,
            lineHeight: 1.45,
            maxWidth: 520,
          }}>
            Pas de validation manuelle : votre compte devient &laquo; actif &raquo;
            automatiquement dès que l&apos;inscription est complète (tous les champs requis remplis).
          </p>
        </div>
      </div>
      <Link
        href="/app/onboarding"
        style={{
          display: "inline-block",
          padding: "10px 18px",
          fontSize: 14,
          fontWeight: 700,
          color: "#fff",
          background: "#0A7A5A",
          borderRadius: 980,
          textDecoration: "none",
        }}
      >
        Continuer l’inscription
      </Link>
    </div>
  );
}
