"use client";

import { useState, useCallback } from "react";
import type { Tester } from "@/types/tester";

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

interface Step1Props {
  data: Partial<Tester>;
  onNext: (data: Partial<Tester>) => void;
  loading: boolean;
}

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
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#1d1d1f",
  marginBottom: 6,
};

export default function Step1Personal({ data, onNext, loading }: Step1Props) {
  const [firstName, setFirstName] = useState(data.first_name || "");
  const [lastName, setLastName] = useState(data.last_name || "");
  const [phone, setPhone] = useState(data.phone || "");
  const [birthDisplay, setBirthDisplay] = useState(isoToDisplay(data.birth_date || ""));
  const handleBirthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBirthDisplay(prev => formatBirthInput(e.target.value, prev));
  }, []);
  const [address, setAddress] = useState(data.address || "");
  const [city, setCity] = useState(data.city || "");
  const [postalCode, setPostalCode] = useState(data.postal_code || "");
  const [linkedin, setLinkedin] = useState(data.linkedin_url || "");
  const [gender, setGender] = useState(data.gender || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Champs requis pour le trigger DB auto_activate_tester (cf. lib/profile-completeness).
  // Tant qu'un seul est vide, le testeur ne peut pas etre active.
  const isoBirth = displayToIso(birthDisplay);
  const allRequiredFilled =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    phone.trim() !== "" &&
    isoBirth !== "" &&
    address.trim() !== "" &&
    postalCode.trim() !== "" &&
    city.trim() !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.first_name = "Prénom obligatoire";
    if (!lastName.trim()) errs.last_name = "Nom obligatoire";
    if (!phone.trim()) errs.phone = "Téléphone obligatoire";
    if (!isoBirth) errs.birth_date = "Date de naissance obligatoire (JJ/MM/AAAA)";
    if (!address.trim()) errs.address = "Adresse obligatoire";
    if (!postalCode.trim()) errs.postal_code = "Code postal obligatoire";
    if (!city.trim()) errs.city = "Ville obligatoire";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onNext({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      birth_date: isoBirth,
      address: address.trim(),
      city: city.trim(),
      postal_code: postalCode.trim(),
      linkedin_url: linkedin.trim() || null,
      gender: (gender as Tester["gender"]) || null,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Prénom *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.first_name ? "#e53e3e" : undefined }}
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, first_name: "" })); }}
            placeholder="Marie"
          />
          {errors.first_name && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.first_name}</span>}
        </div>
        <div>
          <label style={labelStyle}>Nom *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.last_name ? "#e53e3e" : undefined }}
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, last_name: "" })); }}
            placeholder="Dupont"
          />
          {errors.last_name && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.last_name}</span>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Téléphone *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.phone ? "#e53e3e" : undefined }}
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: "" })); }}
            placeholder="06 12 34 56 78"
          />
          {errors.phone && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.phone}</span>}
        </div>
        <div>
          <label style={labelStyle}>Date de naissance *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.birth_date ? "#e53e3e" : undefined }}
            value={birthDisplay}
            onChange={(e) => { handleBirthChange(e); setErrors((p) => ({ ...p, birth_date: "" })); }}
            placeholder="JJ/MM/AAAA"
            inputMode="numeric"
            maxLength={10}
          />
          {errors.birth_date && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.birth_date}</span>}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Genre <span style={{ color: "#86868B", fontWeight: 400 }}>(optionnel)</span></label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer", color: gender ? "#1d1d1f" : "#86868B" }}
        >
          <option value="">Je ne souhaite pas répondre</option>
          <option value="female">Femme</option>
          <option value="male">Homme</option>
          <option value="non_binary">Non-binaire</option>
          <option value="prefer_not_to_say">Préfère ne pas répondre</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Adresse *</label>
        <input
          style={{ ...inputStyle, borderColor: errors.address ? "#e53e3e" : undefined }}
          value={address}
          onChange={(e) => { setAddress(e.target.value); setErrors((p) => ({ ...p, address: "" })); }}
          placeholder="12 rue de la Paix"
        />
        {errors.address && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.address}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Code postal *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.postal_code ? "#e53e3e" : undefined }}
            value={postalCode}
            onChange={(e) => { setPostalCode(e.target.value); setErrors((p) => ({ ...p, postal_code: "" })); }}
            placeholder="75001"
          />
          {errors.postal_code && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.postal_code}</span>}
        </div>
        <div>
          <label style={labelStyle}>Ville *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.city ? "#e53e3e" : undefined }}
            value={city}
            onChange={(e) => { setCity(e.target.value); setErrors((p) => ({ ...p, city: "" })); }}
            placeholder="Paris"
          />
          {errors.city && <span style={{ fontSize: 12, color: "#e53e3e" }}>{errors.city}</span>}
        </div>
      </div>
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>LinkedIn <span style={{ color: "#86868B", fontWeight: 400 }}>(optionnel)</span></label>
        <input style={inputStyle} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
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
