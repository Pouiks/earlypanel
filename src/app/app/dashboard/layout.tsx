"use client";

import { useState, useEffect, createContext, useContext } from "react";
import type { Tester } from "@/types/tester";
import Sidebar from "@/components/dashboard/Sidebar";
import BottomNav from "@/components/dashboard/BottomNav";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export interface NotificationCounts {
  missions: number;
  documents: number;
  profil: number;
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [tester, setTester] = useState<Tester | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notifications, setNotifications] = useState<NotificationCounts>({
    missions: 0, documents: 0, profil: 0,
  });

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

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/testers/notifications");
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchTester();
    fetchNotifications();
  }, []);

  return (
    <DashboardContext.Provider value={{
      tester, loading, notFound, notifications,
      refreshTester: fetchTester, refreshNotifications: fetchNotifications,
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
