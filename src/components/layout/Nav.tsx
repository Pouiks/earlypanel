"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { BOOKING_URL } from "@/lib/cta-links";

interface SessionState {
  authenticated: boolean;
  first_name?: string | null;
  profile_completed?: boolean;
}

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);

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

  // Detection session testeur : si authentifie on remplace le CTA
  // "Devenir testeur" / "Rejoindre le panel" par "Mon espace".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/testers/session", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as SessionState;
        if (!cancelled) setSession(data);
      } catch {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  const isAuthed = !!session?.authenticated;
  const dashboardHref = session?.profile_completed ? "/app/dashboard" : "/app/onboarding";

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
        {isAuthed ? (
          <Link href={dashboardHref} className="nav-cta nav-cta-authed">
            <svg className="nav-cta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12l9-9 9 9" />
              <path d="M5 10v10h14V10" />
            </svg>
            Mon espace
          </Link>
        ) : (
          <>
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
          </>
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
              {isAuthed ? (
                <Link href={dashboardHref} className="nav-cta nav-cta-authed" onClick={() => setMenuOpen(false)}>
                  <svg className="nav-cta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 12l9-9 9 9" />
                    <path d="M5 10v10h14V10" />
                  </svg>
                  Mon espace
                </Link>
              ) : isB2C ? (
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
