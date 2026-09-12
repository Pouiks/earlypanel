import Link from "next/link";
import { getAllPosts, postHref } from "@/lib/blog";

export interface RelatedLink {
  href: string;
  /** Titre court, utilise si la cible n'est pas un article du blog. */
  label: string;
  /** Resume affiche sous le titre. Optionnel : resolu depuis l'article ou la page cible. */
  desc?: string;
}

/**
 * Resumes des pages internes non issues du blog. Repris des meta descriptions
 * des pages correspondantes ; a mettre a jour si celles-ci changent.
 */
const PAGE_PREVIEWS: Record<string, { kind: string; desc: string }> = {
  "/entreprises": { kind: "Offre", desc: "Test utilisateur à distance sur maquette Figma, staging ou produit live. Testeurs B2B recrutés à la main, NDA, rapport rédigé en 5 jours." },
  "/securite": { kind: "Page", desc: "Comment earlypanel protège les données des testeurs et les projets des clients : hébergement en Europe, NDA tracé, documents privés, conservation limitée." },
  "/glossaire": { kind: "Glossaire", desc: "Les termes des tests utilisateurs définis simplement, en une phrase chacun : panel, verbatim, friction, NDA, recette." },
  "/test-maquette-figma": { kind: "Cas d'usage", desc: "Test utilisateur sur maquette Figma ou prototype cliquable, avant la moindre ligne de code. 5 à 10 profils ciblés, rapport UX en 5 jours." },
  "/test-pre-lancement-staging": { kind: "Cas d'usage", desc: "Faites tester votre préproduction par des utilisateurs extérieurs avant le go-live. Frictions invisibles en interne, rapport UX en 5 jours." },
  "/test-conversion-funnel": { kind: "Cas d'usage", desc: "Vos analytics disent où les utilisateurs partent, pas pourquoi. Test utilisateur sur checkout, onboarding ou dashboard : frictions priorisées en 5 jours." },
  "/agences": { kind: "Partenariat", desc: "Sous-traitez la recherche utilisateur de vos clients : recrutement, questionnaire, rapport UX en 5 jours, en marque blanche ou apport d'affaires." },
  "/test-utilisateur-fintech": { kind: "Secteur", desc: "Test UX de votre produit fintech, plateforme de facturation ou service réglementé par des DAF, experts-comptables, courtiers, juristes." },
  "/test-utilisateur-saas-b2b": { kind: "Secteur", desc: "Test UX de votre SaaS B2B par des PM, RH, comptables ou commerciaux qui vivent dans un CRM. Onboarding, dashboard, facturation." },
  "/test-utilisateur-sante": { kind: "Secteur", desc: "Faites tester votre app santé ou logiciel métier par des médecins, infirmiers, pharmaciens ou patients chroniques. Panel français, NDA." },
};

interface Preview { href: string; kind: string; title: string; desc: string; meta?: string }

/**
 * Bloc "Pour aller plus loin" des landings : recommandations de lecture avec
 * aperçu. Les liens vers un article ou un guide sont enrichis au build depuis
 * content/blog (titre complet, resume, temps de lecture) ; les autres pages
 * internes utilisent PAGE_PREVIEWS ou le `desc` fourni.
 */
export default async function RelatedReading({ items }: { items: RelatedLink[] }) {
  if (items.length === 0) return null;
  const posts = await getAllPosts();
  const previews: Preview[] = items.map((item) => {
    const post = posts.find((p) => postHref(p) === item.href);
    if (post) {
      return {
        href: item.href,
        kind: post.audience === "testeur" ? "Guide" : "Article",
        title: post.title,
        desc: item.desc ?? post.description,
        meta: `${post.readingMinutes} min de lecture`,
      };
    }
    const page = PAGE_PREVIEWS[item.href];
    return { href: item.href, kind: page?.kind ?? "Page", title: item.label, desc: item.desc ?? page?.desc ?? "" };
  });

  return (
    <section className="landing-related">
      <div className="landing-related-inner">
        <h2>Pour aller plus loin</h2>
        <p className="landing-related-sub">Trois lectures choisies pour ce cas précis.</p>
        <ul className="related-grid">
          {previews.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="related-card">
                <div className="related-kind">
                  {r.kind}
                  {r.meta && <span className="related-meta"> · {r.meta}</span>}
                </div>
                <h3>{r.title}</h3>
                {r.desc && <p>{r.desc}</p>}
                <span className="related-more">Lire →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
