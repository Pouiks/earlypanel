export default function TestimonialsSection() {
  return (
    <section className="proof-section">
      <div className="proof-inner">
        <div className="sec-eye">Ils nous font confiance</div>
        <div className="sec-title">Ce que disent nos clients.</div>
        <div className="proof-grid">
          <div className="proof-card">
            <div className="proof-stars">★★★★★</div>
            <p className="proof-quote">
              En 5 jours on avait des retours d&apos;utilisateurs réels sur notre tunnel d&apos;onboarding. On a identifié 3 points de friction qu&apos;on n&apos;avait jamais vus en interne.
            </p>
            <div className="proof-author">
              <div className="proof-avatar" style={{ background: "#e8f4fd", color: "#185FA5" }}>TC</div>
              <div>
                <div className="proof-author-name">Thomas C.</div>
                <div className="proof-author-job">CPO · Startup SaaS B2B</div>
              </div>
            </div>
          </div>
          <div className="proof-card">
            <div className="proof-stars">★★★★★</div>
            <p className="proof-quote">
              Le questionnaire était tellement bien ciblé que les réponses étaient directement actionnables. On a pu prioriser notre backlog sans débat en équipe.
            </p>
            <div className="proof-author">
              <div className="proof-avatar" style={{ background: "var(--green-bg)", color: "var(--green)" }}>SL</div>
              <div>
                <div className="proof-author-name">Sarah L.</div>
                <div className="proof-author-job">Product Manager · Scale-up e-commerce</div>
              </div>
            </div>
          </div>
          <div className="proof-card">
            <div className="proof-stars">★★★★★</div>
            <p className="proof-quote">
              On a testé une maquette Figma avant de lancer le dev. Les retours ont changé l&apos;architecture de notre app. Ça nous a évité 3 mois de refactoring.
            </p>
            <div className="proof-author">
              <div className="proof-avatar" style={{ background: "#faeeda", color: "#854F0B" }}>MB</div>
              <div>
                <div className="proof-author-name">Marc B.</div>
                <div className="proof-author-job">CTO · Agence digitale</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
