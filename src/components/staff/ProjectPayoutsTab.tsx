"use client";

import { useCallback, useEffect, useState } from "react";

interface PayoutRow {
  id: string;
  calculated_amount_cents: number;
  final_amount_cents: number;
  status: string;
  stripe_transfer_id: string | null;
  paid_at: string | null;
  last_error: string | null;
  tester: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    stripe_account_id: string | null;
  };
}

interface ProjectPayoutsTabProps {
  projectId: string;
}

function centsToEuros(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",");
}

export default function ProjectPayoutsTab({ projectId }: ProjectPayoutsTabProps) {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/payouts`);
      if (res.ok) {
        const data = await res.json();
        const list = (data.payouts || []) as PayoutRow[];
        setPayouts(list);
        const init: Record<string, string> = {};
        list.forEach((p) => {
          init[p.id] = String(p.final_amount_cents / 100);
        });
        setEdits(init);
      } else {
        const err = await res.json();
        setMessage(err.error || "Erreur chargement");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function saveAmount(payoutId: string) {
    const raw = edits[payoutId]?.replace(",", ".") ?? "0";
    const euros = parseFloat(raw);
    if (!Number.isFinite(euros) || euros < 0) {
      setMessage("Montant invalide");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/payouts`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payout_id: payoutId,
          final_amount_cents: Math.round(euros * 100),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error || "Erreur");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function paySelected() {
    const ids = [...selected].filter((id) => {
      const p = payouts.find((x) => x.id === id);
      return p && p.status !== "paid";
    });
    if (ids.length === 0) {
      setMessage("Sélectionnez au moins un versement en attente.");
      return;
    }
    if (!confirm(`Déclencher ${ids.length} versement(s) ?`)) return;
    setPaying(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/staff/projects/${projectId}/payouts/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payout_ids: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Erreur");
        return;
      }
      const failed = (data.results || []).filter((r: { ok: boolean }) => !r.ok);
      if (failed.length > 0) {
        setMessage(
          failed.map((f: { error?: string }) => f.error).join(" · ") || "Certains versements ont échoué"
        );
      } else {
        setMessage("Versements traités.");
      }
      setSelected(new Set());
      await load();
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#86868b" }}>Chargement…</div>;
  }

  if (payouts.length === 0) {
    return (
      <div style={{
        padding: 32, textAlign: "center", background: "#fff",
        borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)",
      }}>
        <p style={{ fontSize: 14, color: "#86868b", margin: 0 }}>
          Aucun versement calculé. Les lignes apparaissent après la première notation staff sur une mission soumise.
        </p>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div style={{
          marginBottom: 16, padding: 12, borderRadius: 10,
          background: message.includes("traités") ? "#f0faf5" : "#fef2f2",
          color: message.includes("traités") ? "#0A7A5A" : "#b91c1c",
          fontSize: 13,
        }}>
          {message}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={paySelected}
          disabled={paying || selected.size === 0}
          style={{
            padding: "10px 20px", background: paying || selected.size === 0 ? "#d1d5db" : "#0A7A5A",
            color: "#fff", border: "none", borderRadius: 980, fontWeight: 700,
            fontSize: 13, cursor: paying || selected.size === 0 ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {paying ? "Paiement…" : "Payer la sélection (Stripe)"}
        </button>
      </div>

      <div style={{ overflowX: "auto", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f5f5f7", textAlign: "left" }}>
              <th style={{ padding: 10, width: 40 }} />
              <th style={{ padding: 10 }}>Testeur</th>
              <th style={{ padding: 10 }}>Calculé</th>
              <th style={{ padding: 10 }}>Final (€)</th>
              <th style={{ padding: 10 }}>Statut</th>
              <th style={{ padding: 10 }} />
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
                <td style={{ padding: 10 }}>
                  {p.status !== "paid" && (
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      style={{ accentColor: "#0A7A5A" }}
                    />
                  )}
                </td>
                <td style={{ padding: 10 }}>
                  {p.tester.first_name} {p.tester.last_name}
                  <div style={{ fontSize: 11, color: "#86868b" }}>{p.tester.email}</div>
                  {!p.tester.stripe_account_id && p.final_amount_cents > 0 && (
                    <div style={{ fontSize: 11, color: "#d97706" }}>Stripe non connecté</div>
                  )}
                </td>
                <td style={{ padding: 10 }}>{centsToEuros(p.calculated_amount_cents)} €</td>
                <td style={{ padding: 10 }}>
                  {p.status === "paid" ? (
                    centsToEuros(p.final_amount_cents) + " €"
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={edits[p.id] ?? ""}
                        onChange={(e) => setEdits((m) => ({ ...m, [p.id]: e.target.value }))}
                        style={{
                          width: 80, padding: "6px 8px", borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.12)", fontFamily: "inherit",
                        }}
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => saveAmount(p.id)}
                        style={{
                          padding: "6px 12px", fontSize: 12, fontWeight: 600,
                          background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.1)",
                          borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        OK
                      </button>
                    </div>
                  )}
                </td>
                <td style={{ padding: 10 }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: 980, fontSize: 11, fontWeight: 600,
                    background: p.status === "paid" ? "#f0faf5" : "#fef3c7",
                    color: p.status === "paid" ? "#0A7A5A" : "#92400e",
                  }}>
                    {p.status}
                  </span>
                  {p.last_error && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{p.last_error}</div>
                  )}
                </td>
                <td style={{ padding: 10, fontSize: 11, color: "#86868b" }}>
                  {p.stripe_transfer_id || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
