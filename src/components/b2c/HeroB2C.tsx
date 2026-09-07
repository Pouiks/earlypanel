"use client";

/**
 * Hero testeurs. On affiche la fourchette reelle (15 a 100 EUR) des le hero
 * plutot que "jusqu'a 100 EUR" seul : la mission moyenne est bien en dessous
 * du plafond, et une sur-promesse ici finit en avis negatif.
 */
export default function HeroB2C() {
  return (
    <section className="hero-b2c">
      <div className="hero-b2c-inner">
        <div className="hero-badge-b2c">
          <span className="earn-badge">15 à 100 €</span> par mission · Payé sous 72h
        </div>
        <h1>Testez des produits, <em>gagnez un complément de revenu.</em></h1>
        <p className="hero-sub-b2c">
          earlypanel met en relation des entreprises qui veulent valider leur produit avec des testeurs d&apos;applications et de sites internet comme vous. Chaque mission consiste à essayer un site, une app ou une maquette, puis à répondre à quelques questions précises sur ce que vous avez vécu. C&apos;est tout. Un test rémunéré à domicile, quand ça vous arrange.</p>
        <button
          className="btn-green-big"
          onClick={() => document.getElementById("register")?.scrollIntoView({ behavior: "smooth" })}
        >
          Rejoindre le panel gratuitement →
        </button>
        <p className="hero-note">Inscription gratuite · Sans engagement · Votre profil détermine vos missions</p>
        <div className="hero-perks">
          <div><div className="hero-perk-n">25 min</div><div className="hero-perk-l">durée moyenne par mission</div></div>
          <div><div className="hero-perk-n">72h</div><div className="hero-perk-l">délai de paiement</div></div>
          <div><div className="hero-perk-n">15 à 100 €</div><div className="hero-perk-l">par mission, selon votre profil</div></div>
          <div><div className="hero-perk-n">85+</div><div className="hero-perk-l">testeurs sélectionnés à la main</div></div>
        </div>
      </div>
    </section>
  );
}
