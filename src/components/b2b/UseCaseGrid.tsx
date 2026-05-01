export default function UseCaseGrid() {
  return (
    <section className="usecases">
      <div className="uc-inner">
        <div className="sec-eye">Sur quoi on travaille</div>
        <div className="sec-title">Concrètement, on peut tester quoi ?</div>
        <p className="sec-sub">Quel que soit le moment où vous nous appelez, voici les formats qu&apos;on prend en charge. Si votre support n&apos;est pas dans cette liste, écrivez-nous, on regardera ensemble.</p>
        <div className="uc-grid">
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 9h6M9 12h4" /></svg>
            </div>
            <h3>Maquette Figma / XD</h3>
            <p>Pourquoi développer si on n&apos;est pas sûr du design ? Vous nous partagez le lien Figma, on l&apos;intègre dans le questionnaire, et les testeurs naviguent dedans avant que vous ne lanciez la prod.</p>
            <span className="uc-example">MVP · POC · Wireframe</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            </div>
            <h3>URL de recette / staging</h3>
            <p>Vous avez une URL de pré-prod prête à être éprouvée ? On y envoie les testeurs avec des credentials dédiés (créés pour l&apos;occasion, supprimés après le test).</p>
            <span className="uc-example">Pre-prod · Beta · Recette</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <h3>Produit en production</h3>
            <p>Votre SaaS est live mais vous voulez comprendre pourquoi un parcours convertit mal. On cible la zone précise (checkout, onboarding, dashboard) sans toucher à vos données réelles.</p>
            <span className="uc-example">SaaS · App mobile · Site web</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2" /><circle cx="12" cy="17" r="1" /></svg>
            </div>
            <h3>Application mobile</h3>
            <p>iOS, Android, TestFlight, APK : on choisit les testeurs en fonction de leur appareil réel. Pas de simulation desktop quand vous testez une app mobile.</p>
            <span className="uc-example">iOS · Android · PWA</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            </div>
            <h3>Document ou processus</h3>
            <p>Vos CGU sont compréhensibles par un humain non-juriste ? Votre formulaire d&apos;inscription décourage la moitié des visiteurs ? On le mesure.</p>
            <span className="uc-example">Formulaire · Contrat · CGU</span>
          </div>
          <div className="uc-card">
            <div className="uc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
            </div>
            <h3>Tunnel e-commerce</h3>
            <p>Là où ça abandonne, là où ça bloque, là où le client trouve le bouton mais hésite à cliquer. On observe et on documente, vous corrigez.</p>
            <span className="uc-example">Panier · Checkout · Fiche produit</span>
          </div>
        </div>
      </div>
    </section>
  );
}
