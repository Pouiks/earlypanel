"use client";

import { useState } from "react";
import type { Tester } from "@/types/tester";

interface Props {
  tester: Tester;
  onChanged: () => void | Promise<void>;
}

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: "0.5px solid rgba(0,0,0,0.08)",
  padding: "24px",
  marginBottom: 16,
};

type Action = "confirm_available" | "set_unavailable" | "deactivate" | "reactivate";

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function AvailabilitySection({ tester, onChanged }: Props) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const isInactive = tester.status === "inactive";
  const availableUntil = tester.available_until;
  const confirmed = !!availableUntil && new Date(availableUntil).getTime() >= Date.now();

  async function run(action: Action) {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/testers/me/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || `Erreur ${res.status}`);
      const label =
        action === "confirm_available" ? "Disponibilité confirmée pour 3 mois." :
        action === "set_unavailable" ? "Vous ne recevrez plus d'offres jusqu'à réactivation." :
        action === "deactivate" ? "Compte désactivé. Vous pourrez le réactiver à tout moment." :
        "Compte réactivé.";
      setMsg({ text: label, error: false });
      setConfirmDeactivate(false);
      await onChanged();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Erreur", error: true });
    } finally {
      setBusy(null);
    }
  }

  const primaryBtn: React.CSSProperties = {
    padding: "11px 22px", fontSize: 14, fontWeight: 700, color: "#fff",
    background: "#0A7A5A", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
  };
  const ghostBtn: React.CSSProperties = {
    padding: "11px 22px", fontSize: 14, fontWeight: 600, color: "#1d1d1f",
    background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div id="disponibilite-compte" style={sectionStyle}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>
        Disponibilité &amp; mon compte
      </h2>

      {/* Statut courant */}
      <div style={{ marginBottom: 18 }}>
        {isInactive ? (
          <span style={{ display: "inline-block", padding: "6px 14px", borderRadius: 980, fontSize: 13, fontWeight: 600, background: "#F1F1F3", color: "#6E6E73" }}>
            Compte désactivé — vous ne recevez plus d&apos;offres
          </span>
        ) : confirmed ? (
          <span style={{ display: "inline-block", padding: "6px 14px", borderRadius: 980, fontSize: 13, fontWeight: 600, background: "#D1FAE5", color: "#065F46" }}>
            ✓ Disponible jusqu&apos;au {fmt(availableUntil)}
          </span>
        ) : (
          <span style={{ display: "inline-block", padding: "6px 14px", borderRadius: 980, fontSize: 13, fontWeight: 600, background: "#FEF3C7", color: "#92600A" }}>
            Disponibilité non confirmée
          </span>
        )}
      </div>

      {msg && (
        <div role={msg.error ? "alert" : "status"} style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 13,
          background: msg.error ? "#fef2f2" : "#f0faf5", color: msg.error ? "#b91c1c" : "#0A7A5A",
        }}>
          {msg.text}
        </div>
      )}

      {isInactive ? (
        <>
          <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, margin: "0 0 16px" }}>
            Votre compte est désactivé : vous n&apos;apparaissez plus dans les offres de test. Vous pouvez le réactiver quand vous voulez.
          </p>
          <button type="button" disabled={busy !== null} onClick={() => run("reactivate")} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
            {busy === "reactivate" ? "…" : "Réactiver mon compte"}
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, margin: "0 0 16px" }}>
            Confirmez votre disponibilité pour continuer à recevoir des offres de test rapidement. Vous pouvez aussi vous mettre en pause ou désactiver votre compte à tout moment.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" disabled={busy !== null} onClick={() => run("confirm_available")} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
              {busy === "confirm_available" ? "…" : "Je suis disponible (3 mois)"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => run("set_unavailable")} style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }}>
              {busy === "set_unavailable" ? "…" : "Me rendre indisponible"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => { setConfirmDeactivate(true); setMsg(null); }} style={{ ...ghostBtn, color: "#b91c1c", borderColor: "rgba(185,28,28,0.3)" }}>
              Désactiver mon compte
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#86868B", margin: "12px 0 0" }}>
            « Me rendre indisponible » vous retire des offres mais garde votre compte. « Désactiver » est réversible.
            Pour supprimer définitivement, voir la zone dangereuse ci-dessous.
          </p>
        </>
      )}

      {/* Modale de confirmation désactivation */}
      {confirmDeactivate && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setConfirmDeactivate(false)}
        >
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>Désactiver mon compte ?</h3>
            <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, margin: "0 0 20px" }}>
              Vous ne recevrez plus d&apos;offres et n&apos;apparaîtrez plus dans le panel. Votre compte et vos données sont conservés : vous pourrez le réactiver à tout moment.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setConfirmDeactivate(false)} style={ghostBtn}>Annuler</button>
              <button type="button" disabled={busy !== null} onClick={() => run("deactivate")} style={{ padding: "11px 22px", fontSize: 14, fontWeight: 700, color: "#fff", background: "#b91c1c", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit" }}>
                {busy === "deactivate" ? "…" : "Désactiver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
