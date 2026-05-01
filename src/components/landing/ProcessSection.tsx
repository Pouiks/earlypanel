export default function ProcessSection() {
  return (
    <section className="process" id="process">
      <div className="process-inner">
        <div className="sec-eye">Comment ça marche</div>
        <div className="sec-title">Du brief au rapport, en cinq étapes.</div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">Étape 01</div>
            <h3>Atelier de cadrage</h3>
            <p>Une visio d&apos;une heure pour comprendre ce que vous voulez vraiment savoir. Qui sont vos utilisateurs, ce qui vous bloque aujourd&apos;hui, ce qui vous aiderait à décider. Un brief flou donne un test inutile — alors on prend le temps qu&apos;il faut sur cette étape.</p>
            <span className="step-pill">1h de visio</span>
          </div>
          <div className="step-card">
            <div className="step-num">Étape 02</div>
            <h3>Questionnaire sur mesure</h3>
            <p>On rédige les questions ensemble. Vous voyez la version finale avant qu&apos;elle parte aux testeurs, et vous pouvez tout ajuster — l&apos;ordre, le ton, ce qu&apos;on demande explicitement, ce qu&apos;on laisse ouvert. Pas de template tout fait.</p>
            <span className="step-pill">Validé par le client</span>
          </div>
          <div className="step-card">
            <div className="step-num">Étape 03</div>
            <h3>Sélection des testeurs</h3>
            <p>On va chercher dans notre panel les profils qui ressemblent à vos vrais utilisateurs. Pas une approximation. Pas un profil qui coche 3 cases sur 5. Un kiné de 45 ans qui utilise Doctolib tous les jours si c&apos;est ça que vous testez. Un freelance graphiste sur Mac avec 10 ans d&apos;expérience si c&apos;est ça votre cible.</p>
            <span className="step-pill">Sélection manuelle</span>
          </div>
          <div className="step-card">
            <div className="step-num">Étape 04</div>
            <h3>Contrôle qualité manuel</h3>
            <p>Chaque réponse passe sous nos yeux avant d&apos;arriver dans votre rapport. Si un testeur a bâclé, on le voit tout de suite : trois mots vagues, une réponse qui ne correspond pas à la question, du copier-coller depuis une autre question. Ce test-là est refusé. Pas payé au testeur. Pas facturé chez vous. On en lance un nouveau.</p>
            <span className="step-pill">100% vérifiés</span>
          </div>
          <div className="step-card" style={{ gridColumn: "1 / -1", borderTop: "0.5px solid var(--border)" }}>
            <div className="step-num">Étape 05</div>
            <h3>Rapport et restitution</h3>
            <p>Vous recevez un document avec ce qu&apos;on a vraiment appris : les frictions identifiées, les verbatims qui les illustrent, ce qui est prioritaire à corriger et ce qui peut attendre. On en discute ensemble en visio juste après, pour que votre équipe reparte avec des actions concrètes — pas un PDF qu&apos;on archive.</p>
            <span className="step-pill">Sous 5 jours ouvrés</span>
          </div>
        </div>
      </div>
    </section>
  );
}
