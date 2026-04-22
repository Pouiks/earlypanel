export default function LeadMagnetSection() {
  return (
    <section className="leadmag">
      <div className="leadmag-inner">
        <h2>Voyez à quoi ressemble<br /><em>un vrai rapport testpanel.</em></h2>
        <p>Téléchargez un exemple complet — KPIs, verbatims, carte des frictions et recommandations.</p>
        <div className="lead-form">
          <input type="email" className="lead-input" placeholder="votre@email.fr" aria-label="Email" />
          <button className="lead-btn">Recevoir l&apos;exemple →</button>
        </div>
        <p className="lead-note">Aucun spam. Juste le rapport, une seule fois.</p>
      </div>
    </section>
  );
}
