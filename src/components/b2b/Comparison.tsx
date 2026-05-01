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
          Pourquoi un <em>service</em> plutôt qu&apos;un outil
        </h2>
        <p className="comparison-sub">
          Les outils SaaS sont rapides mais vous laissent gérer le recrutement, la rédaction et l&apos;analyse. Les freelances UX sont précis mais coûtent plusieurs k€ par mission. earlypanel se positionne entre les deux : la flexibilité d&apos;un service rapide, et un humain qui prend en charge les bouts qui demandent du jugement.
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
