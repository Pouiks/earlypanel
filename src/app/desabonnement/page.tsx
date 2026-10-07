import type { Metadata } from "next";
import UnsubscribeConfirmation from "./UnsubscribeConfirmation";

export const metadata: Metadata = {
  title: "Désabonnement", // le template du layout ajoute « · earlypanel »
  description: "Désabonnement de l'ensemble des communications earlypanel.",
  robots: { index: false, follow: false },
};

export default function DesabonnementPage() {
  return <UnsubscribeConfirmation />;
}
