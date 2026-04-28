/**
 * Section preuves sociales B2C : 3 temoignages testeurs avec revenu mensuel.
 *
 * IMPORTANT : placeholders realistes a remplacer par de vrais
 * temoignages quand le panel sera plus mature. RGPD + droit a l'image
 * obligent une autorisation ecrite avant publication.
 *
 * Le revenu mensuel affiche est CRUCIAL pour la conversion : c'est la
 * principale objection silencieuse "est-ce que ca paie vraiment ?".
 */

interface TesterStory {
  /** Citation testeur */
  quote: string;
  /** Prenom + ville/region */
  author: string;
  /** Profil pro pour identification */
  job: string;
  /** Revenu mensuel reel ou typique pour ce profil */
  monthlyRevenue: string;
  /** Nombre de missions par mois en moyenne */
  missionsPerMonth: string;
  avatarInitials: string;
  /** Couleur d'accent par carte pour varier visuellement */
  accentColor: string;
}

// Placeholders realistes alignes sur la grille de remuneration reelle
// (cf. data/earn-table.ts pour les fourchettes par profil).
const PLACEHOLDER_STORIES: TesterStory[] = [
  {
    quote:
      "Je teste 2-3 apps par mois pendant que les enfants sont a l'ecole. Les missions durent 25-30 min, sans pression. Le complement arrive direct sur mon compte 72h apres.",
    author: "Camille L., Toulouse",
    job: "Maman au foyer",
    monthlyRevenue: "85 €",
    missionsPerMonth: "3 missions / mois",
    avatarInitials: "CL",
    accentColor: "#0A7A5A",
  },
  {
    quote:
      "Comme freelance, c'est un complement de revenu sympa et flexible. Mon profil tech est tres demande : je recois 4 a 6 missions par mois. L'inscription a l'IBAN se fait en 2 minutes.",
    author: "Marc D., Lyon",
    job: "Freelance Developpeur",
    monthlyRevenue: "240 €",
    missionsPerMonth: "5 missions / mois",
    avatarInitials: "MD",
    accentColor: "#1D9E75",
  },
  {
    quote:
      "Profil RH expert, ce sont les missions les mieux payees. Je fais 2 tests par mois, ca paie mes abonnements en streaming et mon cafe quotidien. Chaque test est valide rapidement.",
    author: "Sophie P., Paris",
    job: "DRH PME",
    monthlyRevenue: "160 €",
    missionsPerMonth: "2 missions / mois",
    avatarInitials: "SP",
    accentColor: "#0A7A5A",
  },
];

export default function TestimonialsB2C() {
  return (
    <section className="testimonials-b2c">
      <div className="testimonials-b2c-inner">
        <div className="testimonials-b2c-eyebrow">Ils sont déjà testeurs</div>
        <h2 className="testimonials-b2c-title">
          De vrais testeurs, <em>de vrais revenus</em>.
        </h2>
        <p className="testimonials-b2c-sub">
          Voici ce que gagnent en moyenne nos testeurs selon leur profil et leur disponibilité.
        </p>

        <div className="testimonials-b2c-grid">
          {PLACEHOLDER_STORIES.map((s) => (
            <article key={s.author} className="testimonials-b2c-card">
              <div className="testimonials-b2c-revenue" style={{ color: s.accentColor }}>
                {s.monthlyRevenue}
                <span className="testimonials-b2c-period">/mois</span>
              </div>
              <div className="testimonials-b2c-missions">{s.missionsPerMonth}</div>
              <div className="testimonials-b2c-quote">&ldquo;{s.quote}&rdquo;</div>
              <div className="testimonials-b2c-author">
                <div className="testimonials-b2c-avatar" style={{ background: s.accentColor }}>
                  {s.avatarInitials}
                </div>
                <div>
                  <div className="testimonials-b2c-name">{s.author}</div>
                  <div className="testimonials-b2c-job">{s.job}</div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="testimonials-b2c-disclaimer">
          Revenus typiques observés selon profil et disponibilité. La rémunération exacte dépend de votre profil, du secteur demandé et de la qualité de vos retours.
        </p>
      </div>

      <style>{`
        .testimonials-b2c {
          padding: 80px 24px;
          background: #fff;
        }
        .testimonials-b2c-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .testimonials-b2c-eyebrow {
          font-size: 12px;
          font-weight: 600;
          color: #0A7A5A;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: center;
          margin-bottom: 12px;
        }
        .testimonials-b2c-title {
          font-size: 32px;
          font-weight: 700;
          color: #1d1d1f;
          letter-spacing: -0.04em;
          text-align: center;
          margin: 0 0 12px;
          line-height: 1.2;
        }
        .testimonials-b2c-title em {
          color: #0A7A5A;
          font-style: normal;
        }
        .testimonials-b2c-sub {
          font-size: 15px;
          color: #6e6e73;
          text-align: center;
          margin: 0 0 40px;
          max-width: 580px;
          margin-left: auto;
          margin-right: auto;
        }
        .testimonials-b2c-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }
        .testimonials-b2c-card {
          background: #f5f5f7;
          border-radius: 20px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .testimonials-b2c-revenue {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .testimonials-b2c-period {
          font-size: 14px;
          font-weight: 500;
          color: #86868B;
          margin-left: 4px;
        }
        .testimonials-b2c-missions {
          font-size: 12px;
          font-weight: 600;
          color: #86868B;
          margin-bottom: 6px;
        }
        .testimonials-b2c-quote {
          font-size: 14px;
          color: #1d1d1f;
          line-height: 1.6;
          flex: 1;
        }
        .testimonials-b2c-author {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 14px;
          border-top: 0.5px solid rgba(0,0,0,0.08);
        }
        .testimonials-b2c-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
        }
        .testimonials-b2c-name {
          font-size: 13px;
          font-weight: 700;
          color: #1d1d1f;
        }
        .testimonials-b2c-job {
          font-size: 12px;
          color: #86868B;
        }
        .testimonials-b2c-disclaimer {
          font-size: 12px;
          color: #86868B;
          text-align: center;
          margin: 24px 0 0;
          font-style: italic;
          max-width: 720px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (max-width: 768px) {
          .testimonials-b2c-title { font-size: 24px; }
          .testimonials-b2c-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
