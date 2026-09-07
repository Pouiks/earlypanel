/**
 * Differenciation home.
 *
 * Le vrai concurrent d'une startup a 1 500-6 000 EUR n'est pas UserTesting :
 * c'est le fondateur qui envoie un Typeform a dix clients, ou le freelance
 * UX research sur Malt. Le tableau compare donc ces trois options, en HTML
 * semantique (<table>) pour etre lisible par Google et les LLM.
 */

const ROWS: { label: string; diy: string; freelance: string; us: string }[] = [
  { label: "Qui recrute les testeurs", diy: "Vous, dans votre réseau", freelance: "Le freelance, ou vous", us: "Nous, dans notre panel" },
  { label: "Profil des testeurs", diy: "Vos clients, déjà convaincus", freelance: "Selon son réseau", us: "Sélection manuelle selon votre cible" },
  { label: "Questionnaire", diy: "Écrit seul, souvent biaisé", freelance: "Écrit par le freelance", us: "Co-construit et validé avec vous" },
  { label: "Lecture des réponses", diy: "Vous, le soir", freelance: "Le freelance", us: "Chaque réponse relue, les bâclées refusées" },
  { label: "Livrable", diy: "Un tableur de verbatims", freelance: "Un rapport, selon le profil", us: "Rapport rédigé et restitution en visio" },
  { label: "Délai", diy: "Quand vous trouvez le temps", freelance: "2 à 4 semaines", us: "5 jours ouvrés après lancement" },
  { label: "Confidentialité", diy: "Aucune", freelance: "À négocier", us: "NDA signé avant tout échange" },
  { label: "Profils niches", diy: "Rarement accessibles", freelance: "Selon son réseau", us: "Santé, juridique, finance, IT" },
];

export default function DifferentiatorsSection() {
  return (
    <section className="diff-section">
      <div className="diff-inner">
        <div className="diff-left">
          <div className="sec-eye">Service de tests utilisateurs vs sondage maison</div>
          <h2 className="sec-title">Ce qu&apos;un sondage maison ne fera jamais à votre place.</h2>
          <div className="diff-list">
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h3>Des vrais profils, pas vos dix clients les plus sympas</h3>
                <p>Quand vous nous dites que vous testez un outil de gestion de planning pour kinés, on ne vous envoie pas 15 freelances digitaux qui n&apos;ont jamais mis les pieds dans un cabinet médical. Le recrutement des testeurs se fait à la main dans notre panel qualifié, parmi ceux qui correspondent, et qui ne vous connaissent pas.</p>
              </div>
            </div>
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <h3>Le questionnaire est écrit avec vous</h3>
                <p>On part de votre brief, on propose une première version, et on itère ensemble jusqu&apos;à ce que chaque question serve un objectif clair. Pas de copier-coller depuis un projet précédent, pas de question orientée qui confirme ce que vous espériez.</p>
              </div>
            </div>
            <div className="diff-item">
              <div className="diff-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div>
                <h3>Chaque test est lu par un humain</h3>
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
                <h3>L&apos;analyse fait partie du livrable</h3>
                <p>Vous n&apos;avez pas à éplucher 200 verbatims pour en tirer un sens. On le fait pour vous, on priorise, et on vient présenter les résultats à votre équipe en visio. Vous repartez avec ce qu&apos;il faut décider, pas avec un tableur.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="diff-right">
          <p className="compare-caption">Faire soi-même, freelance UX research ou service de tests utilisateurs</p>
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Critère</th>
                <th scope="col">Faire soi-même</th>
                <th scope="col">Freelance UX</th>
                <th scope="col" className="compare-th-us">earlypanel</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td>{r.diy}</td>
                  <td>{r.freelance}</td>
                  <td className="compare-td-us">{r.us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
