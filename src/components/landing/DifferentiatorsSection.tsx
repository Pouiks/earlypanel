export default function DifferentiatorsSection() {
  return (
    <section className="diff-section">
      <div className="diff-inner">
        <div className="diff-left">
          <div className="sec-eye">Pourquoi earlypanel</div>
          <div className="sec-title">Ce qu&apos;aucun outil self-service ne peut vous offrir.</div>
          <div className="diff-list">
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h4>Des vrais profils recrutés</h4>
                <p>On ne vous envoie pas n&apos;importe qui. Chaque testeur est sélectionné selon un profil précis défini avec vous — pas un panel ouvert à tous.</p>
              </div>
            </div>
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <h4>Questions construites avec vous</h4>
                <p>Le questionnaire n&apos;est pas un template. Il est co-rédigé avec votre équipe pour cibler exactement ce que vous avez besoin de comprendre.</p>
              </div>
            </div>
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div>
                <h4>Validation manuelle de chaque test</h4>
                <p>Pas d&apos;algorithme, pas d&apos;auto-validation. On lit chaque réponse. Un test incohérent est refusé et remplacé sans frais supplémentaire.</p>
              </div>
            </div>
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <h4>Analyse et restitution incluses</h4>
                <p>On ne vous livre pas un tableur de réponses brutes. On fait l&apos;analyse, on priorise, et on vous présente les résultats avec votre équipe produit.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="diff-right">
          <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--gray-light)", letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: "1.5rem" }}>
            earlypanel vs. outils self-service
          </p>
          <div className="compare-header">
            <span style={{ flex: 1.5 }}>Critère</span>
            <span>Outils classiques</span>
            <span>earlypanel</span>
          </div>
          <div className="diff-compare">
            <div className="compare-row"><div className="compare-label" style={{ flex: 1.5 }}>Profil testeur</div><div className="compare-them">Panel ouvert</div><div className="compare-us">Sélection manuelle</div></div>
            <div className="compare-row"><div className="compare-label" style={{ flex: 1.5 }}>Questionnaire</div><div className="compare-them">Template générique</div><div className="compare-us">Co-construit</div></div>
            <div className="compare-row"><div className="compare-label" style={{ flex: 1.5 }}>Validation</div><div className="compare-them">Automatique</div><div className="compare-us">Manuelle</div></div>
            <div className="compare-row"><div className="compare-label" style={{ flex: 1.5 }}>Analyse</div><div className="compare-them">Données brutes</div><div className="compare-us">Rapport + restitution</div></div>
            <div className="compare-row"><div className="compare-label" style={{ flex: 1.5 }}>Délai</div><div className="compare-them">Variable</div><div className="compare-us">5 jours garantis</div></div>
            <div className="compare-row"><div className="compare-label" style={{ flex: 1.5 }}>NDA / confidentialité</div><div className="compare-them">Standard</div><div className="compare-us">Contractualisé</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
