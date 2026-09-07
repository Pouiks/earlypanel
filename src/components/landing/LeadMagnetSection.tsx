"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Lead magnet "rapport d'exemple". C'est le seul CTA a friction basse du
 * site : il est place juste sous le hero (pas en bas de page) et cible par
 * l'ancre #rapport depuis la nav, le hero et le footer.
 */
export default function LeadMagnetSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "sending") return;

    setStatus("sending");
    try {
      const res = await fetch("/api/lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="leadmag" id="rapport">
      <div className="leadmag-inner">
        <h2>Voyez à quoi ressemble<br /><em>un rapport de test utilisateur.</em></h2>
        <p>Avant de réserver un appel, recevez un exemple complet de livrable : synthèse, carte des frictions UX, verbatims, priorisation et recommandations.</p>

        {status === "sent" ? (
          <p className="lead-success">Le rapport a été envoyé à <strong>{email}</strong>. Pensez à vérifier vos spams.</p>
        ) : (
          <form className="lead-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="lead-input"
              placeholder="votre@email.fr"
              aria-label="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={status === "sending"}
            />
            <button className="lead-btn" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Envoi…" : "Recevoir l\u2019exemple →"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="lead-error">Une erreur est survenue. Réessayez ou contactez-nous.</p>
        )}
        {status !== "sent" && (
          <p className="lead-note">Aucun spam. Juste le rapport, une seule fois.</p>
        )}
      </div>
    </section>
  );
}
