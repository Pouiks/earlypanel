"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface StaffHeaderProps {
  firstName: string | null;
  lastName: string | null;
}

export default function StaffHeader({ firstName, lastName }: StaffHeaderProps) {
  const initials = `${(firstName || "S")[0]}${(lastName || "T")[0]}`.toUpperCase();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleLogout() {
    document.cookie = "tp-profile=; path=/; max-age=0";
    window.location.href = "/staff/login";
  }

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 0",
      marginBottom: 8,
    }}>
      <div />
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 13, color: "#6e6e73", fontWeight: 500 }}>
            {firstName} {lastName}
          </span>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#0A7A5A",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            transition: "box-shadow 200ms",
            boxShadow: open ? "0 0 0 3px rgba(10,122,90,0.2)" : "none",
          }}>
            {initials}
          </div>
        </button>

        {open && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 220,
            background: "#fff",
            borderRadius: 16,
            border: "0.5px solid rgba(0,0,0,0.08)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
            padding: "8px",
            zIndex: 100,
            animation: "menuFadeIn 150ms ease",
          }}>
            <Link
              href="/staff/dashboard"
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 400,
                color: "#1d1d1f",
                textDecoration: "none",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f7"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 15 }}>📂</span>
              Projets
            </Link>

            <div style={{
              height: "0.5px",
              background: "rgba(0,0,0,0.08)",
              margin: "4px 12px",
            }} />

            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 400,
                color: "#e53e3e",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                width: "100%",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 15 }}>🚪</span>
              Se déconnecter
            </button>
          </div>
        )}

        <style jsx>{`
          @keyframes menuFadeIn {
            from {
              opacity: 0;
              transform: translateY(-4px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </header>
  );
}
