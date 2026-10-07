"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { BOOKING_URL } from "@/lib/cta-links";
import { testerSpaceHref, useTesterSession } from "./useTesterSession";

export type NavAudience = "business" | "tester" | "neutral";

/**
 * Navigation marketing, trois variantes :
 *   - business (home, /entreprises, landings, blog) : 100 % entreprise,
 *     CTA Calendly, lien « Connexion » discret sans le mot testeur.
 *   - tester (/testeurs, guides, CGU) : 100 % testeur, avec « Accéder à mon espace ».
 *   - neutral (pages legales partagees) : liens entreprise mais CTA interne
 *     « Démarrer un projet ». Calendly est reserve aux entreprises et un
 *     testeur arrive sur ces pages depuis son inscription ou son footer.
 * Si `audience` n'est pas fourni, on la deduit du pathname.
 * Un testeur deja connecte voit « Mon espace » dans toutes les variantes.
 */
export default function Nav({ audience }: { audience?: NavAudience }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const session = useTesterSession();

  const resolved: NavAudience = audience ?? (pathname === "/testeurs" || pathname.startsWith("/testeurs/") ? "tester" : "business");
  const isTester = resolved === "tester";
  const isNeutral = resolved === "neutral";

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [menuOpen]);

  const isAuthed = !!session?.authenticated;
  const dashboardHref = testerSpaceHref(session);
  const close = () => setMenuOpen(false);

  const links = isTester
    ? [
        { href: "/testeurs#how", label: "Comment ça marche" },
        { href: "/testeurs#pay", label: "Rémunération" },
        { href: "/testeurs/guides", label: "Guides" },
        { href: "/testeurs#faq", label: "FAQ" },
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
    <a href="/testeurs#register" className="nav-cta" onClick={close}>Rejoindre le panel</a>
  ) : isNeutral ? (
    <Link href="/entreprises#brief" className="nav-cta" onClick={close}>Démarrer un projet</Link>
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
