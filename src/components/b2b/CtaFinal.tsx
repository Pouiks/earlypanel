import { BOOKING_DURATION_MIN, CONTACT_MAILTO } from "@/lib/cta-links";
import BookingCta from "@/components/b2b/BookingCta";

export default function CtaFinal() {
  return (
    <section className="cta-final">
      <h2>Vous voulez voir ce que vos utilisateurs <em>pensent vraiment</em> de votre produit ?</h2>
      <p>Un appel de {BOOKING_DURATION_MIN} min suffit pour qu&apos;on en discute. Pas d&apos;engagement, pas de présentation commerciale. On regarde simplement si ça a du sens pour vous.</p>
      <div className="cta-btns">
        <BookingCta className="btn-dark" />
        <a href={CONTACT_MAILTO} className="btn-outline">Nous écrire</a>
      </div>
    </section>
  );
}
