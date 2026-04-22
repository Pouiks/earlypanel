export default function EarnSection() {
  return (
    <section className="earn">
      <div className="earn-inner">
        <div className="earn-left">
          <div className="sec-eye">Rémunération</div>
          <h2>
            Jusqu&apos;à <span style={{ color: "var(--primary)" }}>100€</span> par test,
            <br />selon votre profil.
          </h2>
          <p>
            Chaque test est rémunéré. Le montant dépend de la rareté de votre profil,
            de la durée de la mission et du secteur demandé par le client.
          </p>
          <p style={{ fontSize: "13px", color: "var(--gray-light)", lineHeight: 1.6 }}>
            Après votre inscription, vous découvrez votre fourchette personnalisée dans votre espace.
            Le paiement est effectué par virement bancaire sécurisé ; vous êtes responsable de la
            déclaration fiscale de vos revenus complémentaires.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 20,
            padding: "28px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", letterSpacing: 0.4, textTransform: "uppercase" }}>
            Les tests les mieux payés
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
            {[
              { t: "Profils niche (direction, médical, juridique…)", d: "Les plus recherchés, les plus rémunérateurs." },
              { t: "Experts métiers (RH, IT, finance, produit…)", d: "Votre expérience terrain vaut de l’or." },
              { t: "Utilisateurs digitaux confirmés", d: "Vous manipulez des outils pro au quotidien." },
              { t: "Grand public", d: "Accessible à tous, essentiel pour valider un produit." },
            ].map((r) => (
              <li key={r.t} style={{ display: "flex", gap: 12 }}>
                <span
                  aria-hidden
                  style={{
                    width: 22, height: 22, flexShrink: 0, borderRadius: 999,
                    background: "var(--primary)", color: "#fff",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, marginTop: 2,
                  }}
                >
                  ✓
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>{r.t}</div>
                  <div style={{ fontSize: 12, color: "var(--gray-light)", marginTop: 2 }}>{r.d}</div>
                </div>
              </li>
            ))}
          </ul>
          <div
            style={{
              marginTop: 4,
              padding: "14px 16px",
              background: "#f0faf5",
              border: "1px solid rgba(10,122,90,0.2)",
              borderRadius: 12,
              fontSize: 13,
              color: "#0A7A5A",
              lineHeight: 1.5,
            }}
          >
            Votre fourchette exacte vous est communiquée dans votre espace
            après votre inscription et peut évoluer en fonction de la qualité de vos retours.
          </div>
        </div>
      </div>
    </section>
  );
}
