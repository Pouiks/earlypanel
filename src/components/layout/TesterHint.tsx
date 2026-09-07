import Link from "next/link";

/**
 * Ligne texte juste au-dessus du footer de la home : la nav business ne
 * mentionne plus les testeurs, ce lien est leur point d'entree depuis /.
 */
export default function TesterHint() {
  return (
    <div className="tester-hint">
      Vous voulez devenir testeur rémunéré ? <Link href="/testeurs">Rejoindre le panel →</Link>
    </div>
  );
}
