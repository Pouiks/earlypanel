"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export interface TesterSessionState {
  authenticated: boolean;
  first_name?: string | null;
  profile_completed?: boolean;
}

/**
 * Session testeur cote marketing (nav, CTA). Un seul appel reseau par
 * navigation, partage entre tous les composants montes sur la page :
 * la promesse est memorisee par pathname.
 *
 * Aucune donnee sensible : /api/testers/session n'expose que le prenom
 * et l'etat de completion du profil.
 */
let cached: { key: string; promise: Promise<TesterSessionState | null> } | null = null;

function loadSession(key: string): Promise<TesterSessionState | null> {
  if (cached && cached.key === key) return cached.promise;
  const promise = fetch("/api/testers/session", { cache: "no-store" })
    .then(async (res) => (res.ok ? ((await res.json()) as TesterSessionState) : null))
    .catch(() => null);
  cached = { key, promise };
  return promise;
}

export function useTesterSession(): TesterSessionState | null {
  const pathname = usePathname();
  const [session, setSession] = useState<TesterSessionState | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSession(pathname).then((data) => {
      if (!cancelled && data) setSession(data);
    });
    return () => { cancelled = true; };
  }, [pathname]);

  return session;
}

/** Destination « Mon espace » : onboarding tant que le profil n'est pas complet. */
export function testerSpaceHref(session: TesterSessionState | null): string {
  return session?.profile_completed ? "/app/dashboard" : "/app/onboarding";
}
