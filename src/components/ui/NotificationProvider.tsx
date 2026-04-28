"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// =====================================================================
// Notifications riches : queue, types, actions, dismiss persistant
// =====================================================================
//
// Remplace le composant Toast simple (un seul message a la fois,
// autodismiss force). Utilise via le hook `useNotify()` :
//
//   const { notify } = useNotify();
//   notify({
//     type: "info",
//     title: "Nouvelle mission",
//     message: "Le projet ABC vient d'etre ouvert.",
//     action: { label: "Voir", href: "/app/dashboard/missions" },
//     persistent: true, // si true : pas d'autodismiss
//     dedupKey: "mission-abc", // si meme key existe deja, on remplace
//   });
//
// Plusieurs toasts s'empilent en bas a droite. Cliquer sur l'action
// ferme le toast et navigue. Cliquer sur le X le ferme sans naviguer.

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationAction {
  label: string;
  href: string;
}

export interface NotificationOptions {
  type?: NotificationType;
  title?: string;
  message: string;
  action?: NotificationAction;
  /** Si true, ne disparait pas automatiquement (l'utilisateur doit cliquer X ou l'action) */
  persistent?: boolean;
  /** Duree avant autodismiss (ms). Defaut 4000. Ignore si persistent=true. */
  durationMs?: number;
  /**
   * Cle de deduplication. Si une notification avec la meme key existe deja,
   * elle est remplacee au lieu d'empiler. Utile pour le polling : on ne veut
   * pas accumuler 10 toasts "1 nouveau document" si le user ne ferme pas.
   */
  dedupKey?: string;
}

interface InternalNotification extends Required<Omit<NotificationOptions, "action" | "title" | "dedupKey">> {
  id: string;
  action?: NotificationAction;
  title?: string;
  dedupKey?: string;
}

interface NotificationContextValue {
  notify: (opts: NotificationOptions) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `notif-${Date.now().toString(36)}-${idCounter}`;
}

const TYPE_STYLES: Record<NotificationType, { bg: string; border: string; iconBg: string; icon: string; iconColor: string }> = {
  info: {
    bg: "#fff",
    border: "rgba(10, 122, 90, 0.15)",
    iconBg: "#f0faf5",
    icon: "i",
    iconColor: "#0A7A5A",
  },
  success: {
    bg: "#fff",
    border: "rgba(10, 122, 90, 0.25)",
    iconBg: "#f0faf5",
    icon: "✓",
    iconColor: "#0A7A5A",
  },
  warning: {
    bg: "#fff",
    border: "rgba(217, 119, 6, 0.25)",
    iconBg: "#fef3c7",
    icon: "!",
    iconColor: "#b45309",
  },
  error: {
    bg: "#fff",
    border: "rgba(229, 62, 62, 0.25)",
    iconBg: "#fef2f2",
    icon: "✕",
    iconColor: "#b91c1c",
  },
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InternalNotification[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    const handle = timeoutsRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (opts: NotificationOptions): string => {
      const id = nextId();
      const internal: InternalNotification = {
        id,
        type: opts.type ?? "info",
        title: opts.title,
        message: opts.message,
        action: opts.action,
        persistent: opts.persistent ?? false,
        durationMs: opts.durationMs ?? 4000,
        dedupKey: opts.dedupKey,
      };

      setItems((prev) => {
        // Dedup : si une notif existante a la meme dedupKey, on la remplace.
        if (opts.dedupKey) {
          const existing = prev.find((n) => n.dedupKey === opts.dedupKey);
          if (existing) {
            const oldHandle = timeoutsRef.current.get(existing.id);
            if (oldHandle) {
              clearTimeout(oldHandle);
              timeoutsRef.current.delete(existing.id);
            }
            return prev.map((n) => (n.dedupKey === opts.dedupKey ? internal : n));
          }
        }
        return [...prev, internal];
      });

      if (!internal.persistent) {
        const handle = setTimeout(() => dismiss(id), internal.durationMs);
        timeoutsRef.current.set(id, handle);
      }

      return id;
    },
    [dismiss]
  );

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach((h) => clearTimeout(h));
    timeoutsRef.current.clear();
    setItems([]);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const map = timeoutsRef.current;
    return () => {
      map.forEach((h) => clearTimeout(h));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify, dismiss, clearAll }), [notify, dismiss, clearAll]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationStack items={items} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

export function useNotify(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotify doit etre appele a l'interieur d'un <NotificationProvider>");
  }
  return ctx;
}

// =====================================================================
// Composant visuel — stack en bas a droite
// =====================================================================

function NotificationStack({
  items,
  onDismiss,
}: {
  items: InternalNotification[];
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "calc(100vw - 48px)",
        width: 360,
        pointerEvents: "none",
      }}
    >
      {items.map((n) => (
        <NotificationCard key={n.id} item={n} onDismiss={() => onDismiss(n.id)} />
      ))}
    </div>
  );
}

function NotificationCard({
  item,
  onDismiss,
}: {
  item: InternalNotification;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const styles = TYPE_STYLES[item.type];

  useEffect(() => {
    // Slide in animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleAction() {
    onDismiss();
    if (item.action) {
      window.location.href = item.action.href;
    }
  }

  return (
    <div
      role="alert"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: 14,
        padding: "14px 14px 14px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(20px)",
        transition: "all 250ms cubic-bezier(0.4, 0.0, 0.2, 1)",
        pointerEvents: "auto",
      }}
    >
      <div
        aria-hidden
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: styles.iconBg,
          color: styles.iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {styles.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {item.title && (
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#1d1d1f",
              margin: "0 0 2px",
              lineHeight: 1.3,
            }}
          >
            {item.title}
          </p>
        )}
        <p
          style={{
            fontSize: 13,
            color: item.title ? "#6e6e73" : "#1d1d1f",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {item.message}
        </p>
        {item.action && (
          <button
            type="button"
            onClick={handleAction}
            style={{
              marginTop: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "#0A7A5A",
              border: "none",
              borderRadius: 980,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {item.action.label} →
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fermer"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          padding: 0,
          background: "none",
          border: "none",
          color: "#86868B",
          fontSize: 18,
          lineHeight: 1,
          cursor: "pointer",
          fontFamily: "inherit",
          marginTop: -2,
          marginRight: -4,
        }}
      >
        ×
      </button>
    </div>
  );
}
