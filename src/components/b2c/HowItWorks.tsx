export default function HowItWorks() {
  return (
    <section className="how" id="how">
      <div className="how-inner">
        <div className="sec-eye">Comment ça marche</div>
        <div className="sec-title">Simple. Flexible. Rémunéré.</div>
        <div className="how-steps">
          <div className="how-step">
            <div className="how-num">01</div>
            <div>
              <h3>Vous créez votre profil</h3>
              <p>Décrivez votre métier, vos habitudes digitales, vos outils. Plus votre profil est précis, plus les missions correspondent à votre quotidien.</p>
              <span className="how-pill">5 minutes · Gratuit</span>
            </div>
          </div>
          <div className="how-step">
            <div className="how-num">02</div>
            <div>
              <h3>On vous contacte pour les bonnes missions</h3>
              <p>Quand une mission correspond à votre profil, vous recevez un email avec le brief, la durée estimée et la rémunération. Vous acceptez ou refusez librement.</p>
              <span className="how-pill">Sur invitation · Libre</span>
            </div>
          </div>
          <div className="how-step">
            <div className="how-num">03</div>
            <div>
              <h3>Vous testez et répondez au questionnaire</h3>
              <p>Vous accédez au produit (site, app, maquette) et répondez à des questions précises sur votre expérience. Pas de jargon, juste vos réactions honnêtes.</p>
              <span className="how-pill">25 min en moyenne</span>
            </div>
          </div>
          <div className="how-step">
            <div className="how-num">04</div>
            <div>
              <h3>Votre test est validé et vous êtes payé</h3>
              <p>Une fois votre test validé par notre équipe, le paiement est déclenché automatiquement sur votre compte bancaire. Délai : 72h maximum.</p>
              <span className="how-pill">Virement · 72h max</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
