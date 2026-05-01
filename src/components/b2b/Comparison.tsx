/**
 * Section differenciation : earlypanel vs alternatives.
 *
 * Argument moat : NDA contractualise + atelier de cadrage offert +
 * paiement a la livraison. C'est ce qu'aucun outil SaaS-only ne peut
 * faire car ils n'ont pas d'humain dans la boucle.
 *
 * IMPORTANT cote legal : afficher des concurrents nommes en comparatif
 * est legal en France si :
 *   - les comparaisons sont objectives, verifiables, et non trompeuses
 *   - on ne denigre pas explicitement
 *   - les marques ne sont pas modifiees
 * Cf. Code de la consommation, art. L.121-8 et suivants. On reste donc
 * neutre et factuel : on ne dit pas "ils sont moins bien" mais "voila
 * ce qu'on offre en plus".
 */

interface Feature {
  label: string;
  /** Icone visible : ✓ vert ou — gris */
  earlypanel: boolean;
  saasTools: boolean;
  freelance: boolean;
  description?: string;
}

const FEATURES: Feature[] = [
  {
    label: "Sélection manuelle des testeurs (par profil métier)",
    earlypanel: true,
    saasTools: false,
    freelance: true,
  },
  {
    label: "NDA signé contractualisé (preuve juridique eIDAS)",
    earlypanel: true,
    saasTools: false,
    freelance: false,
  },
  {
    label: "Atelier de cadrage offert avant la mission",
    earlypanel: true,
    saasTools: false,
    freelance: true,
  },
  {
    label: "Rapport rédigé et restitution incluse",
    earlypanel: true,
    saasTools: false,
    freelance: true,
  },
  {
    label: "Paiement à la livraison (50/50)",
    earlypanel: true,
    saasTools: false,
    freelance: false,
  },
  {
    label: "Délai engagé sur 5 jours ouvrés",
    earlypanel: true,
    saasTools: false,
    freelance: false,
  },
  {
    label: "Pas d'abonnement annuel",
    earlypanel: true,
    saasTools: false,
    freelance: true,
  },
  {
    label: "Profils niches (santé, juridique, finance, IT)",
    earlypanel: true,
    saasTools: false,
    freelance: false,
  },
];

const COLUMNS = [
  { key: "earlypanel", label: "earlypanel", highlighted: true },
  { key: "saasTools", label: "Outils SaaS génériques", highlighted: false },
  { key: "freelance", label: "Freelance UX dédié", highlighted: false },
] as const;

export default function Comparison() {
  return (
    <section className="comparison">
      <div className="comparison-inner">
        <div className="comparison-eyebrow">Pourquoi earlypanel</div>
        <h2 className="comparison-title">
          Ni un <em>SaaS où vous vous débrouillez</em>, ni un <em>freelance facturé à la journée</em>.
        </h2>
        <p className="comparison-sub">
          Les outils SaaS sont rapides mais vous laissent gérer le recrutement, la rédaction et l&apos;analyse. Les freelances UX sont précis mais coûtent plusieurs k€ par mission. earlypanel se positionne entre les deux : la flexibilité d&apos;un service rapide, et un humain qui prend en charge les bouts qui demandent du jugement.
        </p>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="comparison-th-feature"></th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={c.highlighted ? "comparison-th-highlighted" : "comparison-th"}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feat) => (
                <tr key={feat.label}>
                  <td className="comparison-td-feature">{feat.label}</td>
                  {COLUMNS.map((c) => {
                    const value = feat[c.key as keyof Feature] as boolean;
                    return (
                      <td
                        key={c.key}
                        className={`comparison-td ${c.highlighted ? "comparison-td-highlighted" : ""}`}
                      >
                        {value ? (
                          <span className="comparison-yes" aria-label="Inclus">✓</span>
                        ) : (
                          <span className="comparison-no" aria-label="Non inclus">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="comparison-disclaimer">
          Comparatif basé sur les pratiques courantes du marché à 2026. Les outils SaaS de tests utilisateurs varient ; vérifiez les fonctionnalités exactes auprès de chaque éditeur.
        </p>
      </div>

      <style>{`
        .comparison {
          padding: 80px 24px;
          background: #fff;
        }
        .comparison-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .comparison-eyebrow {
          font-size: 12px;
          font-weight: 600;
          color: #0A7A5A;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: center;
          margin-bottom: 12px;
        }
        .comparison-title {
          font-size: 32px;
          font-weight: 700;
          color: #1d1d1f;
          letter-spacing: -0.04em;
          text-align: center;
          margin: 0 0 12px;
          line-height: 1.2;
        }
        .comparison-title em { color: #0A7A5A; font-style: normal; }
        .comparison-sub {
          font-size: 14px;
          color: #6e6e73;
          text-align: center;
          margin: 0 0 40px;
          max-width: 720px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.5;
        }
        .comparison-table-wrapper {
          overflow-x: auto;
          background: #f5f5f7;
          border-radius: 20px;
          padding: 4px;
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
        }
        .comparison-th-feature, .comparison-th, .comparison-th-highlighted {
          padding: 18px 16px;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          color: #1d1d1f;
          background: #fafafa;
          border-bottom: 1px solid rgba(0,0,0,0.08);
        }
        .comparison-th-feature {
          text-align: left;
          width: 40%;
        }
        .comparison-th-highlighted {
          background: #0A7A5A;
          color: #fff;
          letter-spacing: 0.02em;
        }
        .comparison-td-feature, .comparison-td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 0.5px solid rgba(0,0,0,0.05);
        }
        .comparison-td-feature {
          color: #1d1d1f;
          font-weight: 500;
        }
        .comparison-td {
          text-align: center;
          color: #86868B;
        }
        .comparison-td-highlighted {
          background: rgba(10, 122, 90, 0.04);
        }
        .comparison-yes {
          color: #0A7A5A;
          font-size: 18px;
          font-weight: 700;
        }
        .comparison-no {
          color: #cfcfd2;
          font-size: 18px;
          font-weight: 700;
        }
        .comparison-table tbody tr:last-child td { border-bottom: none; }
        .comparison-disclaimer {
          font-size: 11px;
          color: #86868B;
          text-align: center;
          margin: 16px 0 0;
          font-style: italic;
        }
        @media (max-width: 768px) {
          .comparison-title { font-size: 22px; }
          .comparison-th, .comparison-th-highlighted, .comparison-th-feature {
            font-size: 11px; padding: 12px 8px;
          }
          .comparison-td-feature, .comparison-td { font-size: 11px; padding: 10px 8px; }
        }
      `}</style>
    </section>
  );
}
