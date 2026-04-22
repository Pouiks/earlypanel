import { BOOKING_URL, CONTACT_MAILTO } from "@/lib/cta-links";

export default function CtaFinal() {
  return (
    <section className="cta-final">
      <h2>Prêt à entendre<br /><em>vos vrais utilisateurs ?</em></h2>
      <p>Un atelier de cadrage gratuit de 15 min pour démarrer. Réponse sous 24h.</p>
      <div className="cta-btns">
        <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark">Réserver un appel gratuit →</a>
        <a href={CONTACT_MAILTO} className="btn-outline">Nous écrire</a>
      </div>
    </section>
  );
}
