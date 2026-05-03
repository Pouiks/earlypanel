"use client";

import { useState } from "react";
import type { Tester, DigitalLevel } from "@/types/tester";
import PillSelect from "@/components/ui/PillSelect";
import JobTitleInput from "@/components/ui/JobTitleInput";
import { SECTORS, CSPS } from "@/lib/taxonomy";

interface Step2Props {
  data: Partial<Tester> & { csp?: string | null };
  onNext: (data: Partial<Tester> & { csp?: string | null }) => void;
  loading: boolean;
}

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

const DIGITAL_LEVELS: { value: DigitalLevel; label: string }[] = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
  { value: "expert", label: "Expert" },
];

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
  transition: "border-color 200ms",
  appearance: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#1d1d1f",
  marginBottom: 6,
};

export default function Step2Professional({ data, onNext, loading }: Step2Props) {
  const [jobTitle, setJobTitle] = useState(data.job_title || "");
  const [sector, setSector] = useState(data.sector || "");
  const [companySize, setCompanySize] = useState(data.company_size || "");
  const [digitalLevel, setDigitalLevel] = useState<string>(data.digital_level || "");
  const [csp, setCsp] = useState<string>(data.csp || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Champs requis pour activation (cf. lib/profile-completeness).
  const allRequiredFilled =
    jobTitle.trim() !== "" &&
    sector !== "" &&
    companySize !== "" &&
    digitalLevel !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!jobTitle.trim()) errs.job_title = "Intitulé de poste obligatoire";
    if (!sector) errs.sector = "Secteur obligatoire";
    if (!companySize) errs.company_size = "Taille d'entreprise obligatoire";
    if (!digitalLevel) errs.digital_level = "Niveau digital obligatoire";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onNext({
      job_title: jobTitle.trim(),
      sector,
      company_size: companySize,
      digital_level: digitalLevel as DigitalLevel,
      csp: csp || null,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Intitulé de poste *</label>
        <JobTitleInput
          value={jobTitle}
          onChange={(v) => { setJobTitle(v); setErrors((p) => ({ ...p, job_title: "" })); }}
          style={{ ...inputStyle, borderColor: errors.job_title ? "#e53e3e" : undefined }}
        />
        {errors.job_title && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.job_title}</span>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Secteur d&apos;activité *</label>
        <select
          style={{ ...inputStyle, borderColor: errors.sector ? "#e53e3e" : undefined, color: sector ? "#1d1d1f" : "#86868B" }}
          value={sector}
          onChange={(e) => { setSector(e.target.value); setErrors((p) => ({ ...p, sector: "" })); }}
        >
          <option value="">Sélectionnez votre secteur</option>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {errors.sector && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.sector}</span>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Taille de l&apos;entreprise *</label>
        <select
          style={{
            ...inputStyle,
            color: companySize ? "#1d1d1f" : "#86868B",
            borderColor: errors.company_size ? "#e53e3e" : undefined,
          }}
          value={companySize}
          onChange={(e) => { setCompanySize(e.target.value); setErrors((p) => ({ ...p, company_size: "" })); }}
        >
          <option value="">Sélectionnez</option>
          {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} employés</option>)}
        </select>
        {errors.company_size && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.company_size}</span>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Niveau digital *</label>
        <PillSelect
          options={DIGITAL_LEVELS.map((d) => d.label)}
          value={DIGITAL_LEVELS.find((d) => d.value === digitalLevel)?.label || ""}
          onChange={(v) => {
            const match = DIGITAL_LEVELS.find((d) => d.label === v);
            setDigitalLevel(match?.value || "");
            setErrors((p) => ({ ...p, digital_level: "" }));
          }}
        />
        {errors.digital_level && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.digital_level}</span>}
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Catégorie socio-professionnelle <span style={{ fontSize: 11, fontWeight: 400, color: "#86868B" }}>(optionnel)</span></label>
        <PillSelect
          options={CSPS as unknown as string[]}
          value={csp}
          onChange={(v) => setCsp(typeof v === "string" ? (v === csp ? "" : v) : "")}
        />
        <p style={{ fontSize: 11, color: "#86868B", margin: "6px 0 0", lineHeight: 1.4 }}>
          Aide les clients à cibler les bons profils (étudiants, cadres, retraités…). Vous pouvez le modifier plus tard.
        </p>
      </div>

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
