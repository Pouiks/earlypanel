import type { ReactNode } from "react";
import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import Separator from "@/components/ui/Separator";
import FaqAccordion from "@/components/ui/FaqAccordion";
import FaqJsonLd from "@/components/ui/FaqJsonLd";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
import { BOOKING_URL, BOOKING_DURATION_MIN, PRICE_RANGE_LABEL } from "@/lib/cta-links";

export interface FaqItem { q: string; a: string }

export interface SituationLandingProps {
  /** Chemin public, ex: "/test-maquette-figma" */
  path: string;
  breadcrumbName: string;
  eyebrow: string;
  h1: ReactNode;
  lede: string;
  problem: { title: string; paragraphs: string[] };
  method: { title: string; intro?: string; steps: { title: string; body: string }[] };
  deliverable: { title: string; intro?: string; bullets: string[] };
  faq: FaqItem[];
  ctaTitle: string;
}

/**
 * Gabarit des landings SEO "par situation" (/test-*, /agences).
 *
 * Une page = une requete d'achat precise, un probleme, une methode, un
 * livrable, une FAQ ciblee (FAQPage JSON-LD) et les memes CTA que la home.
 * Le prix et la duree d'appel viennent de cta-links : une seule source de
 * verite pour tout le site.
 */
export default function SituationLanding(p: SituationLandingProps) {
  const url = `https://www.earlypanel.fr${p.path}`;
  return (
    <>
      <FaqJsonLd items={p.faq} />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", url: "https://www.earlypanel.fr" },
          { name: "Entreprises", url: "https://www.earlypanel.fr/entreprises" },
          { name: p.breadcrumbName, url },
        ]}
      />
      <Nav />
      <main>
        <section className="situation-hero">
          <div className="sec-eye">{p.eyebrow}</div>
          <h1>{p.h1}</h1>
          <p className="situation-lede">{p.lede}</p>
          <div className="hero-btns" style={{ opacity: 1, animation: "none" }}>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark">Réserver un appel gratuit →</a>
            <Link href="/#rapport" className="btn-outline">Voir un rapport d&apos;exemple</Link>
          </div>
        </section>

        <Separator />

        <section className="situation-section">
          <div className="situation-inner">
            <h2>{p.problem.title}</h2>
            {p.problem.paragraphs.map((t) => <p key={t}>{t}</p>)}
          </div>
        </section>

        <section className="situation-section alt">
          <div className="situation-inner">
            <h2>{p.method.title}</h2>
            {p.method.intro && <p>{p.method.intro}</p>}
            <div className="situation-steps">
              {p.method.steps.map((s, i) => (
                <div className="situation-step" key={s.title}>
                  <div className="step-num">Étape {String(i + 1).padStart(2, "0")}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="situation-section">
          <div className="situation-inner">
            <h2>{p.deliverable.title}</h2>
            {p.deliverable.intro && <p>{p.deliverable.intro}</p>}
            <ul>
              {p.deliverable.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>
            <p>
              Forfait fixe par mission, chiffré après un atelier de cadrage offert, généralement {PRICE_RANGE_LABEL} selon le nombre et la rareté des profils. Rapport rédigé et restitution en visio sous 5 jours ouvrés après lancement. NDA signé avant tout échange.
            </p>
            <div className="situation-cta">
              <Link href="/entreprises#brief" className="btn-dark">Décrire mon projet →</Link>
              <Link href="/entreprises" className="btn-outline">Voir l&apos;offre complète</Link>
            </div>
          </div>
        </section>

        <Separator />

        <FaqAccordion eyebrow="Questions fréquentes" title="Vos questions sur ce cas précis." items={p.faq} />

        <section className="cta-final">
          <h2>{p.ctaTitle}</h2>
          <p>Un appel de {BOOKING_DURATION_MIN} min suffit pour savoir si un test a du sens dans votre situation. Pas d&apos;engagement, pas de présentation commerciale.</p>
          <div className="cta-btns">
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-dark">Réserver un appel gratuit →</a>
            <Link href="/#rapport" className="btn-outline">Recevoir un rapport d&apos;exemple</Link>
          </div>
        </section>
      </main>
      <Footer variant="b2b" />
    </>
  );
}
