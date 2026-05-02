"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmModal";

interface PayoutRow {
  id: string;
  created_at: string;
  project_id: string;
  tester_id: string;
  calculated_amount_cents: number;
  final_amount_cents: number;
  status: "pending" | "approved" | "paid" | "failed";
  paid_at: string | null;
  exported_at: string | null;
  sepa_batch_ref: string | null;
  payment_info_configured: boolean;
  tester: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    persona_id: string | null;
  } | null;
  project: {
    id: string;
    title: string;
    ref_number: string | null;
    company_name: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuve",
  paid: "Paye",
  failed: "Echec",
};
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#fff7e6", fg: "#b45309" },
  approved: { bg: "#eff6ff", fg: "#1d4ed8" },
  paid: { bg: "#f0faf5", fg: "#0A7A5A" },
  failed: { bg: "#fef2f2", fg: "#b91c1c" },
};

const FILTERS = [
  { value: "pending", label: "A payer" },
  { value: "approved", label: "Approuves" },
  { value: "paid", label: "Payes" },
  { value: "failed", label: "Echecs" },
  { value: "all", label: "Tous" },
];

function fmtAmount(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export default function StaffPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const { notify, confirm, ConfirmModal } = useConfirm();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", filter);
      if (batchFilter.trim()) params.set("sepa_batch_ref", batchFilter.trim());
      const res = await fetch(`/api/staff/payouts?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setPayouts(data.payouts ?? []);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filter, batchFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payouts;
    return payouts.filter((p) => {
      const name = `${p.tester?.first_name ?? ""} ${p.tester?.last_name ?? ""}`.toLowerCase();
      return name.includes(q)
        || (p.tester?.email?.toLowerCase() ?? "").includes(q)
        || (p.project?.title?.toLowerCase() ?? "").includes(q)
        || (p.project?.ref_number?.toLowerCase() ?? "").includes(q)
        || (p.sepa_batch_ref?.toLowerCase() ?? "").includes(q);
    });
  }, [payouts, search]);

  const eligible = useMemo(
    () => filtered.filter((p) => (p.status === "pending" || p.status === "approved") && !p.exported_at && p.payment_info_configured),
    [filtered],
  );
  const allEligibleSelected = eligible.length > 0 && eligible.every((p) => selected.has(p.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allEligibleSelected ? new Set() : new Set(eligible.map((p) => p.id)));
  }

  async function handleExport() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/staff/payouts/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      // Recupere le filename depuis Content-Disposition.
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^";]+)"?/.exec(cd);
      const filename = match?.[1] ?? `payouts-${Date.now()}.csv`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await notify({
        title: "CSV genere",
        message: `Lot ${filename.replace(/\.csv$/i, "")} : ${selected.size} virement(s) prets a importer dans Qonto. Une fois execute, revenez ici et cliquez "Marquer le batch comme paye".`,
      });
      await load();
    } catch (e) {
      await notify({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur export" });
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkBatchPaid(batchRef: string, count: number) {
    const ok = await confirm({
      title: `Marquer "${batchRef}" comme paye ?`,
      message: `Les ${count} testeur(s) du lot recevront un email de confirmation. Cette action n'execute pas le virement — assurez-vous qu'il a deja ete fait chez Qonto.`,
      confirmLabel: "Confirmer",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/staff/payouts/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sepa_batch_ref: batchRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      await notify({
        title: "Lot marque comme paye",
        message: `${data.rows_count} testeur(s) notifie(s). Total : ${fmtAmount(data.total_amount_cents)}.`,
      });
      await load();
    } catch (e) {
      await notify({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur marquage" });
    } finally {
      setBusy(false);
    }
  }

  // Regroupe les lignes exported_at par batch (pour bouton "marquer batch paye")
  const batchesWaiting = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    payouts.forEach((p) => {
      if (p.sepa_batch_ref && p.exported_at && (p.status === "pending" || p.status === "approved")) {
        const cur = map.get(p.sepa_batch_ref) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total += p.final_amount_cents;
        map.set(p.sepa_batch_ref, cur);
      }
    });
    return Array.from(map.entries()).map(([ref, v]) => ({ ref, ...v }));
  }, [payouts]);

  const totalSelected = useMemo(
    () => Array.from(selected).reduce((s, id) => {
      const p = payouts.find((x) => x.id === id);
      return s + (p?.final_amount_cents ?? 0);
    }, 0),
    [selected, payouts],
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", margin: 0 }}>
          Versements testeurs
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#86868B" }}>
          Liste des paiements a effectuer. earlypanel ne fait pas les virements : exporte le CSV, importe-le dans Qonto, puis reviens marquer comme paye.
        </p>
      </div>

      {batchesWaiting.length > 0 && (
        <div style={{
          background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 16, padding: "16px 20px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 10 }}>
            Lots exportes en attente de confirmation de paiement
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {batchesWaiting.map((b) => (
              <div key={b.ref} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: "#92400e" }}>
                  <strong>{b.ref}</strong> — {b.count} virement(s), total {fmtAmount(b.total)}
                </div>
                <button
                  onClick={() => handleMarkBatchPaid(b.ref, b.count)}
                  disabled={busy}
                  style={{
                    padding: "7px 16px", fontSize: 12, fontWeight: 700,
                    background: "#0A7A5A", color: "#fff", border: "none",
                    borderRadius: 980, cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  Marquer comme paye
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: "7px 16px", fontSize: 13,
                fontWeight: filter === opt.value ? 600 : 400,
                color: filter === opt.value ? "#0A7A5A" : "#6e6e73",
                background: filter === opt.value ? "#f0faf5" : "transparent",
                border: filter === opt.value ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
                borderRadius: 980, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Rechercher (nom, email, projet, ref batch…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 240,
            padding: "10px 14px", fontSize: 13,
            border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
            fontFamily: "inherit", background: "#fff",
          }}
        />
        <input
          type="text"
          placeholder="Filtrer par batch (BATCH-…)"
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          style={{
            width: 200,
            padding: "10px 14px", fontSize: 13,
            border: "1px solid rgba(0,0,0,0.12)", borderRadius: 980,
            fontFamily: "inherit", background: "#fff",
          }}
        />
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}

      {selected.size > 0 && (
        <div style={{
          position: "sticky", top: 12, zIndex: 5,
          background: "#0A7A5A", color: "#fff",
          padding: "12px 20px", borderRadius: 14,
          marginBottom: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {selected.size} ligne(s) selectionnee(s) — total {fmtAmount(totalSelected)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setSelected(new Set())}
              disabled={busy}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 600,
                background: "rgba(255,255,255,0.2)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)", borderRadius: 980,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Deselectionner
            </button>
            <button
              onClick={handleExport}
              disabled={busy}
              style={{
                padding: "7px 16px", fontSize: 12, fontWeight: 700,
                background: "#fff", color: "#0A7A5A",
                border: "none", borderRadius: 980,
                cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "Generation…" : "Exporter le lot CSV"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#86868B" }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.08)", padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>
            Aucun versement
          </h2>
          <p style={{ fontSize: 14, color: "#86868B", margin: 0 }}>
            Les paiements apparaissent ici quand un testeur termine une mission validee.
          </p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "32px 1.5fr 1.4fr 0.8fr 0.8fr 0.8fr 0.8fr",
            gap: 10, padding: "12px 16px", background: "#fafafa",
            borderBottom: "0.5px solid rgba(0,0,0,0.06)",
            fontSize: 11, fontWeight: 700, color: "#86868B", letterSpacing: 0.4, textTransform: "uppercase",
            alignItems: "center",
          }}>
            <input
              type="checkbox"
              checked={allEligibleSelected}
              onChange={toggleAll}
              disabled={eligible.length === 0}
              title={`Selectionner les ${eligible.length} ligne(s) eligibles`}
            />
            <div>Testeur</div>
            <div>Projet</div>
            <div>Montant</div>
            <div>Statut</div>
            <div>Batch</div>
            <div>Date paiement</div>
          </div>
          {filtered.map((p) => {
            const sc = STATUS_COLORS[p.status];
            const fullName = `${p.tester?.first_name ?? ""} ${p.tester?.last_name ?? ""}`.trim() || "—";
            const isEligible = (p.status === "pending" || p.status === "approved") && !p.exported_at && p.payment_info_configured;
            const isSelected = selected.has(p.id);
            return (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1.5fr 1.4fr 0.8fr 0.8fr 0.8fr 0.8fr",
                  gap: 10, padding: "12px 16px",
                  borderBottom: "0.5px solid rgba(0,0,0,0.04)",
                  alignItems: "center", fontSize: 13, color: "#1d1d1f",
                  background: isSelected ? "#f0faf5" : "transparent",
                  transition: "background 100ms",
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(p.id)}
                  disabled={!isEligible}
                  title={
                    !p.payment_info_configured ? "IBAN non configure"
                      : p.exported_at ? "Deja exporte dans un batch"
                        : p.status === "paid" ? "Deja paye"
                          : ""
                  }
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                    {fullName}
                    {!p.payment_info_configured && (
                      <span title="IBAN non configure" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: "#fef3c7", color: "#b45309", fontSize: 10, fontWeight: 700 }}>!</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#86868B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.tester?.email}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.project?.title || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#86868B" }}>
                    {p.project?.ref_number ?? p.project?.company_name ?? ""}
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {fmtAmount(p.final_amount_cents)}
                </div>
                <div>
                  <span style={{ padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 980, background: sc.bg, color: sc.fg }}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#86868B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.sepa_batch_ref ? <code style={{ fontSize: 11 }}>{p.sepa_batch_ref}</code> : "—"}
                </div>
                <div style={{ fontSize: 11, color: "#86868B" }}>
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString("fr-FR") : (p.exported_at ? `Exporte ${new Date(p.exported_at).toLocaleDateString("fr-FR")}` : "—")}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal />
    </div>
  );
}
