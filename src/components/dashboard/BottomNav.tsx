"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBadge from "@/components/ui/NotificationBadge";
import type { NotificationCounts } from "@/app/app/dashboard/layout";

interface BottomNavProps {
  notifications?: NotificationCounts;
}

const NAV_ITEMS: { href: string; label: string; icon: string; badgeKey: keyof NotificationCounts | null; badgeType: "alert" | "info" }[] = [
  { href: "/app/dashboard", label: "Accueil", icon: "🏠", badgeKey: null, badgeType: "info" },
  { href: "/app/dashboard/missions", label: "Missions", icon: "📋", badgeKey: "missions", badgeType: "info" },
  { href: "/app/dashboard/gains", label: "Gains", icon: "💰", badgeKey: null, badgeType: "info" },
  { href: "/app/dashboard/profil", label: "Profil", icon: "👤", badgeKey: "profil", badgeType: "alert" },
  { href: "/app/dashboard/documents", label: "Docs", icon: "📄", badgeKey: "documents", badgeType: "alert" },
];

export default function BottomNav({ notifications }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "#fff",
      borderTop: "0.5px solid rgba(0,0,0,0.08)",
      display: "flex",
      justifyContent: "space-around",
      padding: "8px 0 calc(8px + env(safe-area-inset-bottom))",
      zIndex: 40,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const badgeCount = item.badgeKey && notifications ? notifications[item.badgeKey] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "4px 8px",
              fontSize: 10,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#0A7A5A" : "#86868B",
              textDecoration: "none",
              transition: "all 200ms",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 20, position: "relative" }}>
              {item.icon}
              {badgeCount > 0 && (
                <span style={{ position: "absolute", top: -4, right: -8 }}>
                  <NotificationBadge count={badgeCount} type={item.badgeType} />
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
