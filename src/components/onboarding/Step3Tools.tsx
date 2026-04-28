"use client";

import { useState } from "react";
import type { Tester } from "@/types/tester";

interface Step3Props {
  data: Partial<Tester>;
  onNext: (data: Partial<Tester>) => void;
  loading: boolean;
}

const TOOL_CATEGORIES: { name: string; tools: string[] }[] = [
  { name: "Bureautique & quotidien", tools: ["Google (Gmail, Drive, Docs)", "Microsoft 365 (Word, Excel)", "Outlook", "WhatsApp", "Messenger"] },
  { name: "Communication & visio", tools: ["Teams", "Slack", "Zoom", "Google Meet", "Discord"] },
  { name: "Gestion de projet", tools: ["Notion", "Trello", "Asana", "Jira", "Monday", "ClickUp"] },
  { name: "Réseaux sociaux", tools: ["Instagram", "TikTok", "LinkedIn", "Facebook", "X (Twitter)", "Snapchat"] },
  { name: "E-commerce & shopping", tools: ["Amazon", "Leboncoin", "Vinted", "Shopify", "PrestaShop"] },
  { name: "Finance & banque", tools: ["App bancaire mobile", "PayPal", "Lydia / Sumeria", "Pennylane", "Sage", "QuickBooks"] },
  { name: "CRM & vente", tools: ["Salesforce", "HubSpot", "Pipedrive", "Freshworks", "Zendesk"] },
  { name: "Dev & tech", tools: ["GitHub", "GitLab", "VS Code", "AWS", "Azure", "TestFlight"] },
  { name: "Design & créa", tools: ["Figma", "Canva", "Adobe Creative", "CapCut"] },
  { name: "RH & paie", tools: ["Lucca", "Payfit", "BambooHR", "Workday"] },
  { name: "Santé & bien-être", tools: ["Doctolib", "Ameli", "MyFitnessPal"] },
  { name: "Transport & livraison", tools: ["Uber / Bolt", "Waze / Google Maps", "SNCF Connect", "Deliveroo / UberEats"] },
];

const allKnownTools = TOOL_CATEGORIES.flatMap((c) => c.tools);

const pillStyle = (isSelected: boolean): React.CSSProperties => ({
  padding: "7px 16px",
  fontSize: 13,
  fontWeight: isSelected ? 600 : 400,
  fontFamily: "inherit",
  borderRadius: 980,
  border: isSelected ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.12)",
  background: isSelected ? "#f0faf5" : "#fff",
  color: isSelected ? "#0A7A5A" : "#1d1d1f",
  cursor: "pointer",
  transition: "all 200ms",
  whiteSpace: "nowrap",
});

export default function Step3Tools({ data, onNext, loading }: Step3Props) {
  const [selected, setSelected] = useState<string[]>(data.tools || []);
  const [otherInputs, setOtherInputs] = useState<Record<string, string>>({});

  function toggle(tool: string) {
    setSelected((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  }

  function addCustom(category: string) {
    const val = (otherInputs[category] || "").trim();
    if (val && !selected.includes(val)) {
      setSelected((prev) => [...prev, val]);
    }
    setOtherInputs((prev) => ({ ...prev, [category]: "" }));
  }

  // Champs requis pour activation : au moins 1 outil selectionne (cf. trigger DB).
  const allRequiredFilled = selected.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRequiredFilled) return;
    onNext({ tools: selected });
  }

  const customTools = selected.filter((s) => !allKnownTools.includes(s));

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {TOOL_CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <p style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1d1d1f",
              margin: "0 0 8px",
            }}>
              {cat.name}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
              {cat.tools.map((tool) => {
                const isSelected = selected.includes(tool);
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggle(tool)}
                    style={pillStyle(isSelected)}
                  >
                    {isSelected && "✓ "}{tool}
                  </button>
                );
              })}
              {/* Inline "Autre" input per category */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="text"
                  value={otherInputs[cat.name] || ""}
                  onChange={(e) => setOtherInputs((p) => ({ ...p, [cat.name]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(cat.name); } }}
                  placeholder="Autre…"
                  style={{
                    width: 100,
                    padding: "7px 12px",
                    fontSize: 13,
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 980,
                    outline: "none",
                    fontFamily: "inherit",
                    background: "#fff",
                    transition: "border-color 200ms",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0A7A5A"; e.currentTarget.style.width = "140px"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; if (!e.currentTarget.value) e.currentTarget.style.width = "100px"; }}
                />
                {(otherInputs[cat.name] || "").trim() && (
                  <button
                    type="button"
                    onClick={() => addCustom(cat.name)}
                    style={{
                      padding: "6px 10px",
                      fontSize: 13,
                      fontWeight: 700,
                      border: "none",
                      borderRadius: "50%",
                      background: "#0A7A5A",
                      color: "#fff",
                      cursor: "pointer",
                      lineHeight: 1,
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {customTools.length > 0 && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0faf5", borderRadius: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#0A7A5A", margin: "0 0 8px" }}>
            Vos ajouts personnalisés :
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {customTools.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => toggle(tool)}
                style={{
                  ...pillStyle(true),
                  paddingRight: 10,
                }}
              >
                {tool} <span style={{ marginLeft: 4, opacity: 0.6 }}>✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p style={{
        fontSize: 12,
        color: allRequiredFilled ? "#86868B" : "#dc2626",
        margin: "16px 0 20px",
        textAlign: "center",
      }}>
        {allRequiredFilled
          ? `${selected.length} outil${selected.length > 1 ? "s" : ""} sélectionné${selected.length > 1 ? "s" : ""}`
          : "Sélectionnez au moins un outil que vous utilisez."}
      </p>

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
