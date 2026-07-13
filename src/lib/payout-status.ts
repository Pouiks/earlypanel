/**
 * Statut d'affichage d'un versement, derive de l'etat reel en base.
 *
 * Le modele de donnees ne stocke que 4 statuts (`pending`, `approved`,
 * `paid`, `failed`). Deux etats metier importants sont DERIVES sans nouvelle
 * colonne, pour rester coherent partout (staff + testeur) :
 *
 *   - "Aucun versement dû" : montant final a 0 € → rien a payer (jamais "Payé").
 *   - "En cours" : `pending` AVEC un `stripe_transfer_id` → transfert initie,
 *     en attente du retour de paiement (webhook Stripe ou simulation).
 *
 * Source de verite unique de l'affichage : ne pas dupliquer ces regles.
 */

export type PayoutDisplayKey =
  | "paid"
  | "failed"
  | "no_payment"
  | "processing"
  | "pending"
  | "approved";

export interface PayoutDisplayStatus {
  key: PayoutDisplayKey;
  label: string;
  bg: string;
  color: string;
  /** true si le staff peut (re)declencher un paiement sur cette ligne. */
  payable: boolean;
}

export interface PayoutStateInput {
  status: string;
  final_amount_cents: number;
  stripe_transfer_id?: string | null;
}

export function getPayoutDisplayStatus(p: PayoutStateInput): PayoutDisplayStatus {
  if (p.status === "paid") {
    return { key: "paid", label: "Payé", bg: "#D1FAE5", color: "#065F46", payable: false };
  }
  if (p.status === "failed") {
    // Un echec est rejouable tant qu'il y a un montant a verser.
    return { key: "failed", label: "Échoué", bg: "#FEE2E2", color: "#991B1B", payable: (p.final_amount_cents ?? 0) > 0 };
  }
  if ((p.final_amount_cents ?? 0) <= 0) {
    return { key: "no_payment", label: "Aucun versement dû", bg: "#F1F1F3", color: "#6E6E73", payable: false };
  }
  if (p.stripe_transfer_id) {
    // Transfert initie, en attente du retour de paiement.
    return { key: "processing", label: "En cours", bg: "#DBEAFE", color: "#1E40AF", payable: false };
  }
  if (p.status === "approved") {
    return { key: "approved", label: "Approuvé", bg: "#DBEAFE", color: "#1E40AF", payable: true };
  }
  return { key: "pending", label: "En attente", bg: "#FEF3C7", color: "#92600A", payable: true };
}
