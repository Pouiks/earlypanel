"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Bandeau d'information cookies minimal — RGPD-friendly.
 *
 * earlypanel n'utilise pas de cookies de tracking : Matomo (si active)
 * tourne en mode `disableCookies`, Vercel Analytics est cookieless par
 * defaut, et Microsoft Clarity est configure sans cookies.
 *
 * Donc legalement, tu n'as PAS besoin d'un consentement actif (CNIL :
 * exemption pour les cookies strictement necessaires + analytics
 * cookieless agrege). Tu dois juste INFORMER. Ce bandeau le fait.
 *
 * Persistance : on enregistre la dismiss dans localStorage (pas dans
 * un cookie, par coherence avec la posture cookieless). Si l'user
 * vide son cache, il revoit le bandeau — acceptable.
 *
 * Si tu activais un jour des cookies de tracking actifs (GA4, Meta
 * Pixel...), il faudra REMPLACER ce bandeau par un vrai gestionnaire
 * de consentement (Tarteaucitron, CookieConsent, Klaro...) avec accept/
 * refuse buttons.
 */

const STORAGE_KEY = "ep_cookie_info_dismissed_v1";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Lecture cote client uniquement (eviter SSR mismatch)
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      // localStorage indisponible (mode prive, browser exotique) → on
      // n'affiche pas le bandeau plutot que de spammer l'user a chaque
      // page si on n'a pas pu enregistrer la dismiss.
    }
  }, []);

  function handleDismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* noop */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Information sur les cookies"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        left: 16,
        maxWidth: 420,
        marginLeft: "auto",
        background: "#fff",
        borderRadius: 16,
        border: "0.5px solid rgba(0,0,0,0.08)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
        padding: "16px 18px",
        zIndex: 9998,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "#1d1d1f",
          margin: "0 0 6px",
          fontWeight: 700,
          lineHeight: 1.4,
        }}
      >
        🍪 Site sans cookies de pistage
      </p>
      <p
        style={{
          fontSize: 12,
          color: "#6e6e73",
          margin: "0 0 14px",
          lineHeight: 1.6,
        }}
      >
        earlypanel utilise uniquement des cookies <strong>strictement nécessaires</strong> (session, sécurité). Les statistiques sont collectées de manière agrégée et anonyme, sans cookie de tracking.{" "}
        <Link href="/confidentialite" style={{ color: "#0A7A5A", textDecoration: "underline", textUnderlineOffset: 2 }}>
          En savoir plus
        </Link>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        style={{
          padding: "8px 18px",
          fontSize: 13,
          fontWeight: 700,
          color: "#fff",
          background: "#0A7A5A",
          border: "none",
          borderRadius: 980,
          cursor: "pointer",
          fontFamily: "inherit",
          width: "100%",
        }}
      >
        Compris
      </button>
    </div>
  );
}
