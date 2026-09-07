import Link from "next/link";

/**
 * Bandeau haut de page B2B (home et /entreprises).
 *
 * Rarete plutot que promo : « tarif preferentiel » signalait l'absence de
 * clients et contredisait les CGV. Un nombre de missions pilotes limite est
 * vrai (missions relues a la main) et pousse a l'action sans brader.
 * `visible={false}` pour le masquer sans le supprimer.
 */
export default function AnnounceBar({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <Link href="/entreprises#brief" className="announce">
      <b>3 missions pilotes ouvertes ce mois</b> · réponse sous 24h &nbsp;→
    </Link>
  );
}
