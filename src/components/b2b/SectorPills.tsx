const sectors = [
  "SaaS B2B", "E-commerce", "Fintech", "Healthtech", "RH & recrutement",
  "Logistique", "Éducation", "Immobilier", "Juridique & compliance",
  "Marketplace", "Application mobile", "Industrie 4.0", "Assurance",
  "Banque & crédit", "Retail & grande distribution",
];

export default function SectorPills() {
  return (
    <section className="sectors">
      <div className="sectors-inner">
        <div className="sec-eye">Secteurs</div>
        <div className="sec-title">On teste pour tous les secteurs.</div>
        <div className="sector-pills">
          {sectors.map((s) => (
            <div key={s} className="sector-pill">{s}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
