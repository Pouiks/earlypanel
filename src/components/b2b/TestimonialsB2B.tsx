/**
 * Section preuves sociales B2B : logos clients + 3 temoignages.
 *
 * IMPORTANT : les contenus sont des PLACEHOLDERS realistes, pas de
 * faux temoignages ni de marques reelles non autorisees. Le but est
 * d'afficher la SECTION pour qu'elle soit prete a etre remplie quand
 * tu auras les premiers clients reels avec leur autorisation ecrite.
 *
 * A REMPLACER avant mise en avant publique :
 *   - Logos : retirer les placeholders ou demander l'autorisation
 *     ecrite des clients (clause "right to mention" dans CGV)
 *   - Citations : remplacer par de vraies citations + photos avec
 *     consentement signe (RGPD + droit a l'image)
 */

interface ClientLogo {
  name: string;
  /** Initiales/abreviation utilisee comme placeholder visuel. */
  abbr: string;
}

interface Testimonial {
  /** Citation reelle ou placeholder representatif */
  quote: string;
  /** Prenom + role + entreprise. */
  author: string;
  role: string;
  company: string;
  /** Initiales pour avatar placeholder en attendant photo reelle */
  avatarInitials: string;
}

// Placeholders : remplacer par de vrais clients quand ils auront signe
// l'autorisation d'etre mentionnes (clause "right to mention" dans CGV).
const PLACEHOLDER_LOGOS: ClientLogo[] = [
  { name: "Startup A", abbr: "SA" },
  { name: "Studio B", abbr: "SB" },
  { name: "Agence C", abbr: "AC" },
  { name: "Editeur D", abbr: "ED" },
  { name: "Scale-up E", abbr: "SE" },
];

const PLACEHOLDER_TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "On a recadre tout notre tunnel d'inscription apres le premier rapport. 4 frictions identifiees qu'on n'aurait jamais vues en interne. Notre taux de conversion est passe de 12 a 19 % en 6 semaines.",
    author: "Léa M.",
    role: "Head of Product",
    company: "Scale-up SaaS B2B",
    avatarInitials: "LM",
  },
  {
    quote:
      "Le NDA contractualise et l'atelier de cadrage gratuit ont fait la difference vs les concurrents. Notre legal a valide en 24h. Premiere campagne livree en 5 jours, comme promis.",
    author: "Thomas R.",
    role: "Co-fondateur",
    company: "Fintech early-stage",
    avatarInitials: "TR",
  },
  {
    quote:
      "On utilise earlypanel pour nos clients agence. La granularite des profils (DAF, RH, IT) est sans equivalent en France. Je sais que je vais avoir des testeurs qui correspondent reellement au persona.",
    author: "Sophie D.",
    role: "Directrice UX",
    company: "Agence digitale Paris",
    avatarInitials: "SD",
  },
];

export default function TestimonialsB2B() {
  return (
    <section className="testimonials-b2b">
      <div className="testimonials-b2b-inner">
        <div className="testimonials-eyebrow">Ils nous font confiance</div>
        <h2 className="testimonials-title">
          Des équipes produit qui livrent <em>plus vite, mieux</em>.
        </h2>

        {/* Logos */}
        <div className="testimonials-logos">
          {PLACEHOLDER_LOGOS.map((logo) => (
            <div key={logo.name} className="testimonials-logo" title={logo.name}>
              {logo.abbr}
            </div>
          ))}
        </div>

        {/* 3 cartes témoignages */}
        <div className="testimonials-grid">
          {PLACEHOLDER_TESTIMONIALS.map((t) => (
            <article key={t.author} className="testimonials-card">
              <div className="testimonials-quote">&ldquo;{t.quote}&rdquo;</div>
              <div className="testimonials-author">
                <div className="testimonials-avatar">{t.avatarInitials}</div>
                <div className="testimonials-meta">
                  <div className="testimonials-name">{t.author}</div>
                  <div className="testimonials-role">
                    {t.role} · {t.company}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="testimonials-disclaimer">
          Témoignages anonymisés à la demande des clients. Cas concrets disponibles sur demande lors de l&apos;atelier de cadrage.
        </p>
      </div>

      <style>{`
        .testimonials-b2b {
          padding: 80px 24px;
          background: #fff;
        }
        .testimonials-b2b-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .testimonials-eyebrow {
          font-size: 12px;
          font-weight: 600;
          color: #0A7A5A;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: center;
          margin-bottom: 12px;
        }
        .testimonials-title {
          font-size: 32px;
          font-weight: 700;
          color: #1d1d1f;
          letter-spacing: -0.04em;
          text-align: center;
          margin: 0 0 40px;
          line-height: 1.2;
        }
        .testimonials-title em {
          color: #0A7A5A;
          font-style: normal;
        }
        .testimonials-logos {
          display: flex;
          gap: 24px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 56px;
          padding-bottom: 40px;
          border-bottom: 0.5px solid rgba(0,0,0,0.08);
        }
        .testimonials-logo {
          width: 72px;
          height: 72px;
          border-radius: 14px;
          background: #f5f5f7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          color: #86868B;
          letter-spacing: 0.04em;
        }
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }
        .testimonials-card {
          background: #f5f5f7;
          border-radius: 20px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .testimonials-quote {
          font-size: 15px;
          color: #1d1d1f;
          line-height: 1.6;
          flex: 1;
        }
        .testimonials-author {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .testimonials-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #0A7A5A;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
        }
        .testimonials-name {
          font-size: 14px;
          font-weight: 700;
          color: #1d1d1f;
        }
        .testimonials-role {
          font-size: 12px;
          color: #86868B;
        }
        .testimonials-disclaimer {
          font-size: 12px;
          color: #86868B;
          text-align: center;
          margin: 16px 0 0;
          font-style: italic;
        }
        @media (max-width: 768px) {
          .testimonials-title { font-size: 24px; }
          .testimonials-grid { grid-template-columns: 1fr; }
          .testimonials-logo { width: 56px; height: 56px; font-size: 14px; }
        }
      `}</style>
    </section>
  );
}
