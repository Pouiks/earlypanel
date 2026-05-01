import QuestionnaireWidget from "./QuestionnaireWidget";
import { BOOKING_URL } from "@/lib/cta-links";

export default function HeroLanding() {
  return (
    <section className="hero-wrap">
      <div className="hero-index">
        <div>
          <div className="h-eyebrow">Tests utilisateurs B2B · Phase de lancement</div>
          <h1>On teste votre produit.<br /><em>Avec les bons profils.</em></h1>
          <p className="hero-sub-index">
            On commence par comprendre ce que vous voulez vraiment savoir. Ensuite on sélectionne les profils qui correspondent à votre cible. Le questionnaire, on l&apos;écrit avec vous. Et les testeurs répondent vraiment, sans cocher des cases au hasard.
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
