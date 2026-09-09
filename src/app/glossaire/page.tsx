import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/ui/JsonLd";
import BreadcrumbJsonLd from "@/components/ui/BreadcrumbJsonLd";
import { GLOSSARY } from "@/data/glossaire";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Glossaire des tests utilisateurs · 20 termes définis simplement",
  description:
    "Test utilisateur, test non modéré, scénario, critère de réussite, friction, verbatim, panel, NDA, rapport, matrice impact / effort : les termes des tests utilisateurs définis en une phrase.",
  alternates: { canonical: "/glossaire" },
  openGraph: {
    title: "Glossaire des tests utilisateurs · earlypanel",
    description: "Les termes des tests utilisateurs définis simplement, en une phrase chacun.",
    url: "/glossaire",
    type: "article",
    locale: "fr_FR",
  },
};

function definedTermSetJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/glossaire#glossaire`,
    name: "Glossaire des tests utilisateurs",
    url: `${SITE_URL}/glossaire`,
    inLanguage: "fr-FR",
    hasDefinedTerm: GLOSSARY.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${SITE_URL}/glossaire#${t.slug}`,
      name: t.term,
      description: t.definition,
      inDefinedTermSet: `${SITE_URL}/glossaire#glossaire`,
      ...(t.href ? { url: `${SITE_URL}${t.href}` } : {}),
    })),
  };
}

export default function GlossairePage() {
  return (
    <>
      <JsonLd data={definedTermSetJsonLd()} />
      <BreadcrumbJsonLd items={[{ name: "Accueil", url: SITE_URL }, { name: "Glossaire", url: `${SITE_URL}/glossaire` }]} />
      <Nav />
      <main className="blog-main">
        <header className="blog-header">
          <div className="sec-eye">Glossaire</div>
          <h1>Les mots des tests utilisateurs, <em>définis en une phrase</em>.</h1>
          <p className="blog-lede">
            Vingt termes que vous rencontrerez dans un brief, un questionnaire ou un rapport. Chaque définition tient seule ; le lien renvoie vers la page qui développe le sujet.
          </p>
        </header>
        <dl className="glossary">
          {GLOSSARY.map((t) => (
            <div key={t.slug} id={t.slug} className="glossary-item">
              <dt>{t.term}</dt>
              <dd>
                {t.definition}
                {t.href && <> <Link href={t.href}>En savoir plus →</Link></>}
              </dd>
            </div>
          ))}
        </dl>
      </main>
      <Footer variant="b2b" />
    </>
  );
}
