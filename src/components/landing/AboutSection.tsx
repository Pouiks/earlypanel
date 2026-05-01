import { BOOKING_URL, CONTACT_EMAIL } from "@/lib/cta-links";

/**
 * Section "Qui est derriere earlypanel" — placee juste avant le footer
 * sur la home. Humanise le projet (fondateur identifie, contact direct)
 * dans une phase ou il n'y a pas encore de portfolio client a montrer.
 */
export default function AboutSection() {
  return (
    <section className="about">
      <div className="about-inner">
        <div className="sec-eye">Qui est derrière earlypanel</div>
        <h2 className="sec-title">
          Pourquoi <em>earlypanel</em>.
        </h2>
        <p className="about-lede">
          Earlypanel est lancé en 2026 par Virgile Joinville, après plusieurs années à voir des produits déployés sans validation utilisateur. Le constat : les équipes produit savent faire, mais elles n&apos;ont jamais le temps de tester. earlypanel s&apos;occupe de cette partie, pour qu&apos;elles gardent leur temps pour ce qu&apos;elles font de mieux.
        </p>
        <p className="about-contact">
          Vous pouvez me joindre directement à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          {", "}
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">réserver un appel</a>
          {" "}ou suivre earlypanel sur{" "}
          <a href="https://www.linkedin.com/company/earlypanel/" target="_blank" rel="noopener noreferrer">LinkedIn</a>.
        </p>
      </div>
    </section>
  );
}
