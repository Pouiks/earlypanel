"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import PillSelect from "@/components/ui/PillSelect";
import type { Project, ProjectQuestion } from "@/types/staff";

interface ProjectFormProps {
  initialData?: Project & { client_id?: string | null };
  initialClientId?: string | null;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  submitLabel?: string;
}

export interface ProjectFormData {
  title: string;
  description: string;
  company_name: string;
  sector: string;
  start_date: string;
  end_date: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone: string;
  urls: string[];
  questions: { question_text: string }[];
  target_gender: string[];
  target_age_min: number | null;
  target_age_max: number | null;
  target_csp: string[];
  target_sector: string;
  target_sector_restricted: boolean;
  target_locations: string[];
  status?: string;
  /** Montant de base affiché en euros dans le formulaire ; envoyé en centimes par le parent */
  base_reward_cents?: number | null;
  client_id?: string | null;
}

interface ClientLite {
  id: string;
  company_name: string;
  sector: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

const GENDERS = ["Homme", "Femme", "Autre"];

const CSP_OPTIONS = [
  "Agriculteurs",
  "Artisans / Commerçants",
  "Cadres / Prof. intellectuelles",
  "Professions intermédiaires",
  "Employés",
  "Ouvriers",
  "Retraités",
  "Étudiants",
  "Sans activité",
];

const SECTOR_OPTIONS = [
  "Tech / IT",
  "Finance / Banque",
  "Santé",
  "Commerce / Retail",
  "Éducation",
  "Industrie",
  "Transport / Logistique",
  "Immobilier",
  "Médias / Communication",
  "Juridique",
  "Alimentation",
  "Tourisme / Hôtellerie",
  "Énergie",
  "Autre",
];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#1d1d1f",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 14,
  border: "0.5px solid rgba(0,0,0,0.12)",
  borderRadius: 10,
  outline: "none",
  background: "#f5f5f7",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 200ms",
};

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: "0.5px solid rgba(0,0,0,0.08)",
  padding: "28px 28px 20px",
  marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: "#1d1d1f",
  letterSpacing: "-0.03em",
  marginBottom: 20,
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}

/** Valeurs par défaut : début = hier 9h, fin = dans 2 jours 18h (heure locale). */
function defaultStartDatetimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultEndDatetimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(18, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ProjectForm({ initialData, initialClientId, onSubmit, submitLabel = "Créer le projet" }: ProjectFormProps) {
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState<string | null>(initialData?.client_id ?? initialClientId ?? null);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [companyName, setCompanyName] = useState(initialData?.company_name ?? "");
  const [sector, setSector] = useState(initialData?.sector ?? "");
  const [contactFirstName, setContactFirstName] = useState(initialData?.contact_first_name ?? "");
  const [contactLastName, setContactLastName] = useState(initialData?.contact_last_name ?? "");
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(initialData?.contact_phone ?? "");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staff/clients?status=active")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        setClients(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setClientsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function applyClient(c: ClientLite | null) {
    setClientId(c?.id ?? null);
    if (!c) return;
    if (!companyName) setCompanyName(c.company_name);
    if (!sector && c.sector) setSector(c.sector);
    if (!contactFirstName && c.contact_first_name) setContactFirstName(c.contact_first_name);
    if (!contactLastName && c.contact_last_name) setContactLastName(c.contact_last_name);
    if (!contactEmail && c.contact_email) setContactEmail(c.contact_email);
    if (!contactPhone && c.contact_phone) setContactPhone(c.contact_phone);
  }

  useEffect(() => {
    if (!initialClientId || clients.length === 0) return;
    const c = clients.find((x) => x.id === initialClientId);
    if (c) applyClient(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, initialClientId]);
  const [startDate, setStartDate] = useState(() =>
    initialData?.start_date ? toDatetimeLocal(initialData.start_date) : defaultStartDatetimeLocal()
  );
  const [endDate, setEndDate] = useState(() =>
    initialData?.end_date ? toDatetimeLocal(initialData.end_date) : defaultEndDatetimeLocal()
  );
  const [dateError, setDateError] = useState<string | null>(null);
  const [baseRewardEuros, setBaseRewardEuros] = useState(
    initialData?.base_reward_cents != null && initialData.base_reward_cents > 0
      ? String(initialData.base_reward_cents / 100)
      : ""
  );

  const [urls, setUrls] = useState<string[]>(initialData?.urls?.length ? initialData.urls : [""]);

  const initQuestions = initialData?.questions?.length
    ? initialData.questions.map((q: ProjectQuestion) => q.question_text)
    : [""];
  const [questions, setQuestions] = useState<string[]>(initQuestions);

  const [targetGender, setTargetGender] = useState<string[]>(initialData?.target_gender ?? []);
  const [targetAgeMin, setTargetAgeMin] = useState(initialData?.target_age_min?.toString() ?? "");
  const [targetAgeMax, setTargetAgeMax] = useState(initialData?.target_age_max?.toString() ?? "");
  const [targetCsp, setTargetCsp] = useState<string[]>(initialData?.target_csp ?? []);
  const [targetSectorRestricted, setTargetSectorRestricted] = useState(initialData?.target_sector_restricted ?? false);
  const [targetSector, setTargetSector] = useState(initialData?.target_sector ?? "");
  const [targetLocations, setTargetLocations] = useState<string[]>(initialData?.target_locations ?? []);
  const [locationInput, setLocationInput] = useState("");

  function addUrl() { setUrls([...urls, ""]); }
  function removeUrl(i: number) { setUrls(urls.filter((_, idx) => idx !== i)); }
  function updateUrl(i: number, val: string) {
    const next = [...urls];
    next[i] = val;
    setUrls(next);
  }

  function addQuestion() { setQuestions([...questions, ""]); }
  function removeQuestion(i: number) { setQuestions(questions.filter((_, idx) => idx !== i)); }
  function updateQuestion(i: number, val: string) {
    const next = [...questions];
    next[i] = val;
    setQuestions(next);
  }

  function addLocation() {
    const trimmed = locationInput.trim();
    if (trimmed && !targetLocations.includes(trimmed)) {
      setTargetLocations([...targetLocations, trimmed]);
    }
    setLocationInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setDateError(null);
    if (!startDate.trim() || !endDate.trim()) {
      setDateError("La date de début et la date de fin sont obligatoires.");
      return;
    }
    const startIso = fromDatetimeLocal(startDate);
    const endIso = fromDatetimeLocal(endDate);
    if (!startIso || !endIso) {
      setDateError("Dates invalides.");
      return;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      setDateError("La fin de campagne doit être strictement après le début.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description,
        company_name: companyName.trim(),
        sector,
        start_date: startIso,
        end_date: endIso,
        base_reward_cents: baseRewardEuros.trim()
          ? Math.round(parseFloat(baseRewardEuros.replace(",", ".")) * 100)
          : null,
        contact_first_name: contactFirstName.trim(),
        contact_last_name: contactLastName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        urls: urls.filter((u) => u.trim()),
        questions: questions.filter((q) => q.trim()).map((q) => ({ question_text: q.trim() })),
        target_gender: targetGender,
        target_age_min: targetAgeMin ? parseInt(targetAgeMin) : null,
        target_age_max: targetAgeMax ? parseInt(targetAgeMax) : null,
        target_csp: targetCsp,
        target_sector: targetSectorRestricted ? targetSector : "",
        target_sector_restricted: targetSectorRestricted,
        target_locations: targetLocations,
        client_id: clientId,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* SECTION: Informations projet */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Informations du projet</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Titre du projet *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Test UX application mobile bancaire"
            required
            style={inputStyle}
            onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Description</label>
          <RichTextEditor content={description} onChange={setDescription} />
        </div>

        {dateError && (
          <div style={{
            marginBottom: 12, padding: "10px 14px", borderRadius: 10,
            background: "#fef2f2", color: "#b91c1c", fontSize: 13,
          }}>
            {dateError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Date et heure de début (campagne) *</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
            <p style={{ fontSize: 11, color: "#86868b", margin: "6px 0 0" }}>
              Par défaut : hier à 9h — modifiable.
            </p>
          </div>
          <div>
            <label style={labelStyle}>Date et heure de fin (campagne) *</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
            <p style={{ fontSize: 11, color: "#86868b", margin: "6px 0 0" }}>
              Par défaut : dans 2 jours à 18h — modifiable.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Rémunération de base (€ HT par testeur)</label>
          <input
            type="text"
            inputMode="decimal"
            value={baseRewardEuros}
            onChange={(e) => setBaseRewardEuros(e.target.value)}
            placeholder="Ex : 20"
            style={{ ...inputStyle, maxWidth: 200 }}
            onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
          />
          <p style={{ fontSize: 12, color: "#86868b", margin: "8px 0 0" }}>
            Sert au calcul automatique du versement après notation (ajustable dans l&apos;onglet Versements).
          </p>
        </div>
      </div>

      {/* SECTION: Client */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Client</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Rattacher à un client B2B existant</label>
          <select
            value={clientId ?? ""}
            onChange={(e) => {
              const next = e.target.value || null;
              if (!next) { setClientId(null); return; }
              const c = clients.find((x) => x.id === next) ?? null;
              applyClient(c);
            }}
            style={{ ...inputStyle, cursor: "pointer" }}
            disabled={clientsLoading}
          >
            <option value="">— Aucun (saisie libre ci-dessous) —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 11, color: "#86868b", margin: "6px 0 0" }}>
            Sélectionner un client pré-remplit les champs vides ci-dessous et conserve le lien pour l&apos;historique.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Nom de la société</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex : BNP Paribas"
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>
          <div>
            <label style={labelStyle}>Secteur d&apos;activité</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Sélectionner…</option>
              {SECTOR_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Prénom du contact</label>
            <input
              type="text"
              value={contactFirstName}
              onChange={(e) => setContactFirstName(e.target.value)}
              placeholder="Prénom"
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>
          <div>
            <label style={labelStyle}>Nom du contact</label>
            <input
              type="text"
              value={contactLastName}
              onChange={(e) => setContactLastName(e.target.value)}
              placeholder="Nom"
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Email du contact</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@entreprise.com"
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>
          <div>
            <label style={labelStyle}>Téléphone du contact</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="06 00 00 00 00"
              style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>
        </div>
      </div>

      {/* SECTION: URLs à tester */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>URLs à tester</h2>
        {urls.map((url, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="url"
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
              placeholder="https://exemple.com"
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
            {urls.length > 1 && (
              <button
                type="button"
                onClick={() => removeUrl(i)}
                style={{
                  padding: "0 14px",
                  fontSize: 18,
                  color: "#e53e3e",
                  background: "#fef2f2",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addUrl}
          style={{
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 600,
            color: "#0A7A5A",
            background: "#f0faf5",
            border: "1.5px solid #0A7A5A",
            borderRadius: 980,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 200ms",
          }}
        >
          + Ajouter une URL
        </button>
      </div>

      {/* SECTION: Questions */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Questions du test</h2>
        {questions.map((q, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
            <span style={{
              minWidth: 28,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#0A7A5A",
              background: "#f0faf5",
              borderRadius: 8,
            }}>
              {i + 1}
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => updateQuestion(i, e.target.value)}
              placeholder={`Question ${i + 1}`}
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => removeQuestion(i)}
                style={{
                  padding: "0 14px",
                  fontSize: 18,
                  color: "#e53e3e",
                  background: "#fef2f2",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 150ms",
                  height: 38,
                }}
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addQuestion}
          style={{
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 600,
            color: "#0A7A5A",
            background: "#f0faf5",
            border: "1.5px solid #0A7A5A",
            borderRadius: 980,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 200ms",
          }}
        >
          + Ajouter une question
        </button>
      </div>

      {/* SECTION: Ciblage */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Ciblage</h2>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Genre</label>
          <PillSelect options={GENDERS} value={targetGender} onChange={(v) => setTargetGender(v as string[])} multiple />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Tranche d&apos;âge</label>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              type="number"
              min={0}
              max={120}
              value={targetAgeMin}
              onChange={(e) => setTargetAgeMin(e.target.value)}
              placeholder="Min"
              style={{ ...inputStyle, width: 100 }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
            <span style={{ fontSize: 14, color: "#86868B" }}>à</span>
            <input
              type="number"
              min={0}
              max={120}
              value={targetAgeMax}
              onChange={(e) => setTargetAgeMax(e.target.value)}
              placeholder="Max"
              style={{ ...inputStyle, width: 100 }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
            <span style={{ fontSize: 13, color: "#86868B" }}>ans</span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Catégorie socio-professionnelle</label>
          <PillSelect options={CSP_OPTIONS} value={targetCsp} onChange={(v) => setTargetCsp(v as string[])} multiple />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={targetSectorRestricted}
              onChange={(e) => setTargetSectorRestricted(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#0A7A5A" }}
            />
            Restreindre à un domaine d&apos;activité
          </label>
          {targetSectorRestricted && (
            <input
              type="text"
              value={targetSector}
              onChange={(e) => setTargetSector(e.target.value)}
              placeholder="Ex : Banque, Tech, Santé…"
              style={{ ...inputStyle, marginTop: 8 }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          )}
        </div>

        <div>
          <label style={labelStyle}>Lieux ciblés</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Ville ou région…"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLocation();
                }
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#0A7A5A"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"}
            />
            <button
              type="button"
              onClick={addLocation}
              style={{
                padding: "0 18px",
                fontSize: 13,
                fontWeight: 600,
                color: "#0A7A5A",
                background: "#f0faf5",
                border: "1.5px solid #0A7A5A",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Ajouter
            </button>
          </div>
          {targetLocations.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {targetLocations.map((loc) => (
                <span
                  key={loc}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    fontSize: 13,
                    background: "#f0faf5",
                    color: "#0A7A5A",
                    borderRadius: 980,
                    fontWeight: 500,
                    border: "1px solid rgba(10,122,90,0.2)",
                  }}
                >
                  {loc}
                  <button
                    type="button"
                    onClick={() => setTargetLocations(targetLocations.filter((l) => l !== loc))}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#0A7A5A",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: 700,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8, marginBottom: 40 }}>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          style={{
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            background: "#0A7A5A",
            border: "none",
            borderRadius: 980,
            cursor: saving ? "wait" : "pointer",
            opacity: saving || !title.trim() ? 0.6 : 1,
            fontFamily: "inherit",
            transition: "all 200ms",
          }}
        >
          {saving ? "Enregistrement…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
