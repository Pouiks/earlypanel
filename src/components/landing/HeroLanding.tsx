import QuestionnaireWidget from "./QuestionnaireWidget";
import { BOOKING_URL } from "@/lib/cta-links";

/**
 * Hero home : cible unique = equipe produit / fondateur qui doit decider.
 * H1 = mot-cle ("tests utilisateurs") + cible + differenciation (rapport,
 * pas tableur). Deux CTA : l'appel (engagement fort) et le rapport
 * d'exemple (friction basse) pour le visiteur qui ne nous connait pas.
 */
export default function HeroLanding() {
  return (
    <section className="hero-wrap">
      <div className="hero-index">
        <div>
          <div className="h-eyebrow">Tests utilisateurs B2B · Pour équipes produit</div>
          <h1>Tests utilisateurs clés en main pour équipes produit&nbsp;: <em>le rapport, pas le tableur.</em></h1>
          <p className="hero-sub-index">
            On recrute des testeurs qui ressemblent à vos vrais utilisateurs, on écrit le questionnaire avec vous, on lit chaque réponse, et vous recevez un rapport rédigé avec les frictions à corriger. Vous décidez, on fait le reste.
          </p>
          <div className="hero-btns">
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark">Réserver un appel gratuit →</a>
            <a href="#rapport" className="btn-outline">Voir un rapport d&apos;exemple</a>
          </div>
        </div>
        <figure className="hero-right">
          <QuestionnaireWidget />
          <figcaption className="sr-only">
            Exemple de questionnaire earlypanel : un testeur décrit précisément l&apos;étape où il s&apos;est arrêté dans un parcours d&apos;onboarding de logiciel de facturation, puis dans un tunnel de paiement e-commerce et un dashboard RH.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
