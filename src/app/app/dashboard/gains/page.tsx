"use client";

import { useState, useEffect, useCallback } from "react";
import { useTester } from "../layout";
import EmptyState from "@/components/dashboard/EmptyState";

interface PayoutRow {
  id: string;
  created_at: string;
  final_amount_cents: number;
  calculated_amount_cents: number;
  status: string;
  paid_at: string | null;
  project: { name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "En attente", bg: "#FEF3C7", color: "#92600A" },
  approved: { label: "Approuvé", bg: "#DBEAFE", color: "#1E40AF" },
  paid: { label: "Payé", bg: "#D1FAE5", color: "#065F46" },
  failed: { label: "Échoué", bg: "#FEE2E2", color: "#991B1B" },
};

function centsToEuros(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",") + " €";
}

export default function GainsPage() {
  const { tester } = useTester();
  const [stripeLoading, setStripeLoading] = useState(false);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [totalPaidCents, setTotalPaidCents] = useState(0);
  const [totalPendingCents, setTotalPendingCents] = useState(0);
  const [loadingPayouts, setLoadingPayouts] = useState(true);

  const fetchPayouts = useCallback(async () => {
    setLoadingPayouts(true);
    try {
      const res = await fetch("/api/testers/payouts");
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts ?? []);
        setTotalPaidCents(data.total_paid_cents ?? 0);
        setTotalPendingCents(data.total_pending_cents ?? 0);
      }
    } finally {
      setLoadingPayouts(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  async function handleStripeOnboarding() {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/testers/stripe-onboarding", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      // silent
    } finally {
      setStripeLoading(false);
    }
  }

  if (!tester) {
    return <div style={{ padding: "60px 0", textAlign: "center", color: "#86868B" }}>Chargement…</div>;
  }

  const nextPending = payouts.find((p) => p.status === "pending" || p.status === "approved");

  return (
    <div>
      <h1 style={{
        fontSize: 24, fontWeight: 700, color: "#1d1d1f",
        margin: "0 0 4px", letterSpacing: "-0.04em",
      }}>
        Mes gains
      </h1>
      <p style={{ fontSize: 14, color: "#86868B", margin: "0 0 24px" }}>
        Suivi de vos rémunérations et versements
      </p>

      {/* --- 3 cartes stats --- */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12, marginBottom: 24,
      }}>
        <StatCard
          label="Total perçu"
          value={centsToEuros(totalPaidCents)}
          color="#0A7A5A"
        />
        <StatCard
          label="En attente"
          value={centsToEuros(totalPendingCents)}
          color="#92600A"
        />
        <StatCard
          label="Prochain virement"
          value={nextPending ? centsToEuros(nextPending.final_amount_cents) : "—"}
          color="#1d1d1f"
          sub={nextPending ? (nextPending.project as { name: string } | null)?.name ?? "" : "Aucun en attente"}
        />
      </div>

      {/* --- Stripe Connect --- */}
      <div style={{
        background: "#fff", borderRadius: 20,
        border: `0.5px solid ${tester.payment_setup ? "#0A7A5A" : "#F5C542"}`,
        padding: "24px", marginBottom: 24,
      }}>
        {tester.payment_setup ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#f0faf5", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 16,
              }}>✓</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0A7A5A" }}>
                Compte bancaire configuré
              </span>
            </div>
            <button
              onClick={handleStripeOnboarding}
              style={{
                padding: "8px 20px", fontSize: 13, fontWeight: 600,
                border: "1px solid rgba(0,0,0,0.1)", borderRadius: 980,
                background: "#fff", color: "#1d1d1f", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Gérer mes coordonnées →
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#92600A", margin: "0 0 6px" }}>
              Configurez votre compte bancaire
            </p>
            <p style={{ fontSize: 13, color: "#B8860B", margin: "0 0 16px", lineHeight: 1.5 }}>
              Pour recevoir vos paiements, connectez votre compte bancaire via Stripe.
            </p>
            <button
              onClick={handleStripeOnboarding}
              disabled={stripeLoading}
              style={{
                padding: "12px 24px", fontSize: 14, fontWeight: 700,
                border: "none", borderRadius: 980, background: "#0A7A5A",
                color: "#fff", cursor: stripeLoading ? "wait" : "pointer",
                fontFamily: "inherit", opacity: stripeLoading ? 0.7 : 1,
              }}
            >
              {stripeLoading ? "Chargement…" : "Configurer mes coordonnées bancaires →"}
            </button>
          </div>
        )}
      </div>

      {/* --- Historique --- */}
      <h2 style={{
        fontSize: 18, fontWeight: 700, color: "#1d1d1f",
        margin: "0 0 12px", letterSpacing: "-0.03em",
      }}>
        Historique des paiements
      </h2>

      {loadingPayouts ? (
        <div style={{ padding: 24, textAlign: "center", color: "#86868B", fontSize: 13 }}>Chargement…</div>
      ) : payouts.length === 0 ? (
        <EmptyState
          icon="💳"
          title="Aucun paiement pour le moment"
          description="Vos paiements apparaîtront ici après chaque mission validée."
        />
      ) : (
        <div style={{
          background: "#fff", borderRadius: 20,
          border: "0.5px solid rgba(0,0,0,0.08)", overflow: "hidden",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 100px 100px 120px",
            padding: "12px 20px", borderBottom: "0.5px solid rgba(0,0,0,0.08)",
            fontSize: 11, fontWeight: 600, color: "#86868B", textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}>
            <span>Projet</span>
            <span style={{ textAlign: "right" }}>Montant</span>
            <span style={{ textAlign: "center" }}>Statut</span>
            <span style={{ textAlign: "right" }}>Date</span>
          </div>
          {payouts.map((p) => {
            const st = STATUS_MAP[p.status] ?? STATUS_MAP.pending;
            return (
              <div
                key={p.id}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 100px 100px 120px",
                  padding: "14px 20px", borderBottom: "0.5px solid rgba(0,0,0,0.04)",
                  alignItems: "center", fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600, color: "#1d1d1f" }}>
                  {(p.project as { name: string } | null)?.name ?? "—"}
                </span>
                <span style={{ textAlign: "right", fontWeight: 700, color: "#1d1d1f" }}>
                  {centsToEuros(p.final_amount_cents)}
                </span>
                <span style={{ textAlign: "center" }}>
                  <span style={{
                    display: "inline-block", padding: "3px 10px",
                    borderRadius: 980, fontSize: 11, fontWeight: 600,
                    background: st.bg, color: st.color,
                  }}>
                    {st.label}
                  </span>
                </span>
                <span style={{ textAlign: "right", color: "#86868B", fontSize: 12 }}>
                  {p.paid_at
                    ? new Date(p.paid_at).toLocaleDateString("fr-FR")
                    : new Date(p.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, sub }: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 20,
      border: "0.5px solid rgba(0,0,0,0.08)",
      padding: "24px", textAlign: "center",
    }}>
      <p style={{
        fontSize: 32, fontWeight: 700, color,
        margin: "0 0 4px", letterSpacing: "-0.04em",
      }}>
        {value}
      </p>
      <p style={{ fontSize: 13, color: "#86868B", margin: 0 }}>{label}</p>
      {sub && (
        <p style={{ fontSize: 11, color: "#86868B", margin: "4px 0 0", fontStyle: "italic" }}>{sub}</p>
      )}
    </div>
  );
}
