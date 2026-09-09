"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project } from "@/types/staff";

/**
 * Onglet Finances d'un projet : LECTURE SEULE.
 *
 * Trois donnees saisies (formulaire projet, bouton « Modifier ») :
 * devis HT, date d'encaissement de l'acompte, date d'encaissement du solde.
 * Tout le reste est calcule ici, sans saisie :
 *   - cote client : encaisse / reste a encaisser (regle 50 % commande,
 *     50 % remise du rapport, la seule formulation du site) ;
 *   - cote testeurs : engage (versements crees a la notation, hors echecs),
 *     paye, reste a payer, depuis `tester_payouts` ;
 *   - marge estimee = devis - engage.
 *
 * Montants en centimes partout, conversion en euros uniquement a l'affichage.
 */

interface PayoutLite {
  id: string;
  status: "pending" | "approved" | "paid" | "failed" | string;
  final_amount_cents: number;
  calculated_amount_cents: number;
  paid_at: string | null;
  tester: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
}

interface Props {
  project: Project;
}

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

function eur(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "Non renseigné";
  return EUR.format(cents / 100);
}

function dateFr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: "0.5px solid rgba(0,0,0,0.08)",
  padding: "24px",
};

const h2: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em", margin: "0 0 16px",
};

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "green" | "amber" | "red" | "neutral" }) {
  const color = tone === "green" ? "#0A7A5A" : tone === "amber" ? "#b45309" : tone === "red" ? "#b91c1c" : "#1d1d1f";
  return (
    <div style={{ ...card, padding: "18px 20px" }}>
      <div style={{ fontSize: 12, color: "#86868B", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.03em" }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: "#86868B", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
      <div>
        <div style={{ fontSize: 14, color: "#1d1d1f", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "#86868B", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

export default function ProjectFinancesTab({ project }: Props) {
  const [payouts, setPayouts] = useState<PayoutLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pas de setState synchrone dans l'effet (regle react-hooks) : `loading`
  // demarre a true et n'est bascule qu'apres la reponse.
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/projects/${project.id}/payouts`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Erreur de chargement des versements");
        return;
      }
      const data = await res.json();
      setPayouts((data.payouts || []) as PayoutLite[]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const f = useMemo(() => {
    const quote = project.quote_amount_cents ?? null;
    const half = quote !== null ? Math.round(quote / 2) : null;
    const depositIn = !!project.deposit_paid_at;
    const balanceIn = !!project.balance_paid_at;
    const collected = quote !== null ? (depositIn ? half! : 0) + (balanceIn ? quote - half! : 0) : null;
    const toCollect = quote !== null && collected !== null ? quote - collected : null;

    // Versements : un echec (failed) sera rejoue, il reste du a payer ; on
    // le compte dans « reste a payer », pas dans « paye ».
    let engaged = 0, paid = 0, toPay = 0, nPaid = 0, nToPay = 0, nFailed = 0;
    for (const p of payouts) {
      const amt = Number(p.final_amount_cents) || 0;
      engaged += amt;
      if (p.status === "paid") { paid += amt; nPaid++; }
      else { toPay += amt; nToPay++; if (p.status === "failed") nFailed++; }
    }
    const margin = quote !== null ? quote - engaged : null;
    const marginPct = quote ? Math.round((margin! / quote) * 100) : null;

    // Projection : moyenne des versements engages x nombre de testeurs
    // voulu. Purement indicatif, affiche seulement si on a de quoi projeter.
    const headcount = project.target_headcount ?? null;
    const avg = payouts.length ? Math.round(engaged / payouts.length) : null;
    const projected = headcount && avg !== null && payouts.length < headcount ? avg * headcount : null;

    return { quote, half, depositIn, balanceIn, collected, toCollect, engaged, paid, toPay, nPaid, nToPay, nFailed, margin, marginPct, headcount, avg, projected };
  }, [project, payouts]);

  const marginTone = f.margin === null ? "neutral" : f.margin < 0 ? "red" : f.marginPct !== null && f.marginPct < 30 ? "amber" : "green";

  return (
    <div>
      <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 20px" }}>
        Lecture seule. Le devis et les dates d&apos;encaissement se saisissent via « Modifier » (section Facturation). Les montants testeurs viennent de l&apos;onglet Versements.
      </p>

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{error}</div>
      )}

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        <Kpi label="Facturé (devis HT)" value={eur(f.quote)} hint={f.quote === null ? "Devis non renseigné" : undefined} />
        <Kpi label="Encaissé" value={eur(f.collected)} tone={f.collected ? "green" : "neutral"} hint={f.quote !== null ? `${(f.depositIn ? 1 : 0) + (f.balanceIn ? 1 : 0)} règlement(s) sur 2` : undefined} />
        <Kpi label="Reste à encaisser" value={eur(f.toCollect)} tone={f.toCollect ? "amber" : "neutral"} />
        <Kpi label="Coût testeurs engagé" value={eur(f.engaged)} hint={loading ? "Chargement…" : `${payouts.length} versement(s)`} />
        <Kpi label="Payé aux testeurs" value={eur(f.paid)} hint={`${f.nPaid} versement(s)`} />
        <Kpi label="Reste à payer" value={eur(f.toPay)} tone={f.toPay ? "amber" : "neutral"} hint={f.nFailed ? `${f.nToPay} en attente dont ${f.nFailed} en échec` : `${f.nToPay} en attente`} />
        <Kpi label="Marge estimée" value={f.margin === null ? "Non calculée" : `${eur(f.margin)}${f.marginPct !== null ? ` · ${f.marginPct} %` : ""}`} tone={marginTone} hint={f.margin === null ? "Nécessite un devis" : "Devis − coût testeurs engagé"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Cote client */}
        <div style={card}>
          <h2 style={h2}>Encaissements client</h2>
          {f.quote === null ? (
            <p style={{ fontSize: 13, color: "#86868B", margin: 0 }}>Aucun devis renseigné sur ce projet.</p>
          ) : (
            <>
              <Row label="Devis HT" value={eur(f.quote)} sub={project.company_name ?? null} />
              <Row
                label="Acompte à la commande (50 %)"
                value={eur(f.half)}
                sub={f.depositIn ? `Encaissé le ${dateFr(project.deposit_paid_at)}` : "À encaisser"}
              />
              <Row
                label="Solde à la remise du rapport (50 %)"
                value={eur(f.quote - (f.half ?? 0))}
                sub={f.balanceIn ? `Encaissé le ${dateFr(project.balance_paid_at)}` : "À encaisser"}
              />
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>
                <span>Reste à encaisser</span>
                <span>{eur(f.toCollect)}</span>
              </div>
            </>
          )}
        </div>

        {/* Cote testeurs */}
        <div style={card}>
          <h2 style={h2}>Coût testeurs</h2>
          {loading ? (
            <p style={{ fontSize: 13, color: "#86868B", margin: 0 }}>Chargement…</p>
          ) : payouts.length === 0 ? (
            <p style={{ fontSize: 13, color: "#86868B", margin: 0 }}>
              Aucun versement encore créé. Un versement apparaît à la première notation d&apos;un testeur (onglet Réponses).
            </p>
          ) : (
            <>
              <Row label="Versements créés" value={String(payouts.length)} sub={f.headcount ? `Objectif projet : ${f.headcount} testeur(s)` : null} />
              <Row label="Montant moyen par testeur" value={eur(f.avg)} />
              <Row label="Payé" value={eur(f.paid)} sub={`${f.nPaid} versement(s)`} />
              <Row label="Reste à payer" value={eur(f.toPay)} sub={`${f.nToPay} versement(s)`} />
              {f.projected !== null && (
                <Row
                  label="Projection si objectif atteint"
                  value={eur(f.projected)}
                  sub={`Moyenne actuelle × ${f.headcount} testeurs, indicatif`}
                />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>
                <span>Total engagé</span>
                <span>{eur(f.engaged)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail des versements */}
      {payouts.length > 0 && (
        <div style={{ ...card, marginTop: 20 }}>
          <h2 style={h2}>Détail par testeur</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "#86868B", fontSize: 12, textAlign: "left" }}>
                <th style={{ padding: "6px 8px", fontWeight: 600 }}>Testeur</th>
                <th style={{ padding: "6px 8px", fontWeight: 600 }}>Statut</th>
                <th style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Montant</th>
                <th style={{ padding: "6px 8px", fontWeight: 600 }}>Payé le</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => {
                const t = Array.isArray(p.tester) ? p.tester[0] : p.tester;
                const name = [t?.first_name, t?.last_name].filter(Boolean).join(" ") || "Testeur inconnu";
                const st = p.status === "paid" ? "Payé" : p.status === "failed" ? "Échec" : p.status === "approved" ? "Approuvé" : "En attente";
                const stColor = p.status === "paid" ? "#0A7A5A" : p.status === "failed" ? "#b91c1c" : "#b45309";
                return (
                  <tr key={p.id} style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: "8px" }}>{name}</td>
                    <td style={{ padding: "8px", color: stColor, fontWeight: 600 }}>{st}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      {eur(p.final_amount_cents)}
                      {p.final_amount_cents !== p.calculated_amount_cents && (
                        <span style={{ color: "#86868B", fontSize: 11, marginLeft: 6 }} title="Montant ajusté par le staff">(ajusté)</span>
                      )}
                    </td>
                    <td style={{ padding: "8px", color: "#6e6e73" }}>{dateFr(p.paid_at) ?? "Non payé"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
