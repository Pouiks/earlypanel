"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const scenarios = [
  {
    tag: "Parcours d'onboarding",
    session: "Session · Logiciel de facturation",
    question: "À quelle étape vous êtes-vous arrêté, et pourquoi ?",
    hint: "Décrivez précisément ce qui s'est passé, même si c'est technique.",
    answer: "Lorsque j'ai cliqué sur \"Se connecter\", une erreur est apparue et m'a redirigé vers une page blanche.\n\nJ'ai ouvert la console et j'ai vu : \"TypeError: Cannot read properties of undefined (reading 'token')\"\n\nJ'ai essayé de recommencer 2 fois, même résultat.",
    progress: "Question 3 sur 6",
    pct: "50%",
    fill: "50%",
    name: "Marie L.",
    job: "Chargée RH",
    avatar: "ML",
    avatarBg: "#1a3326",
    avatarColor: "#2DD4A0",
    device: "Ordinateur · Chrome",
  },
  {
    tag: "Tunnel de paiement",
    session: "Session · Application e-commerce",
    question: "Qu'est-ce qui vous a empêché de finaliser votre commande ?",
    hint: "Pensez aux informations demandées, aux étapes, aux messages affichés.",
    answer: "Tout allait bien jusqu'à la saisie de ma carte. Le formulaire a vidé tous mes champs après que j'ai corrigé le numéro.\n\nJ'ai dû tout ressaisir 3 fois. À la 3ème tentative j'ai abandonné.\n\nAussi : les frais de livraison n'apparaissent qu'à la dernière étape — c'est frustrant.",
    progress: "Question 4 sur 7",
    pct: "57%",
    fill: "57%",
    name: "Simon R.",
    job: "Freelance dev",
    avatar: "SR",
    avatarBg: "#1a2535",
    avatarColor: "#85B7EB",
    device: "Mobile · Safari",
  },
  {
    tag: "Dashboard analytique",
    session: "Session · SaaS RH",
    question: "Avez-vous trouvé facilement l'information que vous cherchiez ?",
    hint: "Dites-nous où vous avez cherché et ce que vous avez trouvé ou non.",
    answer: "Je cherchais le rapport des congés sur les 6 derniers mois.\n\nJ'ai d'abord cliqué sur \"Rapports\" puis \"Congés\" mais les filtres de date ne fonctionnent pas comme prévu — impossible de choisir une plage personnalisée.\n\nJ'ai finalement trouvé en passant par \"Export\", ce qui n'est vraiment pas logique.",
    progress: "Question 2 sur 5",
    pct: "40%",
    fill: "40%",
    name: "Amira K.",
    job: "Responsable RH",
    avatar: "AK",
    avatarBg: "#2a1f0e",
    avatarColor: "#EF9F27",
    device: "Tablette · Firefox",
  },
];

export default function QuestionnaireWidget() {
  const [current, setCurrent] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const s = scenarios[current];

  const stopTyping = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTyping(false);
  }, []);

  const loadScenario = useCallback(
    (idx: number) => {
      stopTyping();
      setCurrent(idx);
      setCharIdx(0);
      setIsTyping(true);
    },
    [stopTyping]
  );

  useEffect(() => {
    if (!isTyping) return;
    const full = scenarios[current].answer;
    timerRef.current = setInterval(() => {
      setCharIdx((prev) => {
        if (prev > full.length) {
          stopTyping();
          setTimeout(() => loadScenario((current + 1) % scenarios.length), 3500);
          return prev;
        }
        return prev + 1;
      });
    }, 16);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTyping, current, stopTyping, loadScenario]);

  useEffect(() => {
    setIsTyping(true);
  }, []);

  const typed = s.answer.slice(0, charIdx);
  const doneTyping = charIdx > s.answer.length;

  return (
    <>
      <div className="q-widget">
        <div className="q-topbar">
          <div className="q-dots">
            <div className="q-dot" style={{ background: "#FF5F57" }} />
            <div className="q-dot" style={{ background: "#FFBD2E" }} />
            <div className="q-dot" style={{ background: "#28CA41" }} />
          </div>
          <div className="q-session">{s.session}</div>
        </div>
        <div className="q-progress-wrap">
          <div className="q-progress-header">
            <div className="q-progress-label">{s.progress}</div>
            <div className="q-progress-count">{s.pct}</div>
          </div>
          <div className="q-progress-track">
            <div className="q-progress-fill" style={{ width: s.fill }} />
          </div>
        </div>
        <div className="q-body">
          <div className="q-scenario-label">
            <div className="q-scenario-dot" />
            <span>{s.tag}</span>
          </div>
          <div className="q-question">{s.question}</div>
          <div className="q-hint">{s.hint}</div>
          <div style={{ position: "relative", marginBottom: "14px" }}>
            <div className="q-textarea" style={{ whiteSpace: "pre-wrap" }}>
              {typed.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
              {!doneTyping && <span className="cursor-blink" />}
            </div>
          </div>
          <div className="q-meta-row">
            <div className="q-char-count">{charIdx} caractères</div>
            <button
              className={`q-next-btn${doneTyping ? " visible" : ""}`}
              onClick={() => loadScenario((current + 1) % scenarios.length)}
            >
              Question suivante →
            </button>
          </div>
        </div>
        <div className="q-footer">
          <div className="q-avatar-row">
            <div className="q-avatar" style={{ background: s.avatarBg, color: s.avatarColor }}>
              {s.avatar}
            </div>
            <div className="q-tester-info">
              <strong>{s.name}</strong> · <span>{s.job}</span>
            </div>
          </div>
          <div className="q-device">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            {s.device}
          </div>
        </div>
      </div>
      <div className="scenario-nav">
        {scenarios.map((_, i) => (
          <div
            key={i}
            className={`s-dot${i === current ? " active" : ""}`}
            onClick={() => loadScenario(i)}
          />
        ))}
      </div>
    </>
  );
}
