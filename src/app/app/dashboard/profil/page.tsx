"use client";

import { useState, useCallback, useEffect } from "react";
import { useTester } from "../layout";
import type { Tester, DigitalLevel, MobileOS, ConnectionType, Availability, UxExperience } from "@/types/tester";
import PillSelect from "@/components/ui/PillSelect";
import Toast from "@/components/ui/Toast";
import PaymentInfoSection from "@/components/tester/PaymentInfoSection";
import {
  computeProfileCompleteness,
  CATEGORY_LABELS,
  type RequiredFieldCategory,
} from "@/lib/profile-completeness";

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function displayToIso(display: string): string {
  const clean = display.replace(/[^\d]/g, "");
  if (clean.length === 8) {
    const d = clean.slice(0, 2), m = clean.slice(2, 4), y = clean.slice(4, 8);
    return `${y}-${m}-${d}`;
  }
  return "";
}

function formatBirthInput(raw: string, prev: string): string {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 8);
  const wasDeleting = raw.length < prev.length;
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += "/";
    out += digits[i];
  }
  if (!wasDeleting && (digits.length === 2 || digits.length === 4)) out += "/";
  return out;
}

const SECTORS = [
  "Tech / SaaS", "E-commerce", "Finance / Banque", "Assurance",
  "Santé", "RH / Recrutement", "Juridique", "Éducation",
  "Immobilier", "Transport / Logistique", "Industrie", "Autre",
];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", "Brave", "Opera", "Arc", "Autre"];
const DEVICES = ["PC Windows", "PC Linux", "Mac", "iPhone", "Smartphone Android", "Autre smartphone", "iPad", "Tablette Android", "Autre tablette"];
const TIMESLOTS = ["Matin", "Midi", "Après-midi", "Soir", "Week-end"];
const INTERESTS = ["SaaS B2B", "E-commerce", "App mobile", "Fintech", "Santé", "RH", "Juridique", "Éducation"];

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
  marginBottom: 6,
};

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: "0.5px solid rgba(0,0,0,0.08)",
  padding: "24px",
  marginBottom: 16,
};

export default function ProfilPage() {
  const { tester, loading, notFound, refreshTester } = useTester();
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [saving, setSaving] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Tester>>({});

  const hideToast = useCallback(() => setToast({ visible: false, message: "" }), []);

  const [birthDisplay, setBirthDisplay] = useState("");
  useEffect(() => {
    if (tester?.birth_date && !birthDisplay) setBirthDisplay(isoToDisplay(tester.birth_date));
  }, [tester?.birth_date]);
  const handleBirthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBirthDisplay(prev => {
      const next = formatBirthInput(e.target.value, prev);
      const iso = displayToIso(next);
      if (iso) setForm(p => ({ ...p, birth_date: iso }));
      else if (!next) setForm(p => ({ ...p, birth_date: "" }));
      return next;
    });
  }, []);

  const val = (key: keyof Tester) => (form[key] !== undefined ? form[key] : tester?.[key]) ?? "";
  const arrVal = (key: keyof Tester): string[] => {
    const v = form[key] !== undefined ? form[key] : tester?.[key];
    return Array.isArray(v) ? v : [];
  };

  function update(key: keyof Tester, value: unknown) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function saveSection(section: string, fields: (keyof Tester)[]) {
    setSaving(section);
    const payload: Record<string, unknown> = {};
    fields.forEach((f) => {
      payload[f] = form[f] !== undefined ? form[f] : tester?.[f];
    });

    try {
      const res = await fetch("/api/testers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erreur");
      setToast({ visible: true, message: "Modifications sauvegardées ✓" });
      await refreshTester();
    } catch {
      setToast({ visible: true, message: "Erreur lors de la sauvegarde" });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div style={{ padding: "60px 0", textAlign: "center", color: "#86868B" }}>Chargement…</div>;
  }

  if (notFound || !tester) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#128566;</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
          Profil non trouvé
        </h2>
        <p style={{ fontSize: 14, color: "#86868B", margin: "0 0 20px", maxWidth: 400, marginInline: "auto" }}>
          Aucun profil testeur n&apos;est associé à ce compte. Si vous venez de vous inscrire,
          veuillez d&apos;abord compléter l&apos;onboarding.
        </p>
        <a href="/app/onboarding" style={{
          display: "inline-block",
          padding: "12px 28px",
          background: "#0A7A5A",
          color: "#fff",
          borderRadius: 980,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: "none",
        }}>
          Compléter mon profil
        </a>
      </div>
    );
  }

  const initials = `${(tester.first_name || "T")[0]}${(tester.last_name || "P")[0]}`.toUpperCase();
  const tierLabel = tester.tier === "premium" ? "Premium" : tester.tier === "expert" ? "Expert" : "Standard";
  const tierDesc = tester.tier === "premium"
    ? "Score ≥ 80 et 5+ missions validées"
    : tester.tier === "expert"
    ? "Score ≥ 65 et 2+ missions validées"
    : "Profil de base";

  // Source unique de verite : aligne sur le trigger DB auto_activate_tester
  // (cf. migrations 004 + 026). Si la colonne `profile_completed` n'est pas
  // a true, le testeur ne peut pas etre invite ni signer de NDA.
  const completeness = computeProfileCompleteness(tester as unknown as Record<string, unknown>);
  const profileBlocked = !completeness.isComplete;

  return (
    <div>
      {profileBlocked && (
        <div style={{
          background: "#fef3c7", borderRadius: 14, padding: "16px 20px",
          marginBottom: 20, border: "1px solid #fde68a",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>&#9888;&#65039;</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", margin: "0 0 4px" }}>
                Profil à compléter — {completeness.count} champ{completeness.count > 1 ? "s" : ""} manquant{completeness.count > 1 ? "s" : ""}
              </p>
              <p style={{ fontSize: 12, color: "#a16207", margin: 0, lineHeight: 1.5 }}>
                Vous ne pourrez pas être invité(e) à des projets ni signer de NDA tant que tous les champs requis ne sont pas renseignés.
              </p>
            </div>
          </div>
          <div style={{ paddingLeft: 30 }}>
            {(Object.keys(completeness.missingByCategory) as RequiredFieldCategory[])
              .filter((cat) => completeness.missingByCategory[cat].length > 0)
              .map((cat) => (
                <div key={cat} style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <ul style={{ margin: "2px 0 0", paddingLeft: 18, listStyle: "disc" }}>
                    {completeness.missingByCategory[cat].map((f) => (
                      <li key={f.key} style={{ fontSize: 12, color: "#a16207", lineHeight: 1.6 }}>
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "#0A7A5A",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          fontWeight: 700,
          margin: "0 auto 12px",
        }}>
          {initials}
        </div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1d1d1f",
          margin: "0 0 6px",
          letterSpacing: "-0.04em",
        }}>
          {tester.first_name} {tester.last_name}
        </h1>
        <span style={{
          display: "inline-block",
          padding: "4px 14px",
          background: "#f0faf5",
          color: "#0A7A5A",
          borderRadius: 980,
          fontSize: 12,
          fontWeight: 600,
        }}>
          {tierLabel}
        </span>
        <p style={{ fontSize: 12, color: "#86868B", margin: "4px 0 0" }}>{tierDesc}</p>
      </div>

      {/* Progression tier */}
      <div style={{
        ...sectionStyle,
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0,
        padding: 0, overflow: "hidden", marginBottom: 20,
      }}>
        {([
          { key: "standard", label: "Standard", req: "Profil de base" },
          { key: "expert", label: "Expert", req: "Score ≥ 65 · 2+ missions" },
          { key: "premium", label: "Premium", req: "Score ≥ 80 · 5+ missions" },
        ] as const).map((t, i) => {
          const active = tester.tier === t.key;
          const reached = (
            t.key === "standard" ||
            (t.key === "expert" && (tester.tier === "expert" || tester.tier === "premium")) ||
            (t.key === "premium" && tester.tier === "premium")
          );
          return (
            <div key={t.key} style={{
              padding: "16px 12px", textAlign: "center",
              background: active ? "#f0faf5" : "#fff",
              borderRight: i < 2 ? "0.5px solid rgba(0,0,0,0.06)" : undefined,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", margin: "0 auto 8px",
                background: reached ? "#0A7A5A" : "#e5e5ea",
                color: reached ? "#fff" : "#86868b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
              }}>
                {reached ? "✓" : (i + 1)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#0A7A5A" : "#1d1d1f" }}>
                {t.label}
              </div>
              <div style={{ fontSize: 10, color: "#86868b", marginTop: 2 }}>
                {t.req}
              </div>
            </div>
          );
        })}
      </div>

      {/* Informations personnelles */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 16px" }}>Informations personnelles</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Prénom</label>
            <input style={inputStyle} value={val("first_name") as string} onChange={(e) => update("first_name", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Nom</label>
            <input style={inputStyle} value={val("last_name") as string} onChange={(e) => update("last_name", e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Date de naissance</label>
          <input style={inputStyle} value={birthDisplay} onChange={handleBirthChange} placeholder="JJ/MM/AAAA" inputMode="numeric" maxLength={10} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Adresse</label>
          <input style={inputStyle} placeholder="12 rue de la Paix" value={val("address") as string} onChange={(e) => update("address", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Code postal</label>
            <input style={inputStyle} placeholder="75000" value={val("postal_code") as string} onChange={(e) => update("postal_code", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Ville</label>
            <input style={inputStyle} placeholder="Paris" value={val("city") as string} onChange={(e) => update("city", e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Téléphone</label>
          <input style={inputStyle} value={val("phone") as string} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>LinkedIn</label>
          <input style={inputStyle} value={val("linkedin_url") as string} onChange={(e) => update("linkedin_url", e.target.value)} />
        </div>
        <button onClick={() => saveSection("personal", ["first_name", "last_name", "birth_date", "address", "postal_code", "city", "phone", "linkedin_url"])} disabled={saving === "personal"} style={{
          padding: "10px 24px", fontSize: 14, fontWeight: 700, background: "#0A7A5A", color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit", opacity: saving === "personal" ? 0.7 : 1, transition: "all 200ms",
        }}>
          {saving === "personal" ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

      {/* Profil professionnel */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 16px" }}>Profil professionnel</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Intitulé de poste</label>
          <input style={inputStyle} value={val("job_title") as string} onChange={(e) => update("job_title", e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Secteur</label>
          <select style={{ ...inputStyle, appearance: "none" as const }} value={val("sector") as string} onChange={(e) => update("sector", e.target.value)}>
            <option value="">Sélectionnez</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Taille entreprise</label>
          <select style={{ ...inputStyle, appearance: "none" as const }} value={val("company_size") as string} onChange={(e) => update("company_size", e.target.value)}>
            <option value="">Sélectionnez</option>
            {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} employés</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Niveau digital</label>
          <PillSelect
            options={["Débutant", "Intermédiaire", "Avancé", "Expert"]}
            value={({ debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé", expert: "Expert" } as Record<string, string>)[val("digital_level") as string] || ""}
            onChange={(v) => {
              const map: Record<string, DigitalLevel> = { "Débutant": "debutant", "Intermédiaire": "intermediaire", "Avancé": "avance", "Expert": "expert" };
              update("digital_level", map[v as string] || null);
            }}
          />
        </div>
        <button onClick={() => saveSection("pro", ["job_title", "sector", "company_size", "digital_level"])} disabled={saving === "pro"} style={{
          padding: "10px 24px", fontSize: 14, fontWeight: 700, background: "#0A7A5A", color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit", opacity: saving === "pro" ? 0.7 : 1, transition: "all 200ms",
        }}>
          {saving === "pro" ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

      {/* Configuration technique */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 16px" }}>Configuration technique</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Navigateurs</label>
          <PillSelect options={BROWSERS} value={arrVal("browsers")} onChange={(v) => update("browsers", v)} multiple />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Appareils</label>
          <PillSelect options={DEVICES} value={arrVal("devices")} onChange={(v) => update("devices", v)} multiple />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Modèle téléphone</label>
          <input style={inputStyle} value={val("phone_model") as string} onChange={(e) => update("phone_model", e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Système mobile</label>
          <PillSelect options={["iOS", "Android", "HarmonyOS", "Autre", "Aucun smartphone"]} value={val("mobile_os") as string} onChange={(v) => update("mobile_os", v as MobileOS)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Connexion</label>
          <PillSelect options={["Fibre", "ADSL", "4G/5G"]} value={val("connection") as string} onChange={(v) => update("connection", v as ConnectionType)} />
        </div>
        <button onClick={() => saveSection("tech", ["browsers", "devices", "phone_model", "mobile_os", "connection"])} disabled={saving === "tech"} style={{
          padding: "10px 24px", fontSize: 14, fontWeight: 700, background: "#0A7A5A", color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit", opacity: saving === "tech" ? 0.7 : 1, transition: "all 200ms",
        }}>
          {saving === "tech" ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

      {/* Disponibilités */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", margin: "0 0 16px" }}>Disponibilités</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Tests par mois</label>
          <PillSelect options={["1-2 / mois", "3-5 / mois", "+5 / mois"]} value={({ "1-2": "1-2 / mois", "3-5": "3-5 / mois", "5+": "+5 / mois" } as Record<string, string>)[val("availability") as string] || ""} onChange={(v) => {
            const map: Record<string, Availability> = { "1-2 / mois": "1-2", "3-5 / mois": "3-5", "+5 / mois": "5+" };
            update("availability", map[v as string] || null);
          }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Créneaux</label>
          <PillSelect options={TIMESLOTS} value={arrVal("timeslots")} onChange={(v) => update("timeslots", v)} multiple />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Intérêts</label>
          <PillSelect options={INTERESTS} value={arrVal("interests")} onChange={(v) => update("interests", v)} multiple />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Expérience UX</label>
          <PillSelect options={["Jamais", "Quelquefois", "Régulièrement"]} value={val("ux_experience") as string} onChange={(v) => update("ux_experience", v as UxExperience)} />
        </div>
        <button onClick={() => saveSection("avail", ["availability", "timeslots", "interests", "ux_experience"])} disabled={saving === "avail"} style={{
          padding: "10px 24px", fontSize: 14, fontWeight: 700, background: "#0A7A5A", color: "#fff", border: "none", borderRadius: 980, cursor: "pointer", fontFamily: "inherit", opacity: saving === "avail" ? 0.7 : 1, transition: "all 200ms",
        }}>
          {saving === "avail" ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

      {/* Finance — IBAN + signature CGU */}
      <PaymentInfoSection />

      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}
