"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBadge from "@/components/ui/NotificationBadge";
import type { NotificationCounts } from "@/app/app/dashboard/layout";

interface SidebarProps {
  notifications?: NotificationCounts;
}

type NumericNotifKey = "missions" | "documents" | "profil";

const NAV_ITEMS: { href: string; label: string; icon: string; badgeKey: NumericNotifKey | null; badgeType: "alert" | "info" }[] = [
  { href: "/app/dashboard", label: "Tableau de bord", icon: "🏠", badgeKey: null, badgeType: "info" },
  { href: "/app/dashboard/missions", label: "Mes missions", icon: "📋", badgeKey: "missions", badgeType: "info" },
  { href: "/app/dashboard/gains", label: "Mes gains", icon: "💰", badgeKey: null, badgeType: "info" },
  { href: "/app/dashboard/profil", label: "Mon profil", icon: "👤", badgeKey: "profil", badgeType: "alert" },
  { href: "/app/dashboard/documents", label: "Mes documents", icon: "📄", badgeKey: "documents", badgeType: "alert" },
];

export default function Sidebar({ notifications }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 240,
      minHeight: "100vh",
      background: "#fff",
      borderRight: "0.5px solid rgba(0,0,0,0.08)",
      display: "flex",
      flexDirection: "column",
      padding: "24px 0",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 40,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
    }}>
      <Link href="/" style={{
        padding: "0 24px 24px",
        textDecoration: "none",
        display: "block",
        borderBottom: "0.5px solid rgba(0,0,0,0.08)",
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#1d1d1f",
          letterSpacing: "-0.04em",
        }}>
          early<span style={{ color: "#0A7A5A" }}>panel</span>
        </span>
      </Link>

      <nav style={{ flex: 1, padding: "8px 12px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const badgeCount: number = item.badgeKey && notifications ? notifications[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#0A7A5A" : "#1d1d1f",
                background: isActive ? "#f0faf5" : "transparent",
                textDecoration: "none",
                marginBottom: 2,
                transition: "all 200ms",
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {badgeCount > 0 && <NotificationBadge count={badgeCount} type={item.badgeType} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px" }}>
        <button
          type="button"
          onClick={() => {
            document.cookie = "tp-profile=; path=/; max-age=0";
            window.location.href = "/app/login";
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 10,
            fontSize: 14,
            color: "#86868B",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            width: "100%",
            transition: "all 200ms",
          }}
        >
          <span style={{ fontSize: 16 }}>🚪</span>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
