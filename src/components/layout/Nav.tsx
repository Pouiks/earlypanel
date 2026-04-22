"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  const isIndex = pathname === "/";
  const isB2B = pathname === "/entreprises";
  const isB2C = pathname === "/testeurs";

  return (
    <nav className="nav">
      <Link href="/" className="logo">
        test<em>panel</em>
      </Link>

      {isIndex && (
        <div className="nav-links">
          <a href="#process">Comment ça marche</a>
          <a href="#tarifs">Tarifs</a>
          <Link href="/entreprises">Vous êtes une entreprise ?</Link>
        </div>
      )}

      {isB2B && (
        <div className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href="/entreprises" className="active">Entreprises</Link>
          <Link href="/testeurs">Devenir testeur</Link>
        </div>
      )}

      {isB2C && (
        <div className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href="/entreprises">Entreprises</Link>
          <Link href="/testeurs" className="active">Devenir testeur</Link>
        </div>
      )}

      <div className="nav-actions">
        {isB2C ? (
          <Link href="/entreprises" className="nav-secondary">Vous êtes une entreprise ?</Link>
        ) : (
          <Link href="/testeurs" className="nav-secondary">Devenir testeur</Link>
        )}
        {isB2C ? (
          <button className="nav-cta" onClick={() => document.getElementById("register")?.scrollIntoView({ behavior: "smooth" })}>
            Rejoindre le panel
          </button>
        ) : (
          <button className="nav-cta">
            {isB2B ? "Démarrer un projet" : "Lancer un test"}
          </button>
        )}
      </div>
    </nav>
  );
}
