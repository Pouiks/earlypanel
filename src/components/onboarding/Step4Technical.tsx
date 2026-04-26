"use client";

import { useState } from "react";
import type { Tester, ConnectionType } from "@/types/tester";
import PillSelect from "@/components/ui/PillSelect";

interface Step4Props {
  data: Partial<Tester>;
  onNext: (data: Partial<Tester>) => void;
  loading: boolean;
}

const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", "Brave", "Opera", "Arc", "Autre"];
const DEVICES = [
  "PC Windows", "PC Linux", "Mac",
  "iPhone", "Smartphone Android", "Autre smartphone",
  "iPad", "Tablette Android", "Autre tablette",
];
const MOBILE_OS = ["iOS", "Android", "HarmonyOS", "Autre", "Aucun smartphone"];
const CONNECTIONS: ConnectionType[] = ["Fibre", "ADSL", "4G/5G"];

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        <label style={labelStyle}>Navigateurs utilisés</label>
        <PillSelect options={BROWSERS} value={browsers} onChange={(v) => setBrowsers(v as string[])} multiple />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Appareils</label>
        <PillSelect options={DEVICES} value={devices} onChange={(v) => setDevices(v as string[])} multiple />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Modèle de téléphone / tablette</label>
        <input style={inputStyle} value={phoneModel} onChange={(e) => setPhoneModel(e.target.value)} placeholder="iPhone 15, Samsung Galaxy S24, Pixel 8..." />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Système mobile</label>
        <PillSelect options={MOBILE_OS} value={mobileOs} onChange={(v) => setMobileOs(v as string)} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Type de connexion principal</label>
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

      <button type="submit" disabled={loading || !connection} style={{
        width: "100%",
        padding: "14px",
        background: "#0A7A5A",
        color: "#fff",
        border: "none",
        borderRadius: 980,
        fontSize: 15,
        fontWeight: 700,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
        transition: "all 200ms",
        fontFamily: "inherit",
      }}>
        {loading ? "Sauvegarde…" : "Continuer →"}
      </button>
    </form>
  );
}
