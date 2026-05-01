export default function DifferentiatorsSection() {
  return (
    <section className="diff-section">
      <div className="diff-inner">
        <div className="diff-left">
          <div className="sec-eye">Pourquoi earlypanel</div>
          <div className="sec-title">Ce qu&apos;un outil self-service ne fera jamais à votre place.</div>
          <div className="diff-list">
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h4>Des vrais profils, pas un panel ouvert à tous</h4>
                <p>Quand vous nous dites que vous testez un outil de gestion de planning pour kinés, on ne vous envoie pas 15 freelances digitaux qui n&apos;ont jamais mis les pieds dans un cabinet médical. On va vraiment chercher dans notre panel ceux qui correspondent.</p>
              </div>
            </div>
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <h4>Le questionnaire est écrit avec vous</h4>
                <p>On part de votre brief, on propose une première version, et on itère ensemble jusqu&apos;à ce que chaque question serve un objectif clair. Pas de copier-coller depuis un projet précédent.</p>
              </div>
            </div>
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div>
                <h4>Chaque test est lu par un humain</h4>
                <p>Pas d&apos;auto-validation, pas de score algorithmique. On lit les réponses une par une. Si quelque chose cloche (incohérence, réponse trop courte, sujet mal compris), on refuse le test et on en lance un autre, sans vous le facturer.</p>
              </div>
            </div>
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <h4>L&apos;analyse fait partie du livrable</h4>
                <p>Vous n&apos;avez pas à éplucher 200 verbatims pour en tirer un sens. On le fait pour vous, on priorise, et on vient présenter les résultats à votre équipe en visio. Vous repartez avec ce qu&apos;il faut décider, pas avec un tableur.</p>
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
            <div className="compare-row"><div className="compare-label" style={{ flex: 1.5 }}>Délai</div><div className="compare-them">Variable</div><div className="compare-us">5 jours ouvrés</div></div>
            <div className="compare-row"><div className="compare-label" style={{ flex: 1.5 }}>NDA / confidentialité</div><div className="compare-them">Standard</div><div className="compare-us">Contractualisé</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
