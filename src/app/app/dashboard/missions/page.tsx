"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import EmptyState from "@/components/dashboard/EmptyState";

interface Mission {
  assignment_id: string;
  project_id: string;
  tester_status: string;
  nda_signed_at: string | null;
  completed_at: string | null;
  project: {
    title: string;
    description: string | null;
    company_name: string | null;
    sector: string | null;
    start_date: string | null;
    end_date: string | null;
    ref_number: string | null;
    status: string;
  };
}

type Tab = "active" | "completed" | "expired";

const TABS: { id: Tab; label: string }[] = [
  { id: "active", label: "En cours" },
  { id: "completed", label: "Complétées" },
  { id: "expired", label: "Expirées" },
];

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date(new Date().toDateString());
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  nda_signed: { label: "NDA signé", color: "#0A7A5A", bg: "#f0faf5" },
  invited: { label: "Invité", color: "#2563eb", bg: "#eff6ff" },
  in_progress: { label: "En cours", color: "#d97706", bg: "#fef3c7" },
  completed: { label: "Terminée", color: "#6b7280", bg: "#f3f4f6" },
};

export default function MissionsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMissions() {
      try {
        const res = await fetch("/api/testers/missions");
        if (res.ok) setMissions(await res.json());
      } catch { /* silent */ }
      setLoading(false);
    }
    fetchMissions();
  }, []);

  const active = missions.filter(
    (m) => m.tester_status !== "completed" && !isExpired(m.project.end_date)
  );
  const completed = missions.filter((m) => m.tester_status === "completed");
  const expired = missions.filter(
    (m) => m.tester_status !== "completed" && isExpired(m.project.end_date)
  );

  const tabData: Record<Tab, Mission[]> = { active, completed, expired };
  const current = tabData[tab];

  const emptyMessages: Record<Tab, { title: string; desc: string }> = {
    active: {
      title: "Aucune mission en cours",
      desc: "Les missions apparaîtront ici une fois le NDA signé.",
    },
    completed: {
      title: "Aucune mission complétée",
      desc: "Vos missions terminées seront listées ici.",
    },
    expired: {
      title: "Aucune mission expirée",
      desc: "Les missions dont la date de fin est passée apparaîtront ici.",
    },
  };

  return (
    <div>
      <h1 style={{
        fontSize: 24, fontWeight: 700, color: "#1d1d1f",
        margin: "0 0 20px", letterSpacing: "-0.04em",
      }}>
        Mes missions
      </h1>

      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: "#f5f5f7", borderRadius: 12, padding: 4,
      }}>
        {TABS.map((t) => {
          const count = tabData[t.id].length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "10px 16px", fontSize: 14,
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? "#1d1d1f" : "#86868B",
                background: tab === t.id ? "#fff" : "transparent",
                border: "none", borderRadius: 10, cursor: "pointer",
                transition: "all 200ms", fontFamily: "inherit",
                boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {t.label}
              {count > 0 && (
                <span style={{
                  background: tab === t.id ? "#0A7A5A" : "#d1d5db",
                  color: tab === t.id ? "#fff" : "#6b7280",
                  fontSize: 11, fontWeight: 700, borderRadius: 980,
                  padding: "2px 7px", minWidth: 18, textAlign: "center",
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#86868B", fontSize: 14 }}>
          Chargement…
        </div>
      ) : current.length === 0 ? (
        <EmptyState icon="📋" title={emptyMessages[tab].title} description={emptyMessages[tab].desc} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {current.map((m) => {
            const st = STATUS_LABELS[m.tester_status] || STATUS_LABELS.nda_signed;
            const exp = isExpired(m.project.end_date);
            return (
              <Link
                key={m.assignment_id}
                href={`/app/dashboard/missions/${m.project_id}`}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  background: "#fff", borderRadius: 16,
                  border: exp ? "1.5px solid #e5e7eb" : "0.5px solid rgba(0,0,0,0.08)",
                  padding: "20px 24px", opacity: exp ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 12, transition: "box-shadow 200ms",
                  cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                    <span style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: exp ? "#f3f4f6" : "#f0faf5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                    }}>{exp ? "⏰" : "🎯"}</span>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>
                        {m.project.title}
                      </p>
                      <p style={{ fontSize: 12, color: "#86868B", margin: "2px 0 0" }}>
                        {m.project.company_name || ""}
                        {m.project.ref_number ? ` · ${m.project.ref_number}` : ""}
                      </p>
                      {(m.project.start_date || m.project.end_date) && (
                        <p style={{ fontSize: 11, color: "#86868B", margin: "4px 0 0" }}>
                          {m.project.start_date && `Du ${new Date(m.project.start_date).toLocaleDateString("fr-FR")}`}
                          {m.project.end_date && ` au ${new Date(m.project.end_date).toLocaleDateString("fr-FR")}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: 980, fontSize: 12, fontWeight: 600,
                      color: exp ? "#6b7280" : st.color,
                      background: exp ? "#f3f4f6" : st.bg,
                    }}>
                      {exp ? "Expirée" : st.label}
                    </span>
                    <span style={{ fontSize: 18, color: "#86868B" }}>&rsaquo;</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
