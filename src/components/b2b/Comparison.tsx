import { PRICE_RANGE_LABEL } from "@/lib/cta-links";
import { glossify } from "@/components/ui/glossify";

/**
 * Section differenciation : pourquoi un service plutot qu'un outil.
 *
 * Prix : une seule formulation sur tout le site. Un forfait FIXE par
 * mission, chiffre sur devis apres l'atelier de cadrage, dans la fourchette
 * publique de la FAQ. "Forfait" et "devis" ne se contredisent pas : le
 * devis fixe le forfait, il n'y a pas de facturation au temps passe.
 */
export default function Comparison() {
  return (
    <section className="comparison">
      <div className="comparison-inner">
        <div className="comparison-eyebrow">Service de test UX vs outil self-service</div>
        <h2 className="comparison-title">
          Pourquoi un <em>service</em>&nbsp;plutôt qu&apos;un outil
        </h2>
        <p className="comparison-sub">
          {glossify(`Vos équipes savent ce qu'elles veulent valider. Elles n'ont juste pas le temps de faire le recrutement des testeurs, écrire les questions, lire les retours et en tirer un rapport d'expérience utilisateur exploitable. earlypanel prend en charge ces étapes, en 5 jours ouvrés, sur devis (devis sous 48h, généralement ${PRICE_RANGE_LABEL} selon le nombre et la rareté des profils), pour que vos équipes gardent leur temps pour ce qu'elles font de mieux.`)}
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
