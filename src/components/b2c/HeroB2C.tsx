"use client";

export default function HeroB2C() {
  return (
    <section className="hero-b2c">
      <div className="hero-b2c-inner">
        <div className="hero-badge-b2c">
          <span className="earn-badge">Jusqu&apos;à 100€</span> par mission · Payé sous 72h
        </div>
        <h1>Devenir testeur rémunéré.<br /><em>Donnez votre avis, gagnez de l&apos;argent.</em></h1>
        <p className="hero-sub-b2c">
          Rejoignez le panel de 500+ testeurs earlypanel. Recevez des missions sur des applications et sites web adaptées à votre profil — répondez aux questions depuis chez vous, à votre rythme.
        </p>
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
          <div><div className="hero-perk-n">500+</div><div className="hero-perk-l">testeurs dans le panel</div></div>
        </div>
      </div>
    </section>
  );
}
