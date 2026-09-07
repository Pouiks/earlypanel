/**
 * Secteurs : trois, pas quinze. "Tous les secteurs" = aucun secteur ; une
 * healthtech ne se sent pas plus concernee qu'un e-commercant.
 *
 * `proof` est optionnel : des que le panel a des chiffres reels ("12
 * professionnels de sante"), les renseigner ici. Tant qu'il est null, on
 * affiche la description qualitative seule. Ne jamais mettre un chiffre
 * qu'on ne peut pas prouver en sortant un export testeurs.
 */
const SECTORS: { name: string; desc: string; proof: string | null }[] = [
  {
    name: "SaaS B2B et outils métier",
    desc: "Onboarding, dashboards, workflows de facturation, RH ou gestion : nos testeurs manipulent des outils pro au quotidien.",
    proof: null,
  },
  {
    name: "Santé",
    desc: "Praticiens libéraux, personnel hospitalier, patients : des profils rares que les panels ouverts n'ont pas.",
    proof: null,
  },
  {
    name: "Finance, assurance et juridique",
    desc: "DAF, comptables, courtiers, juristes : pour tester un produit réglementé avec des gens qui connaissent la contrainte.",
    proof: null,
  },
];

export default function SectorPills() {
  return (
    <section className="sectors">
      <div className="sectors-inner">
        <div className="sec-eye">Secteurs</div>
        <h2 className="sec-title">Trois secteurs où notre panel est vraiment fort.</h2>
        <p className="sec-sub">
          On peut recruter ailleurs, mais c&apos;est ici que la sélection manuelle fait la différence face à un panel grand public.
        </p>
        <div className="sector-cards">
          {SECTORS.map((s) => (
            <article key={s.name} className="sector-card">
              <h3>{s.name}</h3>
              <p>{s.desc}</p>
              {s.proof && <span className="sector-proof">{s.proof}</span>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
