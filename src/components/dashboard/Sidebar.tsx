"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import NotificationBadge from "@/components/ui/NotificationBadge";
import type { NotificationCounts } from "@/app/app/dashboard/layout";

interface SidebarProps {
  notifications?: NotificationCounts;
  onHelpClick?: () => void;
}

type NumericNotifKey = "missions" | "documents" | "profil";

const NAV_ITEMS: { href: string; label: string; icon: string; badgeKey: NumericNotifKey | null; badgeType: "alert" | "info"; tourId: string }[] = [
  { href: "/app/dashboard", label: "Tableau de bord", icon: "🏠", badgeKey: null, badgeType: "info", tourId: "nav-dashboard" },
  { href: "/app/dashboard/missions", label: "Mes missions", icon: "📋", badgeKey: "missions", badgeType: "info", tourId: "nav-missions" },
  { href: "/app/dashboard/gains", label: "Mes gains", icon: "💰", badgeKey: null, badgeType: "info", tourId: "nav-gains" },
  { href: "/app/dashboard/profil", label: "Mon profil", icon: "👤", badgeKey: "profil", badgeType: "alert", tourId: "nav-profil" },
  { href: "/app/dashboard/documents", label: "Mes documents", icon: "📄", badgeKey: "documents", badgeType: "alert", tourId: "nav-documents" },
];

export default function Sidebar({ notifications, onHelpClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

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
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "0 20px 24px",
        borderBottom: "0.5px solid rgba(0,0,0,0.08)",
        marginBottom: 8,
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "block" }}>
          <span style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#1d1d1f",
            letterSpacing: "-0.04em",
          }}>
            early<span style={{ color: "#0A7A5A" }}>panel</span>
          </span>
        </Link>
        {onHelpClick && (
          <button
            type="button"
            onClick={onHelpClick}
            data-tour="help-button"
            aria-label="Relancer le tour guidé"
            title="Relancer le tour guidé"
            className="ep-help-button"
          >
            ?
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: "8px 12px" }}>
        {NAV_ITEMS.map((item) => {
          // La racine /app/dashboard est active UNIQUEMENT en match exact, sinon
          // elle s'active aussi sur /app/dashboard/missions etc. Pour les
          // sous-routes, on accepte l'inclusion (ex: /app/dashboard/missions/123
          // garde "Mes missions" actif).
          const isActive =
            item.href === "/app/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const badgeCount: number = item.badgeKey && notifications ? notifications[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              data-tour={item.tourId}
              onMouseEnter={() => router.prefetch(item.href)}
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
