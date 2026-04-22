"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTester } from "./layout";
import MetricCard from "@/components/dashboard/MetricCard";
import StatusBanner from "@/components/dashboard/StatusBanner";
import EmptyState from "@/components/dashboard/EmptyState";
import CountdownTimer from "@/components/ui/CountdownTimer";

interface MissionItem {
  id: string;
  tester_status: string;
  started_at: string | null;
  project: {
    id: string;
    title: string;
    company_name: string | null;
    ref_number: string | null;
    start_date: string | null;
    end_date: string | null;
  };
}

export default function DashboardHome() {
  const { tester } = useTester();
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/testers/missions");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.missions ?? []);
          setMissions(list);
        }
      } finally {
        setMissionsLoading(false);
      }
    }
    load();
  }, []);

  if (!tester) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "#86868B" }}>
        Chargement…
      </div>
    );
  }

  const now = new Date();
  const activeMissions = missions.filter((m) => {
    const notExpired = !m.project.end_date || new Date(m.project.end_date) >= now;
    return notExpired && ["nda_signed", "invited", "in_progress"].includes(m.tester_status);
  });
  const featured = activeMissions[0];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: "#1d1d1f",
          margin: "0 0 4px", letterSpacing: "-0.04em",
        }}>
          Bonjour {tester.first_name}
        </h1>
        <p style={{ fontSize: 15, color: "#6e6e73", margin: 0 }}>
          {tester.status === "pending"
            ? "Votre profil est en cours de validation (48h)"
            : tester.status === "suspended"
            ? "Votre compte est suspendu. Contactez le support pour toute réactivation."
            : "Bienvenue dans votre espace testeur"
          }
        </p>
      </div>

      <StatusBanner status={tester.status} />

      {/* Mission en evidence */}
      {featured && (
        <Link
          href={`/app/dashboard/missions/${featured.project.id}`}
          style={{
            display: "block", textDecoration: "none",
            padding: "24px 28px", borderRadius: 20,
            background: "linear-gradient(135deg, #0A7A5A 0%, #0d946f 100%)",
            color: "#fff", marginBottom: 24,
            boxShadow: "0 6px 24px rgba(10,122,90,0.18)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, opacity: 0.85, marginBottom: 6, textTransform: "uppercase" }}>
                Mission {featured.tester_status === "in_progress" ? "en cours" : "à démarrer"}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                {featured.project.title}
              </h2>
              <p style={{ fontSize: 13, margin: 0, opacity: 0.9 }}>
                {featured.project.company_name || ""}
                {featured.project.ref_number ? ` · ${featured.project.ref_number}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              {featured.project.end_date && (
                <span
                  style={{
                    padding: "8px 14px", borderRadius: 980,
                    background: "rgba(255,255,255,0.2)", color: "#fff",
                    fontSize: 13, fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <CountdownTimerWhite endDate={featured.project.end_date} />
                </span>
              )}
              <span style={{ fontSize: 12, opacity: 0.9 }}>
                Cliquez pour accéder &rarr;
              </span>
            </div>
          </div>
        </Link>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16, marginBottom: 24,
      }}>
        <MetricCard icon="•" label="Missions actives" value={activeMissions.length} />
        <MetricCard icon="✓" label="Missions complétées" value={tester.missions_completed} />
        <MetricCard icon="€" label="Gains totaux" value={`${tester.total_earned}€`} />
        <MetricCard icon="★" label="Score qualité" value={`${tester.quality_score}/100`} />
      </div>

      {tester.persona && (
        <PersonaBlock
          name={tester.persona.name}
          description={tester.persona.description}
          minCents={tester.persona.min_reward_cents}
          maxCents={tester.persona.max_reward_cents}
          profileCompleted={tester.profile_completed}
        />
      )}

      <TierProgress
        tier={tester.tier}
        qualityScore={tester.quality_score}
        missionsCompleted={tester.missions_completed}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h2 style={{
            fontSize: 18, fontWeight: 700, color: "#1d1d1f",
            margin: "0 0 12px", letterSpacing: "-0.03em",
          }}>
            Vos missions actives
          </h2>
          {missionsLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#86868b", fontSize: 13 }}>
              Chargement…
            </div>
          ) : activeMissions.length === 0 ? (
            <EmptyState
              icon="•"
              title="Aucune mission active"
              description="Vous serez notifié par email dès qu'un test correspond à votre profil."
              extra={
                <span style={{
                  display: "inline-block", padding: "6px 16px",
                  background: "#f0faf5", color: "#0A7A5A",
                  borderRadius: 980, fontSize: 13, fontWeight: 600,
                }}>
                  Profil {tester.tier === "standard" ? "Standard" : tester.tier === "expert" ? "Expert" : "Premium"}
                </span>
              }
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeMissions.slice(1).map((m) => (
                <Link
                  key={m.id}
                  href={`/app/dashboard/missions/${m.project.id}`}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 18px", background: "#fff",
                    border: "0.5px solid rgba(0,0,0,0.08)",
                    borderRadius: 14, textDecoration: "none",
                    gap: 12, flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>
                      {m.project.title}
                    </div>
                    <div style={{ fontSize: 12, color: "#86868b", marginTop: 2 }}>
                      {m.project.company_name || ""}
                      {m.project.ref_number ? ` · ${m.project.ref_number}` : ""}
                    </div>
                  </div>
                  {m.project.end_date && (
                    <CountdownTimer target={m.project.end_date} prefix="Clôture dans" compact />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonaBlock({
  name, description, minCents, maxCents, profileCompleted,
}: {
  name: string;
  description: string | null;
  minCents: number;
  maxCents: number;
  profileCompleted: boolean;
}) {
  const minEur = Math.round(minCents / 100);
  const maxEur = Math.round(maxCents / 100);
  return (
    <div style={{
      background: "linear-gradient(135deg, #f0faf5 0%, #fff 100%)",
      borderRadius: 20,
      border: "0.5px solid rgba(10,122,90,0.2)",
      padding: "20px 24px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0A7A5A", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>
            Votre profil
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            {name}
          </h3>
          {description && (
            <p style={{ fontSize: 13, color: "#6e6e73", margin: 0, lineHeight: 1.5 }}>
              {description}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#6e6e73", marginBottom: 2 }}>
            Fourchette indicative par mission
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0A7A5A", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            {minEur} – {maxEur}€
          </div>
        </div>
      </div>
      {!profileCompleted && (
        <p style={{ fontSize: 12, color: "#86868B", margin: "12px 0 0", lineHeight: 1.5 }}>
          Complétez votre profil pour affiner votre catégorie et votre fourchette de retribution.
        </p>
      )}
    </div>
  );
}

function TierProgress({ tier, qualityScore, missionsCompleted }: {
  tier: string;
  qualityScore: number;
  missionsCompleted: number;
}) {
  const tiers = [
    { key: "standard", label: "Standard", scoreReq: 0, missionsReq: 0 },
    { key: "expert", label: "Expert", scoreReq: 65, missionsReq: 2 },
    { key: "premium", label: "Premium", scoreReq: 80, missionsReq: 5 },
  ];
  const currentIdx = tiers.findIndex((t) => t.key === tier);
  const next = currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : null;

  const scorePct = Math.min(100, Math.round((qualityScore / 100) * 100));

  return (
    <div style={{
      background: "#fff", borderRadius: 20,
      border: "0.5px solid rgba(0,0,0,0.08)",
      padding: "24px 28px", marginBottom: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", margin: 0, letterSpacing: "-0.02em" }}>
          Progression
        </h3>
        <span style={{
          padding: "4px 12px", borderRadius: 980, fontSize: 12, fontWeight: 700,
          background: tier === "premium" ? "#0A7A5A" : tier === "expert" ? "#1D9E75" : "#f5f5f7",
          color: tier === "standard" ? "#6e6e73" : "#fff",
        }}>
          {tiers[currentIdx]?.label ?? "Standard"}
        </span>
      </div>

      {/* Paliers visuels */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {tiers.map((t, i) => (
          <div
            key={t.key}
            style={{
              flex: 1, height: 6, borderRadius: 3,
              background: i <= currentIdx ? "#0A7A5A" : "#e5e5ea",
            }}
          />
        ))}
      </div>

      {/* Barre score */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6e6e73", marginBottom: 4 }}>
          <span>Score qualité</span>
          <span style={{ fontWeight: 600 }}>{qualityScore}/100</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "#e5e5ea" }}>
          <div style={{ height: "100%", borderRadius: 3, background: "#0A7A5A", width: `${scorePct}%`, transition: "width 300ms" }} />
        </div>
      </div>

      {/* Missions */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6e6e73", marginBottom: 4 }}>
          <span>Missions validées</span>
          <span style={{ fontWeight: 600 }}>{missionsCompleted}{next ? ` / ${next.missionsReq}` : ""}</span>
        </div>
        {next && (
          <div style={{ height: 6, borderRadius: 3, background: "#e5e5ea" }}>
            <div style={{
              height: "100%", borderRadius: 3, background: "#1D9E75",
              width: `${Math.min(100, Math.round((missionsCompleted / next.missionsReq) * 100))}%`,
              transition: "width 300ms",
            }} />
          </div>
        )}
      </div>

      {next ? (
        <p style={{ fontSize: 12, color: "#6e6e73", margin: 0, lineHeight: 1.5 }}>
          Pour atteindre <strong style={{ color: "#1d1d1f" }}>{next.label}</strong> :
          {qualityScore < next.scoreReq && ` score ≥ ${next.scoreReq}`}
          {qualityScore < next.scoreReq && missionsCompleted < next.missionsReq && " et"}
          {missionsCompleted < next.missionsReq && ` ${next.missionsReq - missionsCompleted} mission${next.missionsReq - missionsCompleted > 1 ? "s" : ""} de plus`}
          {qualityScore >= next.scoreReq && missionsCompleted >= next.missionsReq && " conditions remplies — mise à jour automatique"}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "#0A7A5A", fontWeight: 600, margin: 0 }}>
          Vous avez atteint le tier le plus élevé
        </p>
      )}
    </div>
  );
}

// Variante blanche pour fond colore
function CountdownTimerWhite({ endDate }: { endDate: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const diff = new Date(endDate).getTime() - now;
  if (diff <= 0) return <span>Délai dépassé</span>;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const under24h = diff <= 24 * 60 * 60 * 1000;
  const text = under24h
    ? `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}min ${String(seconds).padStart(2, "0")}s`
    : `${days}j ${hours}h`;
  return <span data-tick={tick}>Clôture dans {text}</span>;
}
