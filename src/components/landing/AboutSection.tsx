import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import { BOOKING_URL, CONTACT_EMAIL } from "@/lib/cta-links";

/**
 * Section "Qui est derriere earlypanel" (E-E-A-T).
 *
 * Photo : deposer /public/founder.jpg (carre, 400x400 min). Tant que le
 * fichier est absent, un placeholder aux initiales est affiche (server
 * component : la verification se fait au build, pas dans le navigateur).
 * `credentials` : 2 a 3 lignes de credibilite produit (postes tenus,
 * produits lances). Vide = rien d'affiche.
 */
const FOUNDER = {
  name: "Virgile Joinville",
  initials: "VJ",
  linkedin: "https://www.linkedin.com/in/virgilejoinville/",
  photo: "/founder.jpg",
  credentials: [] as string[],
};

export default function AboutSection() {
  const hasPhoto = existsSync(join(process.cwd(), "public", "founder.jpg"));
  return (
    <section className="about">
      <div className="about-inner">
        <div className="sec-eye">Qui est derrière earlypanel</div>
        <h2 className="sec-title">
          Pourquoi <em>earlypanel</em>.
        </h2>
        <div className="about-body has-photo">
          {hasPhoto ? (
            <Image
              className="about-photo"
              src={FOUNDER.photo}
              alt={`${FOUNDER.name}, fondateur d'earlypanel`}
              width={160}
              height={160}
            />
          ) : (
            // Placeholder tant que /public/founder.jpg n'existe pas.
            <div className="about-photo about-photo-placeholder" aria-label={`${FOUNDER.name}, fondateur d'earlypanel`} role="img">
              {FOUNDER.initials}
            </div>
          )}
          <div>
            <p className="about-lede">
              earlypanel est lancé en 2026 par <a href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer">{FOUNDER.name}</a>, après plusieurs années à voir des produits déployés sans validation utilisateur. Le constat : les équipes produit savent faire, mais elles n&apos;ont jamais le temps de tester. earlypanel s&apos;occupe de cette partie, pour qu&apos;elles gardent leur temps pour ce qu&apos;elles font de mieux.
            </p>
            {FOUNDER.credentials.length > 0 && (
              <ul className="about-credentials">
                {FOUNDER.credentials.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            <p className="about-contact">
              Vous pouvez me joindre directement à{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              {", "}
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">réserver un appel</a>
              {", "}
              me suivre sur{" "}
              <a href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              {" "}ou suivre la{" "}
              <a href="https://www.linkedin.com/company/earlypanel/" target="_blank" rel="noopener noreferrer">page earlypanel</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
