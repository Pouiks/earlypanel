import Link from "next/link";

interface FooterProps {
  variant?: "index" | "b2b" | "b2c";
}

/**
 * Footer commun. C'est ici (et sur /testeurs) que vivent les liens testeurs :
 * la nav des pages entreprise leur est fermee pour ne pas diluer le message
 * B2B, donc le footer doit toujours offrir inscription + connexion testeur.
 */
export default function Footer({ variant = "index" }: FooterProps) {
  const testerColumn = (
    <div className="footer-col">
      <h3>Testeurs</h3>
      <ul>
        <li><Link href="/testeurs">Devenir testeur rémunéré</Link></li>
        <li><Link href="/testeurs#how">Comment ça marche</Link></li>
        <li><Link href="/testeurs#faq">FAQ testeurs</Link></li>
        <li><Link href="/testeurs/guides">Guides testeurs</Link></li>
        <li><Link href="/app/login">Connexion à mon espace</Link></li>
        <li><Link href="/cgu">CGU testeurs</Link></li>
      </ul>
    </div>
  );

  const useCaseColumn = (
    <div className="footer-col">
      <h3>Cas d&apos;usage</h3>
      <ul>
        <li><Link href="/test-maquette-figma">Tester une maquette Figma</Link></li>
        <li><Link href="/test-pre-lancement-staging">Tester avant le lancement</Link></li>
        <li><Link href="/test-conversion-funnel">Comprendre un funnel qui ne convertit pas</Link></li>
        <li><Link href="/agences">Agences et studios</Link></li>
        <li><Link href="/test-utilisateur-saas-b2b">Test utilisateur SaaS B2B</Link></li>
        <li><Link href="/test-utilisateur-sante">Test utilisateur santé</Link></li>
        <li><Link href="/test-utilisateur-fintech">Test utilisateur fintech</Link></li>
      </ul>
    </div>
  );

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="footer-logo">
              early<em>panel</em>
            </Link>
            <p>
              {variant === "index"
                ? "Tests utilisateurs clés en main pour équipes produit, startups et agences digitales. Panel humain, questionnaires ciblés, rapport actionnable."
                : "Tests utilisateurs clés en main pour équipes produit, startups et agences digitales."}
            </p>
            <div className="footer-badges">
              <span className="footer-badge">RGPD</span>
              <span className="footer-badge">NDA inclus</span>
            </div>
            {variant !== "b2c" && (
              <p className="footer-tester-hint">
                Vous voulez devenir testeur ? <Link href="/testeurs">Rejoignez le panel</Link> ou <Link href="/app/login">connectez-vous à votre espace</Link>.
              </p>
            )}
          </div>

          {variant === "index" && (
            <>
              <div className="footer-col">
                <h3>Service</h3>
                <ul>
                  <li><a href="#process">Comment ça marche</a></li>
                  <li><a href="#rapport">Rapport d&apos;exemple</a></li>
                  <li><Link href="/entreprises#brief">Démarrer un projet</Link></li>
                  <li><Link href="/entreprises">Page entreprises</Link></li>
                  <li><Link href="/entreprises#faq">FAQ clients</Link></li>
                  <li><Link href="/blog">Blog</Link></li>
                </ul>
              </div>
              {useCaseColumn}
              {testerColumn}
              <div className="footer-col">
                <h3>Légal</h3>
                <ul>
                  <li><Link href="/mentions-legales">Mentions légales</Link></li>
                  <li><Link href="/confidentialite">Politique de confidentialité</Link></li>
                  <li><Link href="/securite">Sécurité et données</Link></li>
                  <li><Link href="/cgv">CGV</Link></li>
                  <li><Link href="/cgu">CGU</Link></li>
                  <li><a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a></li>
                </ul>
              </div>
            </>
          )}

          {variant === "b2b" && (
            <>
              <div className="footer-col">
                <h3>Service</h3>
                <ul>
                  <li><Link href="/#process">Comment ça marche</Link></li>
                  <li><Link href="/#rapport">Rapport d&apos;exemple</Link></li>
                  <li><Link href="/entreprises#brief">Démarrer un projet</Link></li>
                  <li><Link href="/entreprises#faq">FAQ</Link></li>
                  <li><Link href="/blog">Blog</Link></li>
                </ul>
              </div>
              {useCaseColumn}
              {testerColumn}
              <div className="footer-col">
                <h3>Légal</h3>
                <ul>
                  <li><Link href="/mentions-legales">Mentions légales</Link></li>
                  <li><Link href="/confidentialite">Confidentialité</Link></li>
                  <li><Link href="/securite">Sécurité et données</Link></li>
                  <li><Link href="/cgv">CGV</Link></li>
                  <li><a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a></li>
                </ul>
              </div>
            </>
          )}

          {variant === "b2c" && (
            <>
              <div className="footer-col">
                <h3>Testeurs</h3>
                <ul>
                  <li><a href="#register">Rejoindre le panel</a></li>
                  <li><a href="#how">Comment ça marche</a></li>
                  <li><a href="#faq">FAQ testeurs</a></li>
                  <li><Link href="/testeurs/guides">Guides testeurs</Link></li>
                  <li><Link href="/app/login">Connexion à mon espace</Link></li>
                  <li><Link href="/cgu">CGU testeurs</Link></li>
                </ul>
              </div>
              <div className="footer-col">
                <h3>Entreprises</h3>
                <ul>
                  <li><Link href="/entreprises">Page entreprises</Link></li>
                  <li><Link href="/entreprises#brief">Démarrer un projet</Link></li>
                  <li><Link href="/entreprises#faq">FAQ clients</Link></li>
                  <li><Link href="/blog">Blog</Link></li>
                </ul>
              </div>
              <div className="footer-col">
                <h3>Légal</h3>
                <ul>
                  <li><Link href="/mentions-legales">Mentions légales</Link></li>
                  <li><Link href="/confidentialite">Confidentialité</Link></li>
                  <li><Link href="/securite">Sécurité et données</Link></li>
                  <li><Link href="/cgu">CGU</Link></li>
                  <li><a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a></li>
                </ul>
              </div>
            </>
          )}
        </div>
        <div className="footer-bottom">
          <p>© 2026 earlypanel · Tous droits réservés</p>
          <div className="footer-legal">
            <a href="https://www.linkedin.com/company/earlypanel/" target="_blank" rel="noopener noreferrer" aria-label="earlypanel sur LinkedIn">
              LinkedIn
            </a>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href={variant === "b2c" ? "/cgu" : "/cgv"}>{variant === "b2c" ? "CGU" : "CGV"}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
