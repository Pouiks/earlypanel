"use client";

export default function HeroB2C() {
  return (
    <section className="hero-b2c">
      <div className="hero-b2c-inner">
        <div className="hero-badge-b2c">
          <span className="earn-badge">Jusqu&apos;à 100€</span> par mission · Payé sous 72h
        </div>
        <h1>Testez des produits, <em>gagnez un complément de revenu.</em></h1>
        <p className="hero-sub-b2c">
          earlypanel met en relation des entreprises qui veulent valider leur produit avec des testeurs comme vous. Chaque mission consiste à essayer un site, une app ou une maquette, puis à répondre à quelques questions précises sur ce que vous avez vécu. C&apos;est tout. Vous le faites depuis chez vous, quand ça vous arrange.</p>
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
          <div><div className="hero-perk-n">100€</div><div className="hero-perk-l">max par mission</div></div>
          <div><div className="hero-perk-n">75+</div><div className="hero-perk-l">testeurs dans le panel</div></div>
        </div>
      </div>
    </section>
  );
}
