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

export type NavAudience = "business" | "tester";

/**
 * Navigation marketing, deux variantes :
 *   - business (home, /entreprises, landings, pages legales) : 100 % entreprise,
 *     lien « Connexion » discret sans le mot testeur.
 *   - tester (/testeurs) : 100 % testeur, avec « Accéder à mon espace ».
 * Si `audience` n'est pas fourni, on la deduit du pathname.
 * Un testeur deja connecte voit « Mon espace » dans les deux variantes.
 */
export default function Nav({ audience }: { audience?: NavAudience }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);

  const resolved: NavAudience = audience ?? (pathname === "/testeurs" ? "tester" : "business");
  const isTester = resolved === "tester";

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [menuOpen]);

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
  const close = () => setMenuOpen(false);

  const links = isTester
    ? [
        { href: "#how", label: "Comment ça marche" },
        { href: "#pay", label: "Rémunération" },
        { href: "#faq", label: "FAQ" },
      ]
    : [
        { href: "/#process", label: "Comment ça marche" },
        { href: "/entreprises#situations", label: "Quand nous appeler" },
        { href: "/entreprises#faq", label: "Tarifs & FAQ" },
        { href: "/blog", label: "Blog" },
        { href: "/entreprises#brief", label: "Démarrer un projet" },
      ];

  const authedCta = (
    <Link href={dashboardHref} className="nav-cta nav-cta-authed" onClick={close}>
      <svg className="nav-cta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 12l9-9 9 9" />
        <path d="M5 10v10h14V10" />
      </svg>
      Mon espace
    </Link>
  );

  const primaryCta = isTester ? (
    <a href="#register" className="nav-cta" onClick={close}>Rejoindre le panel</a>
  ) : (
    <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="nav-cta" onClick={close}>Réserver un appel</a>
  );

  // Cote entreprise, un testeur potentiel doit comprendre en un coup d'oeil
  // qu'il peut s'inscrire : lien texte discret avant « Connexion ».
  const secondaryCta = isTester ? (
    <Link href="/app/login" className="nav-secondary" onClick={close}>Accéder à mon espace</Link>
  ) : (
    <>
      <Link href="/testeurs" className="nav-textlink" onClick={close}>Devenir testeur</Link>
      <Link href="/app/login" className="nav-textlink" onClick={close}>Connexion</Link>
    </>
  );

  return (
    <nav className="nav">
      <Link href="/" className="logo">
        early<em>panel</em>
      </Link>

      <div className="nav-links">
        {links.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
        {isTester && <Link href="/entreprises" className="nav-textlink">Vous êtes une entreprise ?</Link>}
      </div>

      <div className="nav-actions">
        {isAuthed ? authedCta : (
          <>
            {secondaryCta}
            {primaryCta}
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
        <div className="mobile-menu" onClick={close}>
          <div className="mobile-menu-inner" onClick={e => e.stopPropagation()}>
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={close}>{l.label}</a>
            ))}
            {isTester
              ? <Link href="/entreprises" onClick={close}>Vous êtes une entreprise ?</Link>
              : <>
                  <Link href="/entreprises" onClick={close}>Page entreprises</Link>
                  <Link href="/testeurs" onClick={close}>Devenir testeur rémunéré</Link>
                </>}
            <div className="mobile-menu-cta">
              {isAuthed ? authedCta : (
                <>
                  <div style={{ display: "block", marginBottom: 12, textAlign: "center" }}>{secondaryCta}</div>
                  {primaryCta}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
