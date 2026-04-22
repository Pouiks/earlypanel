export default function ProcessSection() {
  return (
    <section className="process" id="process">
      <div className="process-inner">
        <div className="sec-eye">Comment ça marche</div>
        <div className="sec-title">De votre brief au rapport. <span>En 5 étapes.</span></div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">Étape 01</div>
            <h3>Atelier de cadrage</h3>
            <p>On définit ensemble vos personas, objectifs et KPIs. Sans brief précis, pas de test qualitatif. C&apos;est l&apos;étape qui conditionne tout.</p>
            <span className="step-pill">1h de visio</span>
          </div>
          <div className="step-card">
            <div className="step-num">Étape 02</div>
            <h3>Questionnaire sur mesure</h3>
            <p>Cahier de tests co-rédigé avec vous. Chaque question est pensée pour obtenir un insight précis, pas une réponse générique.</p>
            <span className="step-pill">Validé par le client</span>
          </div>
          <div className="step-card">
            <div className="step-num">Étape 03</div>
            <h3>Sélection des testeurs</h3>
            <p>On sélectionne dans notre panel les profils qui correspondent exactement à votre utilisateur cible — secteur, métier, maturité digitale, équipement.</p>
            <span className="step-pill">Matching précis</span>
          </div>
          <div className="step-card">
            <div className="step-num">Étape 04</div>
            <h3>Contrôle qualité manuel</h3>
            <p>Chaque réponse est lue et validée avant d&apos;être comptabilisée. Un test bâclé n&apos;est pas payé au testeur, et ne vous est pas facturé.</p>
            <span className="step-pill">100% vérifiés</span>
          </div>
          <div className="step-card" style={{ gridColumn: "1 / -1", borderTop: "0.5px solid var(--border)" }}>
            <div className="step-num">Étape 05</div>
            <h3>Rapport actionnable + restitution</h3>
            <p>KPIs quantitatifs et qualitatifs, verbatims annotés, carte des frictions priorisées, recommandations quick wins vs chantiers. Livré en 5 jours ouvrés, suivi d&apos;une session de restitution visio avec votre équipe.</p>
            <span className="step-pill">Livré en 5 jours</span>
          </div>
        </div>
      </div>
    </section>
  );
}
