import Link from "next/link";
import { BOOKING_URL } from "@/lib/cta-links";

/**
 * Hero /entreprises.
 *
 * KPI : le chiffre panel (85+) est associe a « selectionnes a la main »,
 * ce qui est le vrai differenciant face aux panels ouverts. Des qu'un pilote
 * est termine, remplacer le premier KPI par un chiffre de resultat
 * (« 23 frictions identifiees sur un onboarding SaaS »).
 */
export default function HeroB2B() {
  return (
    <section className="hero-b2b">
      <div className="hero-badge">
        <div className="hero-badge-dot" />
        Tests utilisateurs à distance · Équipes produit &amp; agences
      </div>
      <h1><span className="h1-kicker">Test utilisateur à distance clés en main.</span> On recrute vos vrais utilisateurs, on les fait tester, on vous remet ce qu&apos;ils ont <em>vraiment</em> pensé.</h1>
      <p className="hero-sub">{"Un test utilisateur à distance sur votre maquette Figma, votre staging ou votre produit en production : on recrute les testeurs à la main, ils font le parcours depuis chez eux, et vous recevez un rapport UX rédigé, pas des données brutes."}</p>
      <div className="hero-ctas">
        <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark-b2b">Réserver un appel gratuit →</a>
        <Link href="/#rapport" className="btn-outline-b2b">Voir un rapport d&apos;exemple</Link>
      </div>
      <div className="hero-stats">
        <div><div className="hero-stat-n">5 j</div><div className="hero-stat-l">Rapport rédigé et restitué, pas des vidéos brutes</div></div>
        <div><div className="hero-stat-n">100%</div><div className="hero-stat-l">Réponses relues par un humain, bâclées refusées</div></div>
        <div><div className="hero-stat-n">85+</div><div className="hero-stat-l">Testeurs sélectionnés à la main</div></div>
        <div><div className="hero-stat-n">NDA</div><div className="hero-stat-l">Signé avant tout échange, côté client et testeurs</div></div>
      </div>
    </section>
  );
}
