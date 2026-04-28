import Link from "next/link";

/**
 * Tableau tarifs B2B : 3 packs visibles avant le formulaire.
 *
 * Source de verite des montants : le formulaire BriefForm.tsx (a maintenir
 * en phase). Si tu changes les tarifs, change-les aux 2 endroits.
 */

interface Pack {
  name: string;
  price: string;
  unit: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
}

const PACKS: Pack[] = [
  {
    name: "Quick Test",
    price: "700",
    unit: "€ HT",
    description: "Validation rapide d'une hypothèse produit ou d'un parcours unique.",
    features: [
      "5 testeurs sélectionnés",
      "1 cas d'usage testé",
      "Délai 3 jours ouvrés",
      "Rapport synthétique PDF",
      "NDA signé inclus",
    ],
    cta: { label: "Démarrer Quick Test", href: "https://calendly.com/earlypanel/demo" },
  },
  {
    name: "Standard",
    price: "1 200",
    unit: "€ HT",
    description: "Le pack le plus utilisé. Idéal pour valider un MVP ou un produit en croissance.",
    features: [
      "10 testeurs sélectionnés",
      "Jusqu'à 3 cas d'usage",
      "Délai 5 jours ouvrés",
      "Rapport complet + verbatims",
      "Atelier de cadrage offert",
      "NDA signé inclus",
    ],
    cta: { label: "Démarrer Standard", href: "https://calendly.com/earlypanel/demo" },
    highlighted: true,
  },
  {
    name: "Expert",
    price: "2 200",
    unit: "€ HT",
    description: "Pour les produits complexes et les profils niches (santé, finance, juridique).",
    features: [
      "20 testeurs ciblés (profils niche)",
      "Jusqu'à 5 cas d'usage",
      "Délai 5 jours ouvrés",
      "Rapport + matrice impact/effort",
      "Analyse IA pré-test incluse",
      "Atelier de cadrage offert",
      "NDA signé inclus",
    ],
    cta: { label: "Démarrer Expert", href: "https://calendly.com/earlypanel/demo" },
  },
];

export default function PricingTable() {
  return (
    <section className="pricing-b2b" id="tarifs">
      <div className="pricing-b2b-inner">
        <div className="pricing-eyebrow">Tarifs transparents</div>
        <h2 className="pricing-title">
          3 packs pour <em>chaque besoin</em>.
        </h2>
        <p className="pricing-sub">
          Tarifs forfaitaires. Atelier de cadrage offert. NDA signé avant tout échange. Paiement 50% à la commande, 50% à la livraison.
        </p>

        <div className="pricing-grid">
          {PACKS.map((pack) => (
            <article
              key={pack.name}
              className={`pricing-card ${pack.highlighted ? "pricing-card--highlighted" : ""}`}
            >
              {pack.highlighted && <div className="pricing-badge">Le plus choisi</div>}
              <h3 className="pricing-pack-name">{pack.name}</h3>
              <div className="pricing-amount">
                {pack.price}
                <span className="pricing-unit">{pack.unit}</span>
              </div>
              <p className="pricing-description">{pack.description}</p>
              <ul className="pricing-features">
                {pack.features.map((f) => (
                  <li key={f}>
                    <span className="pricing-check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={pack.cta.href}
                className={`pricing-cta ${pack.highlighted ? "pricing-cta--primary" : "pricing-cta--secondary"}`}
              >
                {pack.cta.label} →
              </Link>
            </article>
          ))}
        </div>

        <p className="pricing-footnote">
          Besoin spécifique ou volumes plus importants ? <Link href="https://calendly.com/earlypanel/demo">Réservez un appel</Link> pour un devis sur mesure.
        </p>
      </div>

      <style>{`
        .pricing-b2b {
          padding: 80px 24px;
          background: #f5f5f7;
        }
        .pricing-b2b-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .pricing-eyebrow {
          font-size: 12px;
          font-weight: 600;
          color: #0A7A5A;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: center;
          margin-bottom: 12px;
        }
        .pricing-title {
          font-size: 32px;
          font-weight: 700;
          color: #1d1d1f;
          letter-spacing: -0.04em;
          text-align: center;
          margin: 0 0 12px;
          line-height: 1.2;
        }
        .pricing-title em { color: #0A7A5A; font-style: normal; }
        .pricing-sub {
          font-size: 14px;
          color: #6e6e73;
          text-align: center;
          margin: 0 0 40px;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.5;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }
        .pricing-card {
          background: #fff;
          border-radius: 20px;
          padding: 32px 28px;
          border: 0.5px solid rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 200ms;
        }
        .pricing-card--highlighted {
          border: 2px solid #0A7A5A;
          box-shadow: 0 12px 40px rgba(10, 122, 90, 0.12);
          transform: scale(1.02);
        }
        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #0A7A5A;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 5px 14px;
          border-radius: 980px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .pricing-pack-name {
          font-size: 18px;
          font-weight: 700;
          color: #1d1d1f;
          margin: 0 0 8px;
        }
        .pricing-amount {
          font-size: 38px;
          font-weight: 700;
          color: #1d1d1f;
          letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 12px;
        }
        .pricing-unit {
          font-size: 14px;
          font-weight: 500;
          color: #86868B;
          margin-left: 4px;
        }
        .pricing-description {
          font-size: 13px;
          color: #6e6e73;
          line-height: 1.5;
          margin: 0 0 24px;
          min-height: 56px;
        }
        .pricing-features {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }
        .pricing-features li {
          font-size: 13px;
          color: #1d1d1f;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.5;
        }
        .pricing-check {
          color: #0A7A5A;
          font-weight: 700;
          flex-shrink: 0;
        }
        .pricing-cta {
          display: block;
          padding: 12px 20px;
          border-radius: 980px;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          text-decoration: none;
          transition: all 200ms;
        }
        .pricing-cta--primary {
          background: #0A7A5A;
          color: #fff;
        }
        .pricing-cta--primary:hover { background: #086949; }
        .pricing-cta--secondary {
          background: #fff;
          color: #0A7A5A;
          border: 1.5px solid #0A7A5A;
        }
        .pricing-cta--secondary:hover { background: #f0faf5; }
        .pricing-footnote {
          font-size: 13px;
          color: #6e6e73;
          text-align: center;
          margin: 32px 0 0;
        }
        .pricing-footnote a {
          color: #0A7A5A;
          font-weight: 600;
          text-decoration: none;
        }
        @media (max-width: 768px) {
          .pricing-title { font-size: 24px; }
          .pricing-grid { grid-template-columns: 1fr; }
          .pricing-card--highlighted { transform: scale(1); }
        }
      `}</style>
    </section>
  );
}
