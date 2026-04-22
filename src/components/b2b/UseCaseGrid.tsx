export default function UseCaseGrid() {
  return (
    <section className="usecases">
      <div className="uc-inner">
        <div className="sec-eye">Cas d&apos;usage</div>
        <div className="sec-title">Sur quoi peut-on tester ?</div>
        <p className="sec-sub">Quel que soit l&apos;état d&apos;avancement de votre produit, on s&apos;adapte au support que vous nous fournissez.</p>
        <div className="uc-grid">
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 9h6M9 12h4" /></svg>
            </div>
            <h3>Maquette Figma / XD</h3>
            <p>Testez votre design avant de coder. On intègre le lien de partage directement dans le questionnaire.</p>
            <span className="uc-example">MVP · POC · Wireframe</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            </div>
            <h3>URL de recette / staging</h3>
            <p>Votre environnement de test est prêt ? On y envoie des testeurs avec un accès sécurisé et des credentials dédiés.</p>
            <span className="uc-example">Pre-prod · Beta · Recette</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <h3>Produit en production</h3>
            <p>Audit utilisateur sur votre SaaS live. On teste des parcours spécifiques sans compromettre vos données.</p>
            <span className="uc-example">SaaS · App mobile · Site web</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2" /><circle cx="12" cy="17" r="1" /></svg>
            </div>
            <h3>Application mobile</h3>
            <p>iOS ou Android, TestFlight ou APK — on recrute des testeurs sur les bons appareils et systèmes.</p>
            <span className="uc-example">iOS · Android · PWA</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            </div>
            <h3>Document ou processus</h3>
            <p>CGU, contrat en ligne, formulaire d&apos;inscription — on teste la compréhension et la fluidité de vos documents.</p>
            <span className="uc-example">Formulaire · Contrat · CGU</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
            </div>
            <h3>Tunnel e-commerce</h3>
            <p>Panier, checkout, page produit — on identifie les points d&apos;abandon et les frictions qui coûtent des conversions.</p>
            <span className="uc-example">Panier · Checkout · Fiche produit</span>
          </div>
        </div>
      </div>
    </section>
  );
}
