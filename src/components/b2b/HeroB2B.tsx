import { BOOKING_URL } from "@/lib/cta-links";

export default function HeroB2B() {
  return (
    <section className="hero-b2b">
      <div className="hero-badge">
        <div className="hero-badge-dot" />
        Pour les équipes produit &amp; agences
      </div>
      <h1>Faites tester votre produit <em>avant</em> de le déployer.</h1>
      <p className="hero-sub">
        On teste vos maquettes Figma, vos prototypes, vos URLs de recette ou votre produit en prod. On va chercher les bons profils dans notre panel, on construit le questionnaire avec vous, et on vous rend un rapport qui dit quoi corriger en priorité.
      </p>
      <div className="hero-ctas">
        <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark-b2b">Réserver un appel gratuit →</a>
        <a href="#process" className="btn-outline-b2b">Comment ça marche</a>
      </div>
      <div className="hero-stats">
        <div><div className="hero-stat-n">5 j</div><div className="hero-stat-l">Délai habituel de livraison</div></div>
        <div><div className="hero-stat-n">75+</div><div className="hero-stat-l">Testeurs qualifiés dans le panel</div></div>
        <div><div className="hero-stat-n">100%</div><div className="hero-stat-l">Tests validés manuellement</div></div>
        <div><div className="hero-stat-n">NDA</div><div className="hero-stat-l">Confidentialité contractualisée</div></div>
      </div>
    </section>
  );
}
