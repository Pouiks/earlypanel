"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// W2 : remplacement des `window.confirm` natifs par un modal stylise et
// accessible. Pattern d'usage :
//   const { confirm, ConfirmModal } = useConfirm();
//   ...
//   const ok = await confirm({ title: "...", message: "...", danger: true });
//   if (!ok) return;
//   ...do action...
//   <ConfirmModal />

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface AlertOptions {
  title: string;
  message?: string;
  okLabel?: string;
}

interface ModalState extends ConfirmOptions {
  open: boolean;
  mode: "confirm" | "alert";
  resolve?: (ok: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ModalState>({
    open: false,
    title: "",
    mode: "confirm",
  });
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, open: true, mode: "confirm", resolve });
    });
  }, []);

  const notify = useCallback((opts: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setState({
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.okLabel || "OK",
        open: true,
        mode: "alert",
        resolve: () => resolve(),
      });
    });
  }, []);

  const close = useCallback(
    (ok: boolean) => {
      state.resolve?.(ok);
      setState((s) => ({ ...s, open: false, resolve: undefined }));
    },
    [state]
  );

  useEffect(() => {
    if (!state.open) return;
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [state.open, close]);

  const ConfirmModalNode = useCallback(() => {
    if (!state.open) return null;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={() => close(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          backdropFilter: "blur(2px)",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "28px 28px 24px",
            maxWidth: 440,
            width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
          }}
        >
          <h2
            id="confirm-title"
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
              color: "#1d1d1f",
            }}
          >
            {state.title}
          </h2>
          {state.message && (
            <p
              style={{
                margin: "0 0 24px",
                fontSize: 14,
                lineHeight: 1.55,
                color: "#6e6e73",
              }}
            >
              {state.message}
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            {state.mode === "confirm" && (
              <button
                type="button"
                onClick={() => close(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 980,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1d1d1f",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {state.cancelLabel || "Annuler"}
              </button>
            )}
            <button
              type="button"
              ref={confirmBtnRef}
              onClick={() => close(true)}
              style={{
                padding: "10px 20px",
                borderRadius: 980,
                border: "none",
                background: state.danger ? "#d92d20" : "#0A7A5A",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {state.confirmLabel || (state.mode === "alert" ? "OK" : "Confirmer")}
            </button>
          </div>
        </div>
      </div>
    );
  }, [state, close]);

  return { confirm, notify, ConfirmModal: ConfirmModalNode };
}
