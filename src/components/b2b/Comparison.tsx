/**
 * Section differenciation : earlypanel vs alternatives.
 *
 * On reste neutre et factuel : on explique pourquoi un service avec un
 * humain dans la boucle resoud des problemes que ni un outil seul ni un
 * freelance seul ne resolvent au meme prix.
 */

export default function Comparison() {
  return (
    <section className="comparison">
      <div className="comparison-inner">
        <div className="comparison-eyebrow">Pourquoi earlypanel</div>
        <h2 className="comparison-title">
          Pourquoi un <em>service</em>&nbsp;plutôt qu&apos;un outil
        </h2>
        <p className="comparison-sub">
          Vos équipes savent ce qu&apos;elles veulent valider. Elles n&apos;ont juste pas le temps de recruter les testeurs, écrire les questions, lire les retours et en tirer un rapport exploitable. earlypanel prend en charge ces étapes, en 5 jours ouvrés, à un tarif forfaitaire, pour que vos équipes gardent leur temps pour ce qu&apos;elles font de mieux.
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
          margin: 0 auto;
          max-width: 720px;
          line-height: 1.5;
        }
        @media (max-width: 768px) {
          .comparison-title { font-size: 22px; }
        }
      `}</style>
    </section>
  );
}
