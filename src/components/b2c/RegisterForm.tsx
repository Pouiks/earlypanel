"use client";
import { useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

// Listes alignees sur les composants d'onboarding (Step2Professional + Step5Availability)
// pour que les valeurs pre-remplies soient retrouvees dans les selects de l'onboarding.
const SECTORS = [
  "Tech / SaaS",
  "E-commerce",
  "Finance / Banque",
  "Assurance",
  "Santé",
  "RH / Recrutement",
  "Juridique",
  "Éducation",
  "Immobilier",
  "Transport / Logistique",
  "Industrie",
  "Autre",
] as const;

const DIGITAL_LEVELS_UI = ["Débutant", "Intermédiaire", "Avancé", "Expert"] as const;
type DigitalLevelUI = typeof DIGITAL_LEVELS_UI[number];

// Mapping label UI (avec accents) vers la valeur stockee en DB (CHECK constraint)
const DIGITAL_LEVEL_MAP: Record<DigitalLevelUI, "debutant" | "intermediaire" | "avance" | "expert"> = {
  "Débutant": "debutant",
  "Intermédiaire": "intermediaire",
  "Avancé": "avance",
  "Expert": "expert",
};

const AVAILABILITY_OPTIONS_UI = [
  "1 à 2 missions par mois",
  "3 à 5 missions par mois",
  "+ de 5 missions par mois",
] as const;
type AvailabilityUI = typeof AVAILABILITY_OPTIONS_UI[number];

const AVAILABILITY_MAP: Record<AvailabilityUI, "1-2" | "3-5" | "5+"> = {
  "1 à 2 missions par mois": "1-2",
  "3 à 5 missions par mois": "3-5",
  "+ de 5 missions par mois": "5+",
};

export default function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sector, setSector] = useState<string>("");
  const [digitalLevel, setDigitalLevel] = useState<DigitalLevelUI>("Intermédiaire");
  const [devices, setDevices] = useState<string[]>(["Ordinateur", "Smartphone"]);
  const [availability, setAvailability] = useState<AvailabilityUI>("1 à 2 missions par mois");
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [mockMode, setMockMode] = useState(false);

  function selectDigital(level: DigitalLevelUI) {
    setDigitalLevel(level);
  }

  function toggleDevice(device: string) {
    setDevices((prev) =>
      prev.includes(device) ? prev.filter((d) => d !== device) : [...prev, device]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setFormState("loading");
    setErrorMsg("");

    try {
      // Pre-remplissage : on envoie au backend les champs collectes sur la
      // landing pour que l'onboarding demarre avec ces valeurs deja connues.
      // Devices "Ordinateur/Smartphone/Tablette" ne sont PAS envoyes : la
      // granularite landing est trop large pour le CHECK DB. L'utilisateur
      // les saisira en step 4 onboarding (PC Windows, Mac, iPhone, ...).
      const res = await fetch("/api/testers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          sector: sector || undefined,
          digital_level: DIGITAL_LEVEL_MAP[digitalLevel],
          availability: AVAILABILITY_MAP[availability],
          // Devices generiques landing → on les passe en metadata informelle,
          // pas en DB (le user precisera en step 4).
          landing_devices_hint: devices,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      setMockMode(data?.mock === true);
      setFormState("success");
    } catch (err) {
      setFormState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    }
  }

  if (formState === "success") {
    return (
      <div className="register-form" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          animation: "rise .4s ease",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h3 style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--black)",
          letterSpacing: "-0.04em",
          margin: "0 0 6px",
        }}>
          {mockMode ? "Mode demo activé" : "Vous y êtes presque !"}
        </h3>

        <p style={{
          fontSize: 14,
          color: "var(--gray)",
          lineHeight: 1.6,
          margin: "0 0 20px",
        }}>
          {mockMode ? (
            <>L&apos;inscription a été simulée pour {email}. Aucun email n&apos;a été envoyé (mode développement).</>
          ) : (
            <>
              Un lien de connexion a été envoyé à
              <br />
              <span style={{
                display: "inline-block",
                marginTop: 6,
                padding: "6px 16px",
                background: "var(--green-bg)",
                color: "var(--green)",
                borderRadius: "var(--pill)",
                fontSize: 13,
                fontWeight: 600,
              }}>
                {email}
              </span>
            </>
          )}
        </p>

        {!mockMode && (
          <div style={{
            background: "#f5f5f7",
            borderRadius: 12,
            padding: "16px 20px",
            textAlign: "left",
            marginBottom: 20,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--black)", margin: "0 0 10px" }}>
              Prochaines étapes :
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { num: "1", text: "Ouvrez votre boîte mail" },
                { num: "2", text: "Cliquez sur le lien de connexion" },
                { num: "3", text: "Complétez votre profil en 5 min" },
              ].map((step) => (
                <div key={step.num} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--green)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {step.num}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--black)" }}>{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: "var(--gray-light)", margin: 0, lineHeight: 1.5 }}>
          {mockMode ? "" : <>Vous n&apos;avez pas reçu l&apos;email ? Vérifiez vos spams ou{" "}</>}
          <button
            type="button"
            onClick={() => { setFormState("idle"); setEmail(""); setMockMode(false); }}
            style={{
              background: "none",
              border: "none",
              color: "var(--green)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "inherit",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {mockMode ? "Recommencer" : "réessayez avec un autre email"}
          </button>
        </p>
      </div>
    );
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <h3>Créer mon profil testeur</h3>
      <p className="form-sub">Inscription gratuite · 5 minutes</p>
      <div className="form-2col">
        <div className="form-row"><label>Prénom</label><input type="text" placeholder="Marie" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
        <div className="form-row"><label>Nom</label><input type="text" placeholder="Dupont" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
      </div>
      <div className="form-row">
        <label>Email *</label>
        <input
          type="email"
          placeholder="marie@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="form-row">
        <label>Secteur d&apos;activité</label>
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">— Sélectionner</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label>Aisance digitale</label>
        <div className="form-pills">
          {DIGITAL_LEVELS_UI.map((level) => (
            <button
              key={level}
              type="button"
              className={`form-pill${digitalLevel === level ? " active" : ""}`}
              onClick={() => selectDigital(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <label>Appareils disponibles</label>
        <div className="form-pills">
          {["Ordinateur", "Smartphone", "Tablette"].map((device) => (
            <button
              key={device}
              type="button"
              className={`form-pill${devices.includes(device) ? " active" : ""}`}
              onClick={() => toggleDevice(device)}
            >
              {device}
            </button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <label>Disponibilités</label>
        <select value={availability} onChange={(e) => setAvailability(e.target.value as AvailabilityUI)}>
          {AVAILABILITY_OPTIONS_UI.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {errorMsg && (
        <p style={{ color: "#e53e3e", fontSize: 13, margin: "8px 0" }}>{errorMsg}</p>
      )}

      <button
        type="submit"
        className="form-submit-b2c"
        disabled={formState === "loading"}
        style={formState === "loading" ? { opacity: 0.7, cursor: "wait" } : undefined}
      >
        {formState === "loading" ? "Inscription en cours…" : "Créer mon profil →"}
      </button>
      <p className="form-note">En créant votre profil, vous acceptez nos CGU testeurs. Vos données sont protégées conformément au RGPD.</p>
    </form>
  );
}
