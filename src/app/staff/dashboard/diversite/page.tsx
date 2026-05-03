"use client";

import { useEffect, useState, useMemo } from "react";

interface DiversityResponse {
  total_active: number;
  by_sector: Record<string, number>;
  by_csp: Record<string, number>;
  by_age_bucket: Record<string, number>;
  matrix: Record<string, Record<string, number>>;
  sectors: string[];
  csps: string[];
  age_buckets: string[];
}

export default function StaffDiversityPage() {
  const [data, setData] = useState<DiversityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/staff/diversity")
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d) => setData(d))
      .catch((e) => setError(typeof e === "string" ? e : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  // Pour la heatmap : max value sur la matrice -> normalisation des couleurs
  const maxCount = useMemo(() => {
    if (!data) return 0;
    let max = 0;
    Object.values(data.matrix).forEach((row) => {
      Object.values(row).forEach((v) => { if (v > max) max = v; });
    });
    return max;
  }, [data]);

  function heatBg(count: number): string {
    if (count === 0) return "#fafafa";
    if (maxCount === 0) return "#fafafa";
    const intensity = Math.min(1, count / maxCount);
    // Vert earlypanel : interpoler entre #f0faf5 (clair) et #0A7A5A (fort)
    const r = Math.round(240 - (240 - 10) * intensity);
    const g = Math.round(250 - (250 - 122) * intensity);
    const b = Math.round(245 - (245 - 90) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  }
  function heatFg(count: number): string {
    return count >= maxCount * 0.55 ? "#fff" : "#1d1d1f";
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: "#86868B" }}>Chargement…</div>;
  }
  if (error || !data) {
    return <div style={{ textAlign: "center", padding: 40, color: "#b91c1c" }}>{error ?? "Erreur"}</div>;
  }

  const sectorsByCount = [...data.sectors].sort((a, b) => (data.by_sector[b] ?? 0) - (data.by_sector[a] ?? 0));
  const cspsByCount = [...data.csps].sort((a, b) => (data.by_csp[b] ?? 0) - (data.by_csp[a] ?? 0));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", margin: 0 }}>
          Diversité du panel
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#86868B" }}>
          Vue agrégée des testeurs actifs (profil complété). Utile pour répondre aux ciblages clients (&laquo;&nbsp;j&apos;ai des comptables 25-35 ans&nbsp;?&nbsp;&raquo;).
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Stat label="Total testeurs actifs" value={data.total_active} />
        <Stat label="Secteurs représentés" value={Object.values(data.by_sector).filter((v) => v > 0).length} suffix={` / ${data.sectors.length}`} />
        <Stat label="CSP représentées" value={Object.values(data.by_csp).filter((v) => v > 0).length} suffix={` / ${data.csps.length}`} />
        <Stat label="Tranches d'age" value={Object.values(data.by_age_bucket).filter((v) => v > 0).length} suffix={` / ${data.age_buckets.length}`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 24 }}>
        <DistributionCard title="Par secteur d'activité" entries={sectorsByCount.map((s) => ({ label: s, count: data.by_sector[s] ?? 0 }))} />
        <DistributionCard title="Par catégorie socio-professionnelle" entries={cspsByCount.map((c) => ({ label: c, count: data.by_csp[c] ?? 0 }))} />
        <DistributionCard title="Par tranche d'age" entries={data.age_buckets.map((b) => ({ label: b, count: data.by_age_bucket[b] ?? 0 }))} />
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.08)", padding: "18px 20px", overflowX: "auto" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", margin: "0 0 12px" }}>
          Matrice secteur × tranche d&apos;age
        </h2>
        <p style={{ fontSize: 12, color: "#86868B", margin: "0 0 16px" }}>
          Plus le vert est foncé, plus le panel concentre de testeurs sur cette intersection. Les zones claires sont à renforcer.
        </p>
        <table style={{ borderCollapse: "separate", borderSpacing: 2, fontSize: 12, fontVariantNumeric: "tabular-nums", minWidth: "100%" }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "#fff", textAlign: "left", padding: "8px 10px", fontWeight: 700, color: "#86868B", textTransform: "uppercase", letterSpacing: 0.4, fontSize: 10, minWidth: 200 }}>
                Secteur
              </th>
              {data.age_buckets.map((b) => (
                <th key={b} style={{ padding: "8px 10px", fontWeight: 700, color: "#86868B", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4, fontSize: 10 }}>
                  {b}
                </th>
              ))}
              <th style={{ padding: "8px 10px", fontWeight: 700, color: "#86868B", textAlign: "right", textTransform: "uppercase", letterSpacing: 0.4, fontSize: 10 }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sectorsByCount.map((s) => {
              const rowTotal = data.by_sector[s] ?? 0;
              return (
                <tr key={s}>
                  <td style={{ position: "sticky", left: 0, background: "#fff", padding: "8px 10px", fontWeight: 500, color: "#1d1d1f", whiteSpace: "nowrap" }}>
                    {s}
                  </td>
                  {data.age_buckets.map((b) => {
                    const count = data.matrix[s]?.[b] ?? 0;
                    return (
                      <td
                        key={b}
                        style={{
                          padding: "10px 8px", textAlign: "center",
                          background: heatBg(count), color: heatFg(count),
                          fontWeight: count > 0 ? 600 : 400,
                          borderRadius: 6, minWidth: 60,
                        }}
                      >
                        {count > 0 ? count : "·"}
                      </td>
                    );
                  })}
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#1d1d1f", fontWeight: 700 }}>
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "0.5px solid rgba(0,0,0,0.08)",
      padding: "16px 18px",
    }}>
      <div style={{ fontSize: 11, color: "#86868B", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em" }}>
        {value}{suffix && <span style={{ fontSize: 14, color: "#86868B", fontWeight: 500 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function DistributionCard({ title, entries }: { title: string; entries: { label: string; count: number }[] }) {
  const max = Math.max(1, ...entries.map((e) => e.count));
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid rgba(0,0,0,0.08)", padding: "16px 18px" }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", margin: "0 0 12px", letterSpacing: "-0.01em" }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entries.map((e) => (
          <div key={e.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#1d1d1f", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.label}
            </span>
            <div style={{ flex: 1, height: 6, background: "#f5f5f7", borderRadius: 980, overflow: "hidden", maxWidth: 120 }}>
              <div style={{
                width: `${(e.count / max) * 100}%`,
                height: "100%",
                background: e.count > 0 ? "#0A7A5A" : "transparent",
                transition: "width 200ms",
              }} />
            </div>
            <span style={{ fontSize: 12, color: e.count > 0 ? "#0A7A5A" : "#86868B", fontWeight: 600, minWidth: 24, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {e.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
