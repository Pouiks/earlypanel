"use client";

import { useState } from "react";
import type { Tester, Availability, UxExperience } from "@/types/tester";
import PillSelect from "@/components/ui/PillSelect";

interface Step5Props {
  data: Partial<Tester>;
  onNext: (data: Partial<Tester>) => void;
  loading: boolean;
}

const AVAILABILITIES: { value: Availability; label: string }[] = [
  { value: "1-2", label: "1 à 2 fois par mois" },
  { value: "3-5", label: "3 à 5 fois par mois" },
  { value: "5+", label: "Plus de 5 fois par mois" },
];

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const INTERESTS = [
  "Sites web", "Applications mobiles", "Logiciels professionnels",
  "E-commerce / shopping", "Banque / finance", "Santé",
  "Éducation", "Réseaux sociaux", "Jeux vidéo", "Autre",
];

const UX_OPTIONS: { value: UxExperience; label: string; desc: string }[] = [
  { value: "Jamais", label: "C'est nouveau pour moi", desc: "Je n'ai jamais testé un produit pour donner mon avis" },
  { value: "Quelquefois", label: "Déjà fait 1 ou 2 fois", desc: "J'ai déjà donné mon avis sur un site ou une app" },
  { value: "Régulièrement", label: "J'en fais souvent", desc: "Je teste régulièrement des produits numériques" },
];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#1d1d1f",
  marginBottom: 4,
};

const hintStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#86868B",
  marginBottom: 10,
};

export default function Step5Availability({ data, onNext, loading }: Step5Props) {
  const [availability, setAvailability] = useState<string>(data.availability || "");
  const [timeslots, setTimeslots] = useState<string[]>(data.timeslots || []);
  const [interests, setInterests] = useState<string[]>(data.interests || []);
  const [uxExperience, setUxExperience] = useState<string>(data.ux_experience || "");
  const [gdprAccepted, setGdprAccepted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gdprAccepted) return;
    onNext({
      availability: (availability as Availability) || null,
      timeslots,
      interests,
      ux_experience: (uxExperience as UxExperience) || null,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Combien de tests pourriez-vous faire ?</label>
        <span style={hintStyle}>Un test dure en moyenne 20 à 30 minutes</span>
        <PillSelect
          options={AVAILABILITIES.map((a) => a.label)}
          value={AVAILABILITIES.find((a) => a.value === availability)?.label || ""}
          onChange={(v) => {
            const match = AVAILABILITIES.find((a) => a.label === v);
            setAvailability(match?.value || "");
          }}
        />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Quels jours êtes-vous généralement disponible ?</label>
        <span style={hintStyle}>Vous aurez toujours 3 jours pour compléter un test</span>
        <PillSelect options={DAYS} value={timeslots} onChange={(v) => setTimeslots(v as string[])} multiple />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Quels types de produits vous intéressent ?</label>
        <span style={hintStyle}>On vous proposera des tests en lien avec vos centres d&apos;intérêt</span>
        <PillSelect options={INTERESTS} value={interests} onChange={(v) => setInterests(v as string[])} multiple />
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Avez-vous déjà testé un site ou une app pour donner votre avis ?</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {UX_OPTIONS.map((opt) => {
            const isSelected = uxExperience === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUxExperience(opt.value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: isSelected ? "1.5px solid #0A7A5A" : "1px solid rgba(0,0,0,0.1)",
                  background: isSelected ? "#f0faf5" : "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "all 200ms",
                  width: "100%",
                }}
              >
                <span style={{
                  fontSize: 14,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? "#0A7A5A" : "#1d1d1f",
                }}>
                  {isSelected && "✓ "}{opt.label}
                </span>
                <span style={{ fontSize: 12, color: "#86868B" }}>
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{
        background: "#f5f5f7",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}>
        <p style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#1d1d1f",
          margin: "0 0 8px",
        }}>
          Protection de vos données
        </p>
        <p style={{
          fontSize: 12,
          color: "#6e6e73",
          lineHeight: 1.6,
          margin: "0 0 12px",
        }}>
          Vos données sont stockées de manière sécurisée et utilisées uniquement pour vous proposer des missions de test adaptées à votre profil. Vous pouvez modifier ou supprimer vos données à tout moment depuis votre espace.
        </p>
        <label style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          cursor: "pointer",
          fontSize: 13,
          color: "#1d1d1f",
        }}>
          <input
            type="checkbox"
            checked={gdprAccepted}
            onChange={(e) => setGdprAccepted(e.target.checked)}
            style={{ marginTop: 2, accentColor: "#0A7A5A" }}
          />
          <span>J&apos;accepte les <a href="/cgu" style={{ color: "#0A7A5A" }}>CGU</a> et la <a href="/confidentialite" style={{ color: "#0A7A5A" }}>politique de confidentialité</a></span>
        </label>
      </div>

      <button type="submit" disabled={loading || !gdprAccepted} style={{
        width: "100%",
        padding: "14px",
        background: gdprAccepted ? "#0A7A5A" : "#ccc",
        color: "#fff",
        border: "none",
        borderRadius: 980,
        fontSize: 15,
        fontWeight: 700,
        cursor: loading || !gdprAccepted ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        transition: "all 200ms",
        fontFamily: "inherit",
      }}>
        {loading ? "Finalisation…" : "Finaliser mon profil →"}
      </button>
    </form>
  );
}
