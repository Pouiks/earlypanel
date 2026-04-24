"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { BOOKING_URL } from "@/lib/cta-links";

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isIndex = pathname === "/";
  const isB2B = pathname === "/entreprises";
  const isB2C = pathname === "/testeurs";

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [menuOpen]);

  return (
    <nav className="nav">
      <Link href="/" className="logo">
        early<em>panel</em>
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
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="nav-cta">
            {isB2B ? "Démarrer un projet" : "Lancer un test"}
          </a>
        )}
      </div>

      <button
        className={`nav-burger${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Menu"
        aria-expanded={menuOpen}
      >
        <span /><span /><span />
      </button>

      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-inner" onClick={e => e.stopPropagation()}>
            <Link href="/" onClick={() => setMenuOpen(false)}>Accueil</Link>
            <Link href="/entreprises" onClick={() => setMenuOpen(false)}>Entreprises</Link>
            <Link href="/testeurs" onClick={() => setMenuOpen(false)}>Devenir testeur</Link>
            {isIndex && <>
              <a href="#process" onClick={() => setMenuOpen(false)}>Comment ça marche</a>
              <a href="#tarifs" onClick={() => setMenuOpen(false)}>Tarifs</a>
            </>}
            <div className="mobile-menu-cta">
              {isB2C ? (
                <button className="nav-cta" onClick={() => { setMenuOpen(false); document.getElementById("register")?.scrollIntoView({ behavior: "smooth" }); }}>
                  Rejoindre le panel
                </button>
              ) : (
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="nav-cta" onClick={() => setMenuOpen(false)}>
                  {isB2B ? "Démarrer un projet" : "Lancer un test"}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
