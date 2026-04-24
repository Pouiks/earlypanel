"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/staff/dashboard", label: "Projets", icon: "📂" },
  { href: "/staff/dashboard/clients", label: "Clients B2B", icon: "🏢" },
  { href: "/staff/dashboard/testers", label: "Testeurs", icon: "🧑‍🔬" },
  { href: "/staff/dashboard/personas", label: "Personas", icon: "👥" },
];

export default function StaffSidebar() {
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
      <Link href="/staff/dashboard" style={{
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
        <span style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: "#0A7A5A",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginTop: 2,
        }}>
          Staff
        </span>
      </Link>

      <nav style={{ flex: 1, padding: "8px 12px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/staff/dashboard"
              ? pathname === "/staff/dashboard" || pathname.startsWith("/staff/dashboard/projects")
              : pathname === item.href || pathname.startsWith(item.href + "/");

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
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px" }}>
        <button
          onClick={() => {
            document.cookie = "tp-profile=; path=/; max-age=0";
            window.location.href = "/staff/login";
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
