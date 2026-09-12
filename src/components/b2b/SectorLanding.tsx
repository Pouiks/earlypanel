import type { ReactNode } from "react";
import Link from "next/link";
import AnnounceBar from "@/components/layout/AnnounceBar";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import Separator from "@/components/ui/Separator";
import FaqAccordion from "@/components/ui/FaqAccordion";
import FaqJsonLd from "@/components/ui/FaqJsonLd";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
import BriefSection from "@/components/b2b/BriefSection";
import CtaFinal from "@/components/b2b/CtaFinal";
import { BOOKING_URL, PRICE_RANGE_LABEL } from "@/lib/cta-links";
import { SITE_URL } from "@/lib/site";
import { glossify } from "@/components/ui/glossify";

export interface FaqItem { q: string; a: string }
export interface Card { title: string; desc: string; example?: string }
export interface Step { title: string; body: string; pill: string }

export interface SectorLandingProps {
  path: string;
  breadcrumbName: string;
  badge: string;
  h1: ReactNode;
  sub: string;
  /** 4 chiffres du hero, meme gabarit que /entreprises. */
  stats?: { n: string; l: string }[];
  /**
   * Section optionnelle "le probleme" (landings par situation) : un H2
   * porteur du mot-cle et deux ou trois paragraphes. Placee juste apres le
   * hero, avant les grilles de cartes.
   */
  problem?: { eyebrow?: string; title: string; paragraphs: string[] };
  profiles: { eyebrow: string; title: string; sub: string; cards: Card[] };
  parcours: { eyebrow: string; title: string; sub: string; cards: Card[] };
  steps: { eyebrow: string; title: string; sub: string; items: Step[] };
  deliverable: { title: string; items: { title: string; body: string }[] };
  guarantees: { title: string; items: { title: string; body: string }[] };
  faq: FaqItem[];
  /** Titre du bloc FAQ. Defaut : "Vos questions sur ce secteur." */
  faqTitle?: string;
  /** Articles et pages a lire ensuite (maillage interne). */
  related?: { href: string; label: string }[];
}

const DEFAULT_STATS = [
  { n: "5 j", l: "Rapport rédigé et restitué, pas des vidéos brutes" },
  { n: "100%", l: "Réponses relues par un humain, bâclées refusées" },
  { n: "8 à 12", l: "Testeurs sélectionnés à la main" },
  { n: "NDA", l: "Signé avant tout échange, côté client et testeurs" },
];

const PersonIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const FlowIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7 12h10M13 8l4 4-4 4" /></svg>
);
const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A7A5A" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
);

/**
 * Gabarit unique des landings B2B : par secteur (SaaS B2B, sante, fintech)
 * et par situation (/test-*, /agences).
 *
 * Meme structure visuelle que /entreprises : hero centre avec badge et
 * chiffres, section "probleme" optionnelle, grilles de cartes (qui teste,
 * ce qu'on teste), etapes, livrable et garanties, formulaire de brief, FAQ
 * balisee, CTA final. Le mot-cle de la page doit apparaitre dans `sub`
 * (100 premiers mots) et dans un H2.
 */
export default function SectorLanding(p: SectorLandingProps) {
  const url = `${SITE_URL}${p.path}`;
  const stats = p.stats ?? DEFAULT_STATS;
  return (
    <>
      <FaqJsonLd items={p.faq} />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", url: SITE_URL },
          { name: "Entreprises", url: `${SITE_URL}/entreprises` },
          { name: p.breadcrumbName, url },
        ]}
      />
      <AnnounceBar />
      <Nav />
      <main>
        <section className="hero-b2b">
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            {p.badge}
          </div>
          <h1>{p.h1}</h1>
          <p className="hero-sub">{p.sub}</p>
          <div className="hero-ctas">
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark-b2b">Réserver un appel gratuit →</a>
            <Link href="/#rapport" className="btn-outline-b2b">Voir un rapport d&apos;exemple</Link>
          </div>
          <div className="hero-stats">
            {stats.map((s) => (
              <div key={s.l}><div className="hero-stat-n">{s.n}</div><div className="hero-stat-l">{s.l}</div></div>
            ))}
          </div>
        </section>

        <Separator />

        {p.problem && (
          <>
            <section className="usecases">
              <div className="uc-inner">
                <div className="sec-eye">{p.problem.eyebrow ?? "Le problème"}</div>
                <h2 className="sec-title">{p.problem.title}</h2>
                {p.problem.paragraphs.map((t) => <p className="sec-sub" key={t}>{glossify(t)}</p>)}
              </div>
            </section>
            <Separator />
          </>
        )}

        <section className="usecases">
          <div className="uc-inner">
            <div className="sec-eye">{p.profiles.eyebrow}</div>
            <h2 className="sec-title">{p.profiles.title}</h2>
            <p className="sec-sub">{glossify(p.profiles.sub)}</p>
            <div className="uc-grid">
              {p.profiles.cards.map((c) => (
                <div className="uc-card" key={c.title}>
                  <div className="uc-icon">{PersonIcon}</div>
                  <h3>{c.title}</h3>
                  <p>{glossify(c.desc)}</p>
                  {c.example && <span className="uc-example">{c.example}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator />

        <section className="usecases">
          <div className="uc-inner">
            <div className="sec-eye">{p.parcours.eyebrow}</div>
            <h2 className="sec-title">{p.parcours.title}</h2>
            <p className="sec-sub">{glossify(p.parcours.sub)}</p>
            <div className="uc-grid">
              {p.parcours.cards.map((c) => (
                <div className="uc-card" key={c.title}>
                  <div className="uc-icon">{FlowIcon}</div>
                  <h3>{c.title}</h3>
                  <p>{glossify(c.desc)}</p>
                  {c.example && <span className="uc-example">{c.example}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator />

        <section className="process">
          <div className="process-inner">
            <div className="sec-eye">{p.steps.eyebrow}</div>
            <h2 className="sec-title">{p.steps.title}</h2>
            <p className="sec-sub">{glossify(p.steps.sub)}</p>
            <div className="steps-grid">
              {p.steps.items.map((s, i) => (
                <div className="step-card" key={s.title} style={i === p.steps.items.length - 1 && p.steps.items.length % 2 === 1 ? { gridColumn: "1 / -1", borderTop: "0.5px solid var(--border)" } : undefined}>
                  <div className="step-num">Étape {String(i + 1).padStart(2, "0")}</div>
                  <h3>{s.title}</h3>
                  <p>{glossify(s.body)}</p>
                  <span className="step-pill">{s.pill}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator />

        <section className="diff-section">
          <div className="diff-inner">
            <div className="diff-left">
              <div className="sec-eye">Le livrable</div>
              <h2 className="sec-title">{p.deliverable.title}</h2>
              <div className="diff-list">
                {p.deliverable.items.map((d) => (
                  <div className="diff-item" key={d.title}>
                    <div className="diff-icon">{CheckIcon}</div>
                    <div>
                      <h3>{d.title}</h3>
                      <p>{glossify(d.body)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="diff-right">
              <p className="compare-caption">{p.guarantees.title}</p>
              <div className="sector-guarantees">
                {p.guarantees.items.map((g) => (
                  <div className="sector-guarantee" key={g.title}>
                    <strong>{g.title}</strong>
                    <p>{glossify(g.body)}</p>
                  </div>
                ))}
              </div>
              <p className="sector-price">
                {glossify(`Forfait fixe par mission, chiffré après un atelier de cadrage offert, généralement ${PRICE_RANGE_LABEL} selon le nombre et la rareté des profils. Rapport rédigé et restitution en visio sous 5 jours ouvrés après lancement.`)}
              </p>
            </div>
          </div>
        </section>

        <Separator />
        <BriefSection />
        <Separator />

        <FaqAccordion eyebrow="Questions fréquentes" title={p.faqTitle ?? "Vos questions sur ce secteur."} items={p.faq} />
        {p.related && p.related.length > 0 && (
          <section className="landing-related">
            <div className="landing-related-inner">
              <h2>Pour aller plus loin</h2>
              <ul>{p.related.map((r) => <li key={r.href}><Link href={r.href}>{r.label} →</Link></li>)}</ul>
            </div>
          </section>
        )}
        <CtaFinal />
      </main>
      <Footer variant="b2b" />
    </>
  );
}
