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
            <a href="/entreprises" className="btn-outline">En savoir plus</a>
          </div>
        </div>
        <div className="hero-right">
          <QuestionnaireWidget />
        </div>
      </div>
    </section>
  );
}
