import { glossify } from "@/components/ui/glossify";
export default function ProcessSection() {
  return (
    <section className="process" id="process">
      <div className="process-inner">
        <div className="sec-eye">Déroulé d&apos;un test utilisateur à distance</div>
        <h2 className="sec-title">Du brief au rapport, en cinq étapes.</h2>
        <p className="sec-sub">{glossify("Un test utilisateur non modéré, mené à distance, livré en cinq jours ouvrés, parce que vous recevez un rapport rédigé et une restitution, pas quarante vidéos brutes à visionner vous-même.")}</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">Étape 01</div>
            <h3>Atelier de cadrage</h3>
            <p>{glossify("Une visio d'une heure pour comprendre ce que vous voulez vraiment savoir. Qui sont vos utilisateurs, ce qui vous bloque aujourd'hui, ce qui vous aiderait à décider. Un brief flou donne un test inutile, alors on prend le temps qu'il faut sur cette étape.")}</p>
            <span className="step-pill">1h de visio</span>
          </div>
          <div className="step-card">
            <div className="step-num">Étape 02</div>
            <h3>Questionnaire sur mesure</h3>
            <p>{glossify("On rédige les questions ensemble, comme le ferait un UX researcher. Vous voyez la version finale avant qu'elle parte aux testeurs, et vous pouvez tout ajuster : l'ordre, le ton, ce qu'on demande explicitement, ce qu'on laisse ouvert. Pas de template tout fait.")}</p>
            <span className="step-pill">Validé par le client</span>
          </div>
          <div className="step-card">
            <div className="step-num">Étape 03</div>
            <h3>Sélection des testeurs</h3>
            <p>{glossify("On va chercher dans notre panel les profils qui ressemblent à vos vrais utilisateurs. Pas une approximation. Pas un profil qui coche 3 cases sur 5. Un kiné de 45 ans qui utilise Doctolib tous les jours si c'est ça que vous testez. Un freelance graphiste sur Mac avec 10 ans d'expérience si c'est ça votre cible.")}</p>
            <span className="step-pill">Sélection manuelle</span>
          </div>
          <div className="step-card">
            <div className="step-num">Étape 04</div>
            <h3>Contrôle qualité manuel</h3>
            <p>{glossify("Chaque réponse passe sous nos yeux avant d'arriver dans votre rapport. Si un testeur a bâclé, on le voit tout de suite : trois mots vagues, une réponse qui ne correspond pas à la question, du copier-coller depuis une autre question. Ce test-là est refusé. Pas payé au testeur. Pas facturé chez vous. On en lance un nouveau.")}</p>
            <span className="step-pill">100% vérifiés</span>
          </div>
          <div className="step-card" style={{ gridColumn: "1 / -1", borderTop: "0.5px solid var(--border)" }}>
            <div className="step-num">Étape 05</div>
            <h3>Rapport et restitution</h3>
            <p>{glossify("Vous recevez un rapport de test utilisateur avec ce qu'on a vraiment appris : les frictions identifiées, les verbatims qui les illustrent, ce qui est prioritaire à corriger et ce qui peut attendre. On en discute ensemble en visio juste après, pour que votre équipe reparte avec des actions concrètes au lieu d'un PDF qu'on archive. C'est pour ça qu'on annonce cinq jours et pas 48 heures : les plateformes qui livrent en 48 h vous livrent des enregistrements bruts, et le travail d'analyse reste chez vous.")}</p>
            <span className="step-pill">Rapport rédigé sous 5 jours ouvrés</span>
          </div>
        </div>
      </div>
    </section>
  );
}
