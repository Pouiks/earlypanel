import { describe, it, expect } from "vitest";
import { getPayoutDisplayStatus } from "@/lib/payout-status";

describe("getPayoutDisplayStatus — cohérence des statuts de versement", () => {
  it("0 € n'est JAMAIS 'Payé' → 'Aucun versement dû', non payable", () => {
    const d = getPayoutDisplayStatus({ status: "pending", final_amount_cents: 0 });
    expect(d.key).toBe("no_payment");
    expect(d.label).toBe("Aucun versement dû");
    expect(d.payable).toBe(false);
  });

  it("0 € reste 'Aucun versement dû' même avec un transfer_id résiduel", () => {
    const d = getPayoutDisplayStatus({ status: "pending", final_amount_cents: 0, stripe_transfer_id: "sim_tr_x" });
    expect(d.key).toBe("no_payment");
  });

  it("pending + montant > 0 sans transfert → 'En attente', payable", () => {
    const d = getPayoutDisplayStatus({ status: "pending", final_amount_cents: 2200 });
    expect(d.key).toBe("pending");
    expect(d.payable).toBe(true);
  });

  it("pending + montant > 0 + transfert initié → 'En cours', PAS payable", () => {
    const d = getPayoutDisplayStatus({ status: "pending", final_amount_cents: 2200, stripe_transfer_id: "tr_123" });
    expect(d.key).toBe("processing");
    expect(d.label).toBe("En cours");
    expect(d.payable).toBe(false);
  });

  it("paid → 'Payé', non payable", () => {
    const d = getPayoutDisplayStatus({ status: "paid", final_amount_cents: 2200, stripe_transfer_id: "tr_123" });
    expect(d.key).toBe("paid");
    expect(d.payable).toBe(false);
  });

  it("failed + montant > 0 → 'Échoué', rejouable (payable)", () => {
    const d = getPayoutDisplayStatus({ status: "failed", final_amount_cents: 2200 });
    expect(d.key).toBe("failed");
    expect(d.payable).toBe(true);
  });

  it("failed à 0 € → non payable (rien à verser)", () => {
    const d = getPayoutDisplayStatus({ status: "failed", final_amount_cents: 0 });
    expect(d.payable).toBe(false);
  });

  it("approved + montant > 0 → payable", () => {
    const d = getPayoutDisplayStatus({ status: "approved", final_amount_cents: 2200 });
    expect(d.key).toBe("approved");
    expect(d.payable).toBe(true);
  });
});
