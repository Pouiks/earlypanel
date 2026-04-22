import BriefForm from "./BriefForm";

export default function BriefSection() {
  return (
    <section className="brief-section" id="brief">
      <div className="brief-inner">
        <div className="brief-left">
          <div className="sec-eye">Démarrer un projet</div>
          <div className="sec-title">Parlez-nous de votre besoin.</div>
          <p>En 2 minutes, décrivez votre produit et ce que vous voulez tester. On revient vers vous sous 24h avec une proposition sur mesure.</p>
          <div className="brief-guarantees">
            <div className="brief-guarantee">
              <div className="bg-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /></svg></div>
              <p className="bg-text"><strong>NDA signé avant tout échange</strong> — votre produit reste confidentiel.</p>
            </div>
            <div className="brief-guarantee">
              <div className="bg-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /></svg></div>
              <p className="bg-text"><strong>Devis sous 24h</strong> — personnalisé selon votre brief.</p>
            </div>
            <div className="brief-guarantee">
              <div className="bg-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /></svg></div>
              <p className="bg-text"><strong>Atelier de cadrage offert</strong> — on structure votre brief avec vous avant de lancer.</p>
            </div>
            <div className="brief-guarantee">
              <div className="bg-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /></svg></div>
              <p className="bg-text"><strong>Paiement à la livraison</strong> — 50% à la commande, 50% à la remise du rapport.</p>
            </div>
          </div>
        </div>
        <BriefForm />
      </div>
    </section>
  );
}
