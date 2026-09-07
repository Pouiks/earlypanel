"use client";
import { useState, type FormEvent } from "react";
import { PRICE_RANGE_LABEL } from "@/lib/cta-links";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Formulaire "Demarrer un projet" (/entreprises#brief).
 *
 * Budget : pas d'option « < 1 000 € » pour ne pas inviter des leads qu'on
 * refusera (plancher public 1 500 € HT).
 */
const PRODUCT_TYPES = ["SaaS B2B", "Application mobile", "Site e-commerce", "Site vitrine", "Maquette / POC", "Autre"];
const BUDGETS = ["1 000 € à 3 000 €", "3 000 € à 10 000 €", "> 10 000 €", "À définir ensemble"];

export default function BriefForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erreur lors de l'envoi");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    }
  }

  if (status === "sent") {
    return (
      <div className="brief-form" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
        <h3>Demande envoyée.</h3>
        <p className="form-sub" style={{ marginTop: 8 }}>
          On vous répond sous 24h ouvrées avec un créneau d&apos;appel et les premières questions de cadrage. Si c&apos;est urgent, écrivez à contact@earlypanel.fr.
        </p>
      </div>
    );
  }

  return (
    <form className="brief-form" onSubmit={handleSubmit}>
      <h3>Démarrer un projet</h3>
      <p className="form-sub">On vous répond sous 24h avec un créneau d&apos;appel et un forfait chiffré ({PRICE_RANGE_LABEL} selon le périmètre).</p>
      <div className="form-2col">
        <div className="form-row"><label htmlFor="brief-first">Prénom</label><input id="brief-first" name="first_name" type="text" placeholder="Thomas" autoComplete="given-name" /></div>
        <div className="form-row"><label htmlFor="brief-last">Nom</label><input id="brief-last" name="last_name" type="text" placeholder="Dupont" autoComplete="family-name" /></div>
      </div>
      <div className="form-row"><label htmlFor="brief-email">Email professionnel *</label><input id="brief-email" name="email" type="email" placeholder="thomas@startup.fr" required autoComplete="email" /></div>
      <div className="form-row"><label htmlFor="brief-company">Entreprise</label><input id="brief-company" name="company" type="text" placeholder="Votre startup ou agence" autoComplete="organization" /></div>
      <div className="form-row">
        <label htmlFor="brief-type">Type de produit à tester</label>
        <select id="brief-type" name="product_type" defaultValue="">
          <option value="" disabled>Sélectionner…</option>
          {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="form-row">
        <label htmlFor="brief-need">Décrivez votre besoin *</label>
        <textarea id="brief-need" name="need" required minLength={20} placeholder="Qu'est-ce que vous voulez tester ? Quel est votre objectif principal ?" />
      </div>
      <div className="form-row">
        <label htmlFor="brief-budget">Budget indicatif</label>
        <select id="brief-budget" name="budget" defaultValue="">
          <option value="" disabled>Sélectionner…</option>
          {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      {/* Honeypot anti-bot : invisible pour un humain, rempli par les bots. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="brief-website">Site web</label>
        <input id="brief-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {errorMsg && <p style={{ color: "#e53e3e", fontSize: 13, margin: "8px 0" }}>{errorMsg}</p>}
      <button className="form-submit" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Envoi…" : "Envoyer ma demande →"}
      </button>
      <p className="form-note">En soumettant ce formulaire, vous acceptez d&apos;être contacté. NDA signé avant tout échange.</p>
    </form>
  );
}
