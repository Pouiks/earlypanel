import QuestionnaireWidget from "./QuestionnaireWidget";
import { BOOKING_URL } from "@/lib/cta-links";

export default function HeroLanding() {
  return (
    <section className="hero-wrap">
      <div className="hero-index">
        <div>
          <div className="h-eyebrow">Panel humain · Questionnaires ciblés · 5 jours</div>
          <h1>Des questions précises.<br /><em>Des réponses qui comptent.</em></h1>
          <p className="hero-sub-index">
            On sélectionne les bons profils, on construit un questionnaire sur mesure avec vous — et vos testeurs répondent avec une précision chirurgicale.
          </p>
          <div className="hero-btns">
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark">Réserver un appel gratuit →</a>
            <a href="#tarifs" className="btn-outline">Découvrir nos formules</a>
          </div>
          <div className="hero-proof">
            <div className="proof-dots">
              <div className="proof-dot" style={{ background: "#2DD4A0", color: "#0a5a3a" }}>ML</div>
              <div className="proof-dot" style={{ background: "#5DCAA5", color: "#0a5a3a" }}>SR</div>
              <div className="proof-dot" style={{ background: "#1D9E75", color: "#fff" }}>AK</div>
              <div className="proof-dot" style={{ background: "#0F6E56", color: "#fff" }}>+9</div>
            </div>
            <p style={{ fontSize: "13px", color: "var(--gray)", paddingLeft: "12px" }}>
              <strong style={{ color: "var(--black)" }}>12 équipes produit</strong> nous font confiance
            </p>
          </div>
        </div>
        <div className="hero-right">
          <QuestionnaireWidget />
        </div>
      </div>
    </section>
  );
}
