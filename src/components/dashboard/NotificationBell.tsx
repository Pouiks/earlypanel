"use client";

import { useState, useRef, useEffect } from "react";
import { useNotificationHistory } from "@/components/ui/NotificationProvider";

/**
 * Cloche d'historique des notifications recentes.
 *
 * Affiche un compteur (nombre de notifs depuis le dernier "vu"),
 * et au clic ouvre un dropdown avec les dernieres notifications.
 * Cliquer sur une notif avec action navigue vers la cible.
 */

const TYPE_COLOR: Record<string, { fg: string; bg: string }> = {
  info: { fg: "#0A7A5A", bg: "#f0faf5" },
  success: { fg: "#0A7A5A", bg: "#f0faf5" },
  warning: { fg: "#b45309", bg: "#fef3c7" },
  error: { fg: "#b91c1c", bg: "#fef2f2" },
};

const SEEN_AT_KEY = "notif-bell-seen-at";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "à l’instant";
  const min = Math.round(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(ts).toLocaleDateString("fr-FR");
}

export default function NotificationBell() {
  const { history, clearHistory } = useNotificationHistory();
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  // Charge le dernier "vu" depuis localStorage au mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_AT_KEY);
      if (raw) setSeenAt(parseInt(raw, 10) || 0);
    } catch { /* localStorage indispo */ }
  }, []);

  // Ferme au clic exterieur.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = history.filter((n) => n.createdAt > seenAt).length;

  function handleToggle() {
    if (!open) {
      // Marque le moment d'ouverture comme "vu" — les futurs items > now sont unread.
      const now = Date.now();
      setSeenAt(now);
      try { localStorage.setItem(SEEN_AT_KEY, String(now)); } catch { /* ok */ }
    }
    setOpen((v) => !v);
  }

  function handleItemClick(href: string | undefined) {
    setOpen(false);
    if (href) window.location.href = href;
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unread > 0 ? ` (${unread} nouvelles)` : ""}`}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: open ? "#f0faf5" : "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "inherit",
          transition: "background 150ms",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "#f5f5f7"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 980,
              background: "#b91c1c",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            maxHeight: 480,
            overflow: "auto",
            background: "#fff",
            borderRadius: 16,
            border: "0.5px solid rgba(0,0,0,0.08)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
            zIndex: 200,
          }}
        >
          <div style={{
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f" }}>
              Notifications récentes
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                style={{
                  background: "none",
                  border: "none",
                  padding: "4px 8px",
                  fontSize: 11,
                  color: "#86868B",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderRadius: 6,
                }}
                title="Effacer l'historique"
              >
                Effacer
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#86868B", fontSize: 13 }}>
              Aucune notification récente.
            </div>
          ) : (
            <div>
              {history.map((n) => {
                const colors = TYPE_COLOR[n.type] ?? TYPE_COLOR.info;
                const clickable = !!n.action;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n.action?.href)}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : -1}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "12px 14px",
                      borderBottom: "0.5px solid rgba(0,0,0,0.04)",
                      cursor: clickable ? "pointer" : "default",
                      background: n.createdAt > seenAt ? "#fafafa" : "#fff",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={(e) => { if (clickable) e.currentTarget.style.background = "#f5f5f7"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = n.createdAt > seenAt ? "#fafafa" : "#fff"; }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 24, height: 24,
                        borderRadius: "50%",
                        background: colors.bg,
                        color: colors.fg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {n.type === "warning" ? "!" : n.type === "error" ? "✕" : n.type === "success" ? "✓" : "i"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {n.title && (
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 2 }}>
                          {n.title}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#6e6e73", lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: 11, color: "#a1a1a6", marginTop: 4 }}>
                        {formatRelative(n.createdAt)}
                        {clickable && <span> · {n.action!.label} →</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
