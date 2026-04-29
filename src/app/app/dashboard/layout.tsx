"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import type { Tester } from "@/types/tester";
import Sidebar from "@/components/dashboard/Sidebar";
import BottomNav from "@/components/dashboard/BottomNav";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { NotificationProvider, useNotify } from "@/components/ui/NotificationProvider";

export interface NotificationCounts {
  missions: number;
  documents: number;
  profil: number;
  payment_info_missing?: boolean;
}

interface DashboardContextValue {
  tester: Tester | null;
  loading: boolean;
  notFound: boolean;
  notifications: NotificationCounts;
  refreshTester: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue>({
  tester: null,
  loading: true,
  notFound: false,
  notifications: { missions: 0, documents: 0, profil: 0 },
  refreshTester: async () => {},
  refreshNotifications: async () => {},
});

export function useTester() {
  return useContext(DashboardContext);
}

export function useNotifications() {
  const ctx = useContext(DashboardContext);
  return { notifications: ctx.notifications, refresh: ctx.refreshNotifications };
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Composant interne (a l'interieur du NotificationProvider) qui gere :
 *   - Toast au login si documents/missions > 0
 *   - Polling 30s avec comparaison delta pour notifier en quasi-temps-reel
 *
 * Doit etre place dans l'arbre apres NotificationProvider pour pouvoir
 * appeler useNotify().
 */
function DashboardInner({ children }: { children: React.ReactNode }) {
  const { notify } = useNotify();
  const [tester, setTester] = useState<Tester | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notifications, setNotifications] = useState<NotificationCounts>({
    missions: 0, documents: 0, profil: 0, payment_info_missing: false,
  });
  const previousNotifsRef = useRef<NotificationCounts | null>(null);
  const initialNotifShownRef = useRef(false);

  async function fetchTester() {
    setLoading(true);
    try {
      const res = await fetch("/api/testers/me");
      if (res.ok) {
        const data = await res.json();
        setTester(data);
        setNotFound(false);
      } else if (res.status === 404) {
        setNotFound(true);
      }
    } catch {
      // Will retry on next refresh
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotifications(): Promise<NotificationCounts | null> {
    try {
      const res = await fetch("/api/testers/notifications");
      if (res.ok) {
        const data = (await res.json()) as NotificationCounts;
        setNotifications(data);
        return data;
      }
    } catch { /* silent */ }
    return null;
  }

  // Charge initial : tester + notifications + toast d'accueil si pertinent.
  useEffect(() => {
    fetchTester();
    fetchNotifications().then((data) => {
      if (!data || initialNotifShownRef.current) return;
      initialNotifShownRef.current = true;
      previousNotifsRef.current = data;

      // Toast au login : signaler les choses qui demandent une action.
      // Persistant tant que le user ne clique pas (volontaire : on ne veut
      // pas qu'il rate son NDA en attente).
      if (data.documents > 0) {
        notify({
          type: "warning",
          title: data.documents > 1
            ? `${data.documents} documents à signer`
            : "1 document à signer",
          message: "Un accord de confidentialité vous attend dans votre espace documents.",
          action: { label: "Voir mes documents", href: "/app/dashboard/documents" },
          persistent: true,
          dedupKey: "login-documents",
        });
      }
      if (data.missions > 0) {
        notify({
          type: "info",
          title: data.missions > 1
            ? `${data.missions} missions disponibles`
            : "1 mission disponible",
          message: "Vous pouvez démarrer ou poursuivre vos missions de test.",
          action: { label: "Voir mes missions", href: "/app/dashboard/missions" },
          persistent: true,
          dedupKey: "login-missions",
        });
      }
      if (data.profil > 0) {
        notify({
          type: "warning",
          title: data.profil > 1
            ? `${data.profil} champs à compléter`
            : "1 champ à compléter",
          message: "Complétez votre profil pour pouvoir être invité aux projets.",
          action: { label: "Compléter mon profil", href: "/app/dashboard/profil" },
          persistent: true,
          dedupKey: "login-profil",
        });
      }
      if (data.payment_info_missing) {
        notify({
          type: "warning",
          title: "Coordonnées bancaires manquantes",
          message: "Renseignez votre IBAN pour recevoir vos rémunérations après chaque mission validée.",
          action: { label: "Renseigner mon IBAN", href: "/app/dashboard/profil" },
          persistent: true,
          dedupKey: "login-payment-info",
        });
      }
    });
  }, []);

  // Polling 30s : detecte les nouveaux documents/missions et notifie.
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchNotifications();
      if (!data) return;
      const prev = previousNotifsRef.current;
      if (prev) {
        if (data.documents > prev.documents) {
          const delta = data.documents - prev.documents;
          notify({
            type: "warning",
            title: delta > 1 ? `${delta} nouveaux documents à signer` : "Nouveau document à signer",
            message: "Un accord de confidentialité vient d'arriver dans votre espace.",
            action: { label: "Voir", href: "/app/dashboard/documents" },
            persistent: true,
            dedupKey: "new-documents",
          });
        }
        if (data.missions > prev.missions) {
          const delta = data.missions - prev.missions;
          notify({
            type: "info",
            title: delta > 1 ? `${delta} nouvelles missions` : "Nouvelle mission disponible",
            message: "Une mission de test vient d'être ouverte pour vous.",
            action: { label: "Voir", href: "/app/dashboard/missions" },
            persistent: true,
            dedupKey: "new-missions",
          });
        }
      }
      previousNotifsRef.current = data;
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [notify]);

  return (
    <DashboardContext.Provider value={{
      tester, loading, notFound, notifications,
      refreshTester: fetchTester, refreshNotifications: () => fetchNotifications().then(() => {}),
    }}>
      <div style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        background: "#f5f5f7",
        minHeight: "100vh",
      }}>
        <div className="dashboard-sidebar-desktop">
          <Sidebar notifications={notifications} />
        </div>

        <div className="dashboard-content">
          <DashboardHeader
            firstName={tester?.first_name ?? null}
            lastName={tester?.last_name ?? null}
          />
          {children}
        </div>

        <div className="dashboard-bottomnav-mobile">
          <BottomNav notifications={notifications} />
        </div>
      </div>

      <style jsx>{`
        .dashboard-sidebar-desktop {
          display: block;
        }
        .dashboard-content {
          margin-left: 240px;
          padding: 0 40px 40px;
          min-height: 100vh;
        }
        .dashboard-bottomnav-mobile {
          display: none;
        }
        @media (max-width: 768px) {
          .dashboard-sidebar-desktop {
            display: none;
          }
          .dashboard-content {
            margin-left: 0;
            padding: 0 20px 100px;
          }
          .dashboard-bottomnav-mobile {
            display: block;
          }
        }
      `}</style>
    </DashboardContext.Provider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // NotificationProvider doit etre AU-DESSUS de DashboardInner pour que
  // ce dernier puisse appeler useNotify(). Toutes les notifications du
  // dashboard tester (login + polling + manuel via useNotify) passent par ici.
  return (
    <NotificationProvider>
      <DashboardInner>{children}</DashboardInner>
    </NotificationProvider>
  );
}
