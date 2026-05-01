import { BOOKING_URL, CONTACT_MAILTO } from "@/lib/cta-links";

export default function CtaFinal() {
  return (
    <section className="cta-final">
      <h2>Vous voulez voir ce que vos utilisateurs <em>pensent vraiment</em> de votre produit ?</h2>
      <p>Un appel de 15 min suffit pour qu&apos;on en discute. Pas d&apos;engagement, pas de présentation commerciale — on regarde si ça a du sens pour vous.</p>
      <div className="cta-btns">
        <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark">Réserver un appel gratuit →</a>
        <a href={CONTACT_MAILTO} className="btn-outline">Nous écrire</a>
      </div>
    </section>
  );
}
