import { BOOKING_URL } from "@/lib/cta-links";

export default function PricingSection() {
  return (
    <section className="pricing" id="tarifs">
      <div className="pricing-inner">
        <div className="pricing-header">
          <div>
            <div className="sec-eye">Nos offres</div>
            <div className="sec-title">Trois formules. Un seul objectif.</div>
          </div>
          <p className="pricing-note">Atelier de cadrage, questionnaire sur mesure et rapport inclus dans chaque formule.</p>
        </div>
        <div className="pack-grid">
          <div className="pk">
            <div className="pk-cat">Essentiel</div>
            <div className="pk-name">Quick Test</div>
            <div className="pk-tagline">Idéal pour valider<br /><small>une hypothèse</small></div>
            <div className="pk-hr" />
            <ul className="pk-features">
              <li>5 testeurs ciblés</li>
              <li>Questionnaire 25 min</li>
              <li>Rapport synthétique</li>
              <li>Livraison en 3 jours</li>
            </ul>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="pk-btn">
              Réserver un appel →
            </a>
          </div>
          <div className="pk featured">
            <div className="pk-cat">Le plus choisi</div>
            <div className="pk-name">Standard</div>
            <div className="pk-tagline">L&apos;analyse UX<br /><small>complète</small></div>
            <div className="pk-hr" />
            <ul className="pk-features">
              <li>10 testeurs ciblés</li>
              <li>Analyse UX complète</li>
              <li>KPIs quanti + quali</li>
              <li>Carte des frictions</li>
              <li>Session de restitution visio</li>
            </ul>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="pk-btn">
              Réserver un appel →
            </a>
          </div>
          <div className="pk">
            <div className="pk-cat">Premium</div>
            <div className="pk-name">Expert</div>
            <div className="pk-tagline">Le suivi<br /><small>sur mesure</small></div>
            <div className="pk-hr" />
            <ul className="pk-features">
              <li>15 testeurs + profils experts</li>
              <li>Analyse IA pré-test incluse</li>
              <li>Rapport complet + slides</li>
              <li>2 sessions de restitution</li>
              <li>Suivi 30 jours post-livraison</li>
            </ul>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="pk-btn">
              Réserver un appel →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
