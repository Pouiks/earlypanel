export default function HowItWorks() {
  return (
    <section className="how" id="how">
      <div className="how-inner">
        <div className="sec-eye">Comment ça marche</div>
        <div className="sec-title">De votre inscription au paiement, en quatre étapes.</div>
        <div className="how-steps">
          <div className="how-step">
            <div className="how-num">01</div>
            <div>
              <h3>Vous créez votre profil</h3>
              <p>Quelques infos sur ce que vous faites au quotidien — métier, secteur, outils utilisés, équipement. Plus c&apos;est précis, plus on peut vous proposer des missions où votre avis a vraiment de la valeur. Si vous êtes infirmière libérale, on ne va pas vous envoyer tester un logiciel de comptabilité.</p>
              <span className="how-pill">5 minutes · Gratuit</span>
            </div>
          </div>
          <div className="how-step">
            <div className="how-num">02</div>
            <div>
              <h3>On vous propose des missions adaptées</h3>
              <p>Quand un client a besoin d&apos;un profil comme le vôtre, vous recevez un email court avec ce qu&apos;il faut tester, le temps estimé et combien c&apos;est payé. Vous dites oui, non, ou rien — pas de pression, pas de pénalité si la mission ne vous intéresse pas.</p>
              <span className="how-pill">Sur invitation · Libre</span>
            </div>
          </div>
          <div className="how-step">
            <div className="how-num">03</div>
            <div>
              <h3>Vous testez et vous répondez aux questions</h3>
              <p>Vous accédez au produit (un site, une app, une maquette Figma) et vous l&apos;utilisez comme si c&apos;était le vôtre. Ensuite quelques questions ouvertes : ce qui vous a plu, ce qui vous a gêné, ce qui vous a perdu. Pas de jargon, pas de bonne ou mauvaise réponse — juste votre vécu.</p>
              <span className="how-pill">25 min en moyenne</span>
            </div>
          </div>
          <div className="how-step">
            <div className="how-num">04</div>
            <div>
              <h3>Votre test est validé, vous êtes payé</h3>
              <p>On lit votre test sous quelques jours. Si tout va bien, le virement part vers votre IBAN, en général sous 72h. Si on a un doute (réponse trop courte, sujet mal compris), on revient vers vous avant de décider — on ne refuse jamais sans explication.</p>
              <span className="how-pill">Virement · 72h max</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
