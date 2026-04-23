"use client";

import { useCallback, useEffect, useState } from "react";
import type { Tester, TesterGender, TesterPersona } from "@/types/tester";

const GENDER_LABELS: Record<string, string> = {
  female: "Femme",
  male: "Homme",
  non_binary: "Non-binaire",
  prefer_not_to_say: "Préfère ne pas répondre",
};

interface TesterDrawerProps {
  testerId: string | null;
  onClose: () => void;
}

interface PersonaOption extends TesterPersona {
  tester_count?: number;
}

function Badge({ children, color = "#0A7A5A", bg = "#f0faf5" }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "4px 12px", fontSize: 12,
      fontWeight: 600, color, background: bg, borderRadius: 980, marginRight: 4, marginBottom: 4,
    }}>{children}</span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 700, color: "#1d1d1f",
        textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10,
      }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "0.5px solid rgba(0,0,0,0.04)" }}>
      <span style={{ fontSize: 13, color: "#86868B" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#1d1d1f", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value || "–"}</span>
    </div>
  );
}

export default function TesterDrawer({ testerId, onClose }: TesterDrawerProps) {
  const [tester, setTester] = useState<Tester | null>(null);
  const [personas, setPersonas] = useState<PersonaOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPersona, setSavingPersona] = useState(false);

  const fetchDrawerData = useCallback(async () => {
    if (!testerId) {
      setTester(null);
      setPersonas([]);
      return;
    }

    setLoading(true);
    try {
      const [testerRes, personasRes] = await Promise.all([
        fetch(`/api/staff/testers/${testerId}`),
        fetch("/api/staff/personas"),
      ]);

      setTester(testerRes.ok ? await testerRes.json() : null);
      setPersonas(personasRes.ok ? await personasRes.json() : []);
    } finally {
      setLoading(false);
    }
  }, [testerId]);

  useEffect(() => {
    fetchDrawerData();
  }, [fetchDrawerData]);

  if (!testerId) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
          zIndex: 200, animation: "drawerOverlayIn 200ms ease",
        }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 440, maxWidth: "100vw",
        background: "#fff", zIndex: 201, boxShadow: "-8px 0 40px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column", animation: "drawerSlideIn 250ms ease",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "0.5px solid rgba(0,0,0,0.08)",
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.03em", margin: 0 }}>
            Profil testeur
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20, color: "#86868B",
            cursor: "pointer", padding: "4px 8px", borderRadius: 8, transition: "background 150ms",
          }}>&times;</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#86868B", fontSize: 14 }}>
              Chargement…
            </div>
          ) : tester ? (
            <>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: "#0A7A5A",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 700, margin: "0 auto 12px",
                }}>
                  {(tester.first_name?.[0] || "T").toUpperCase()}{(tester.last_name?.[0] || "P").toUpperCase()}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f" }}>
                  {tester.first_name} {tester.last_name}
                </div>
                <div style={{ fontSize: 13, color: "#86868B", marginTop: 2 }}>{tester.email}</div>
                <div style={{ marginTop: 8 }}>
                  <Badge
                    color={tester.status === "active" ? "#0A7A5A" : "#86868B"}
                    bg={tester.status === "active" ? "#f0faf5" : "#f5f5f7"}
                  >
                    {tester.status === "active" ? "Actif" : tester.status === "pending" ? "En attente" : tester.status}
                  </Badge>
                </div>
              </div>

              <Section title="Identité">
                <InfoLine label="Téléphone" value={tester.phone} />
                <InfoLine label="LinkedIn" value={tester.linkedin_url} />
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "0.5px solid rgba(0,0,0,0.04)", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#86868B" }}>Genre</span>
                  <select
                    value={tester.gender || ""}
                    onChange={async (e) => {
                      const val = e.target.value as TesterGender | "";
                      const res = await fetch(`/api/staff/testers/${tester.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ gender: val || null }),
                      });
                      if (res.ok) {
                        setTester({ ...tester, gender: val || null } as Tester);
                      }
                    }}
                    style={{
                      fontSize: 13, fontWeight: 500, color: "#1d1d1f",
                      background: "#f5f5f7", border: "0.5px solid rgba(0,0,0,0.08)",
                      borderRadius: 6, padding: "4px 8px", fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">–</option>
                    {Object.entries(GENDER_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </Section>

              <Section title="Persona">
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "#86868B", display: "block", marginBottom: 6 }}>
                    Persona attribué
                  </span>
                  <select
                    value={tester.persona_id || ""}
                    disabled={savingPersona}
                    onChange={async (e) => {
                      const personaId = e.target.value || null;
                      setSavingPersona(true);
                      const res = await fetch(`/api/staff/testers/${tester.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ persona_id: personaId }),
                      });
                      if (res.ok) {
                        setTester({ ...tester, persona_id: personaId } as Tester);
                      }
                      setSavingPersona(false);
                    }}
                    style={{
                      width: "100%",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#1d1d1f",
                      background: "#f5f5f7",
                      border: "0.5px solid rgba(0,0,0,0.08)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontFamily: "inherit",
                      cursor: savingPersona ? "wait" : "pointer",
                    }}
                  >
                    <option value="">Aucun persona</option>
                    {personas.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#1d1d1f",
                    marginBottom: 8,
                    cursor: savingPersona ? "wait" : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!tester.persona_locked}
                    disabled={savingPersona}
                    onChange={async (e) => {
                      const locked = e.target.checked;
                      setSavingPersona(true);
                      const res = await fetch(`/api/staff/testers/${tester.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ persona_locked: locked }),
                      });
                      if (res.ok) {
                        setTester({ ...tester, persona_locked: locked } as Tester);
                      }
                      setSavingPersona(false);
                    }}
                    style={{ accentColor: "#0A7A5A" }}
                  />
                  Verrouiller ce persona manuellement
                </label>

                <div style={{ fontSize: 12, color: "#86868B", lineHeight: 1.5 }}>
                  Quand il est verrouillé, les recomputations automatiques ne remplacent plus le persona choisi.
                </div>
              </Section>

              <Section title="Professionnel">
                <InfoLine label="Poste" value={tester.job_title} />
                <InfoLine label="Secteur" value={tester.sector} />
                <InfoLine label="Taille entreprise" value={tester.company_size} />
                <InfoLine label="Niveau digital" value={tester.digital_level} />
              </Section>

              <Section title="Outils">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {tester.tools?.length ? tester.tools.map((t) => <Badge key={t}>{t}</Badge>) : <span style={{ fontSize: 13, color: "#86868B" }}>Aucun</span>}
                </div>
              </Section>

              <Section title="Équipement">
                <InfoLine label="Appareils" value={tester.devices?.join(", ")} />
                <InfoLine label="Navigateurs" value={tester.browsers?.join(", ")} />
                <InfoLine label="Modèle téléphone" value={tester.phone_model} />
                <InfoLine label="OS mobile" value={tester.mobile_os} />
                <InfoLine label="Connexion" value={tester.connection} />
              </Section>

              <Section title="Préférences">
                <InfoLine label="Disponibilité" value={tester.availability} />
                <InfoLine label="Expérience UX" value={tester.ux_experience} />
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "#86868B", display: "block", marginBottom: 6 }}>Centres d&apos;intérêt</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {tester.interests?.length ? tester.interests.map((i) => <Badge key={i}>{i}</Badge>) : <span style={{ fontSize: 13, color: "#86868B" }}>Aucun</span>}
                  </div>
                </div>
              </Section>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#86868B", fontSize: 14 }}>
              Testeur introuvable
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes drawerSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes drawerOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
