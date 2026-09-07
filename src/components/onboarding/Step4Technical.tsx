"use client";

import { useState } from "react";
import { BROWSERS as VOCAB_BROWSERS, DEVICES as VOCAB_DEVICES, MOBILE_OS as VOCAB_MOBILE_OS, CONNECTIONS as VOCAB_CONNECTIONS } from "@/lib/tester-vocab";
import type { Tester, ConnectionType } from "@/types/tester";
import PillSelect from "@/components/ui/PillSelect";

interface Step4Props {
  data: Partial<Tester>;
  onNext: (data: Partial<Tester>) => void;
  loading: boolean;
}

// Vocabulaires partages avec les filtres staff : src/lib/tester-vocab.ts.
const BROWSERS: string[] = [...VOCAB_BROWSERS];
const DEVICES: string[] = [...VOCAB_DEVICES];
const MOBILE_OS: string[] = [...VOCAB_MOBILE_OS];
const CONNECTIONS: ConnectionType[] = [...VOCAB_CONNECTIONS] as ConnectionType[];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  fontSize: 15,
  border: "0.5px solid rgba(0,0,0,0.12)",
  borderRadius: 12,
  outline: "none",
  background: "#f5f5f7",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#1d1d1f",
  marginBottom: 8,
};

export default function Step4Technical({ data, onNext, loading }: Step4Props) {
  const [browsers, setBrowsers] = useState<string[]>(data.browsers || []);
  const [devices, setDevices] = useState<string[]>(data.devices || []);
  const [phoneModel, setPhoneModel] = useState(data.phone_model || "");
  const [mobileOs, setMobileOs] = useState<string>(data.mobile_os || "");
  const [connection, setConnection] = useState<string>(data.connection || "");
  const [connectionError, setConnectionError] = useState("");

  // Champs requis : browsers >= 1, devices >= 1, connection (cf. trigger DB).
  // phone_model et mobile_os restent optionnels.
  const allRequiredFilled =
    browsers.length > 0 && devices.length > 0 && connection !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (browsers.length === 0) {
      setConnectionError("Sélectionnez au moins un navigateur.");
      return;
    }
    if (devices.length === 0) {
      setConnectionError("Sélectionnez au moins un appareil.");
      return;
    }
    if (!connection) {
      setConnectionError("Choisissez votre type de connexion internet (requis).");
      return;
    }
    setConnectionError("");
    onNext({
      browsers,
      devices,
      phone_model: phoneModel.trim() || null,
      mobile_os: mobileOs || null,
      connection: connection as ConnectionType,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Navigateurs utilisés *</label>
        <PillSelect options={BROWSERS} value={browsers} onChange={(v) => setBrowsers(v as string[])} multiple />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Appareils *</label>
        <PillSelect options={DEVICES} value={devices} onChange={(v) => setDevices(v as string[])} multiple />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Modèle de téléphone / tablette <span style={{ color: "#86868B", fontWeight: 400 }}>(optionnel)</span></label>
        <input style={inputStyle} value={phoneModel} onChange={(e) => setPhoneModel(e.target.value)} placeholder="iPhone 15, Samsung Galaxy S24, Pixel 8..." />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Système mobile <span style={{ color: "#86868B", fontWeight: 400 }}>(optionnel)</span></label>
        <PillSelect options={MOBILE_OS} value={mobileOs} onChange={(v) => setMobileOs(v as string)} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Type de connexion principal *</label>
        <PillSelect
          options={CONNECTIONS}
          value={connection}
          onChange={(v) => {
            setConnection(v as string);
            if (v) setConnectionError("");
          }}
        />
        {connectionError && (
          <p style={{ fontSize: 13, color: "#dc2626", marginTop: 8, marginBottom: 0 }}>{connectionError}</p>
        )}
      </div>

      <button type="submit" disabled={loading || !allRequiredFilled} style={{
        width: "100%",
        padding: "14px",
        background: allRequiredFilled ? "#0A7A5A" : "#ccc",
        color: "#fff",
        border: "none",
        borderRadius: 980,
        fontSize: 15,
        fontWeight: 700,
        cursor: loading || !allRequiredFilled ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        transition: "all 200ms",
        fontFamily: "inherit",
      }}>
        {loading ? "Sauvegarde…" : "Continuer →"}
      </button>
    </form>
  );
}
