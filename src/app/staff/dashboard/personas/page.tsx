"use client";

import { useEffect, useState } from "react";

interface Persona {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  min_reward_cents: number;
  max_reward_cents: number;
  matching_rules: {
    job_title_keywords?: string[];
    sectors?: string[];
    digital_levels?: string[];
    company_sizes?: string[];
  };
  priority: number;
  is_active: boolean;
  is_fallback: boolean;
  tester_count: number;
}

export default function StaffPersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/personas");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      setPersonas(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function recompute() {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/staff/personas/recompute", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setFlash(`Recalcule : ${data.updated} testeur(s) mis a jour sur ${data.total}.`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, payload: Partial<Persona>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/personas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Erreur ${res.status}`);
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function fmtEur(cents: number) {
    return `${Math.round(cents / 100)}€`;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", margin: 0 }}>
            Personas testeurs
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#86868B" }}>
            Segments et fourchettes de retribution indicatives. Affiches au testeur apres son onboarding.
          </p>
        </div>
        <button
          onClick={recompute}
          disabled={busy}
          style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 600,
            color: "#fff", background: busy ? "#86868B" : "#0A7A5A",
            border: "none", borderRadius: 980, cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "En cours…" : "Recalculer tous les testeurs"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}
      {flash && (
        <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#0A7A5A", fontSize: 13 }}>
          {flash}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#86868B" }}>Chargement…</div>
      ) : personas.length === 0 ? (
        <div style={{
          background: "#fff", borderRadius: 20,
          border: "0.5px solid rgba(0,0,0,0.08)",
          padding: "40px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Aucun persona trouvé
          </h2>
          <p style={{ fontSize: 14, color: "#86868B", margin: "0 auto 18px", maxWidth: 520, lineHeight: 1.55 }}>
            La migration <code style={{ background: "#f5f5f7", padding: "2px 6px", borderRadius: 6, fontSize: 13 }}>011_tester_personas.sql</code> n&apos;a pas été appliquée, ou les 5 personas par défaut n&apos;ont pas été seedés.
            Exécutez la migration dans Supabase (SQL editor ou <code style={{ background: "#f5f5f7", padding: "2px 6px", borderRadius: 6, fontSize: 13 }}>supabase db push</code>) puis rechargez la page.
          </p>
          <button
            onClick={load}
            style={{
              padding: "10px 18px", fontSize: 13, fontWeight: 600,
              color: "#fff", background: "#0A7A5A",
              border: "none", borderRadius: 980, cursor: "pointer",
            }}
          >
            Recharger
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {personas.map((p) => {
            const isOpen = editing === p.id;
            return (
              <div
                key={p.id}
                style={{
                  background: "#fff", borderRadius: 16,
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em", margin: 0 }}>
                        {p.name}
                      </h3>
                      <span style={{ fontSize: 11, color: "#86868B", fontFamily: "monospace" }}>#{p.slug}</span>
                      {p.is_fallback && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 980, background: "#f5f5f7", color: "#6e6e73" }}>
                          Fallback
                        </span>
                      )}
                      {!p.is_active && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 980, background: "#fef2f2", color: "#b91c1c" }}>
                          Inactif
                        </span>
                      )}
                    </div>
                    {p.description && <p style={{ margin: "2px 0 8px", fontSize: 13, color: "#6e6e73" }}>{p.description}</p>}
                    <div style={{ fontSize: 13, color: "#1d1d1f" }}>
                      <strong style={{ color: "#0A7A5A" }}>{fmtEur(p.min_reward_cents)} – {fmtEur(p.max_reward_cents)}</strong>
                      <span style={{ color: "#86868B" }}> · priorite {p.priority} · {p.tester_count} testeur(s)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(isOpen ? null : p.id)}
                    style={{
                      padding: "8px 14px", fontSize: 13, fontWeight: 600,
                      color: "#0A7A5A", background: "#f0faf5",
                      border: "1px solid #0A7A5A", borderRadius: 980, cursor: "pointer",
                    }}
                  >
                    {isOpen ? "Fermer" : "Modifier"}
                  </button>
                </div>

                {isOpen && (
                  <PersonaEditor
                    persona={p}
                    busy={busy}
                    onSave={(payload) => patch(p.id, payload)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonaEditor({
  persona,
  busy,
  onSave,
}: {
  persona: Persona;
  busy: boolean;
  onSave: (payload: Partial<Persona>) => Promise<void> | void;
}) {
  const [name, setName] = useState(persona.name);
  const [description, setDescription] = useState(persona.description ?? "");
  const [minEur, setMinEur] = useState(String(Math.round(persona.min_reward_cents / 100)));
  const [maxEur, setMaxEur] = useState(String(Math.round(persona.max_reward_cents / 100)));
  const [priority, setPriority] = useState(String(persona.priority));
  const [isActive, setIsActive] = useState(persona.is_active);
  const [isFallback, setIsFallback] = useState(persona.is_fallback);
  const [kw, setKw] = useState((persona.matching_rules?.job_title_keywords ?? []).join(", "));
  const [sectors, setSectors] = useState((persona.matching_rules?.sectors ?? []).join(", "));
  const [levels, setLevels] = useState((persona.matching_rules?.digital_levels ?? []).join(", "));
  const [sizes, setSizes] = useState((persona.matching_rules?.company_sizes ?? []).join(", "));

  function parseList(s: string): string[] {
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }

  async function submit() {
    await onSave({
      name,
      description: description.trim() || null,
      min_reward_cents: Math.max(0, Math.round(Number(minEur) * 100)),
      max_reward_cents: Math.max(0, Math.round(Number(maxEur) * 100)),
      priority: Number(priority) || 0,
      is_active: isActive,
      is_fallback: isFallback,
      matching_rules: {
        job_title_keywords: parseList(kw),
        sectors: parseList(sectors),
        digital_levels: parseList(levels),
        company_sizes: parseList(sizes),
      },
    });
  }

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#6e6e73", marginBottom: 4, display: "block" };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)", fontFamily: "inherit", background: "#fff",
  };

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "0.5px solid rgba(0,0,0,0.08)", display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Priorite (desc.)</label>
          <input value={priority} onChange={(e) => setPriority(e.target.value)} type="number" style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Retribution min (€)</label>
          <input value={minEur} onChange={(e) => setMinEur(e.target.value)} type="number" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Retribution max (€)</label>
          <input value={maxEur} onChange={(e) => setMaxEur(e.target.value)} type="number" style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Mots-cles fonction (separes par virgule)</label>
        <textarea value={kw} onChange={(e) => setKw(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="DAF, directeur, head of…" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Secteurs (slug)</label>
          <input value={sectors} onChange={(e) => setSectors(e.target.value)} style={inputStyle} placeholder="finance, sante…" />
        </div>
        <div>
          <label style={labelStyle}>Niveaux digitaux</label>
          <input value={levels} onChange={(e) => setLevels(e.target.value)} style={inputStyle} placeholder="avance, expert" />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Tailles d'entreprise</label>
        <input value={sizes} onChange={(e) => setSizes(e.target.value)} style={inputStyle} placeholder="51-200, 201-1000, 1000+" />
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1d1d1f" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Actif
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1d1d1f" }}>
          <input type="checkbox" checked={isFallback} onChange={(e) => setIsFallback(e.target.checked)} />
          Persona par defaut (fallback)
        </label>
      </div>

      <div>
        <button
          onClick={submit}
          disabled={busy}
          style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 600,
            color: "#fff", background: busy ? "#86868B" : "#0A7A5A",
            border: "none", borderRadius: 980, cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
