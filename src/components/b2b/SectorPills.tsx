import Link from "next/link";

/**
 * Secteurs : trois, pas quinze. "Tous les secteurs" = aucun secteur ; une
 * healthtech ne se sent pas plus concernee qu'un e-commercant.
 *
 * `proof` est optionnel : des que le panel a des chiffres reels ("12
 * professionnels de sante"), les renseigner ici. Tant qu'il est null, on
 * affiche la description qualitative seule. Ne jamais mettre un chiffre
 * qu'on ne peut pas prouver en sortant un export testeurs.
 */
// Paragraphes de ~40 mots qui decrivent les profils reels du panel : c'est
// ce qui donne du poids semantique a "healthtech", "fintech", "SaaS B2B"
// (une liste de mots isoles n'en a aucun).
const SECTORS: { name: string; desc: string; proof: string | null; href: string; linkLabel: string }[] = [
  {
    name: "SaaS B2B et outils métier",
    href: "/test-utilisateur-saas-b2b",
    linkLabel: "Test utilisateur SaaS B2B",
    desc: "Product managers, responsables RH, comptables, chefs de projet, commerciaux : des testeurs qui passent leurs journées dans un CRM, un outil de facturation ou un dashboard, et qui savent dire pourquoi un onboarding SaaS B2B les perd dès le deuxième écran.",
    proof: null,
  },
  {
    name: "Santé et healthtech",
    href: "/test-utilisateur-sante",
    linkLabel: "Test utilisateur santé",
    desc: "Médecins généralistes, infirmiers libéraux, kinés, pharmaciens, personnel hospitalier, mais aussi patients chroniques : pour tester une application de prise de rendez-vous, un logiciel métier ou un parcours patient avec des gens qui connaissent la réalité d'un cabinet.",
    proof: null,
  },
  {
    name: "Finance, fintech, assurance et juridique",
    href: "/test-utilisateur-fintech",
    linkLabel: "Test utilisateur fintech",
    desc: "DAF, contrôleurs de gestion, experts-comptables, courtiers, juristes d'entreprise, gérants de PME : pour tester un produit fintech, une plateforme de facturation ou un service réglementé avec des utilisateurs qui vivent la contrainte KYC, TVA ou conformité au quotidien.",
    proof: null,
  },
];

export default function SectorPills() {
  return (
    <section className="sectors">
      <div className="sectors-inner">
        <div className="sec-eye">Panel qualifié par secteur : SaaS B2B, santé, finance</div>
        <h2 className="sec-title">Trois secteurs où notre panel est vraiment fort.</h2>
        <p className="sec-sub">
          On peut recruter des testeurs ailleurs, mais c&apos;est ici que la sélection manuelle fait la différence face à un panel grand public.
        </p>
        <div className="sector-cards">
          {SECTORS.map((s) => (
            <article key={s.name} className="sector-card">
              <h3>{s.name}</h3>
              <p>{s.desc}</p>
              {s.proof && <span className="sector-proof">{s.proof}</span>}
              <Link href={s.href} className="sector-link">{s.linkLabel} →</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
