import Link from "next/link";

interface FooterProps {
  variant?: "index" | "b2b" | "b2c";
}

export default function Footer({ variant = "index" }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="footer-logo">
              test<em>panel</em>
            </Link>
            <p>
              {variant === "index"
                ? "Tests utilisateurs clés en main pour équipes produit, startups et agences digitales. Panel humain, questionnaires ciblés, rapport actionnable."
                : "Tests utilisateurs clés en main pour équipes produit, startups et agences digitales."}
            </p>
            <div className="footer-badges">
              <span className="footer-badge">RGPD</span>
              <span className="footer-badge">NDA inclus</span>
              <span className="footer-badge">Made in France</span>
            </div>
          </div>

          {variant === "index" && (
            <>
              <div className="footer-col">
                <h4>Service</h4>
                <ul>
                  <li><a href="#process">Comment ça marche</a></li>
                  <li><a href="#tarifs">Nos offres</a></li>
                  <li><Link href="/entreprises">Page entreprises</Link></li>
                  <li><a href="#">Exemple de rapport</a></li>
                  <li><a href="#">FAQ clients</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Testeurs</h4>
                <ul>
                  <li><Link href="/testeurs">Rejoindre le panel</Link></li>
                  <li><Link href="/testeurs#how">Comment ça marche</Link></li>
                  <li><Link href="/testeurs#faq">FAQ testeurs</Link></li>
                  <li><a href="#">CGU testeurs</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Légal</h4>
                <ul>
                  <li><a href="#">Mentions légales</a></li>
                  <li><a href="#">Politique de confidentialité</a></li>
                  <li><a href="#">CGV</a></li>
                  <li><a href="#">RGPD</a></li>
                  <li><a href="#">contact@testpanel.fr</a></li>
                </ul>
              </div>
            </>
          )}

          {variant === "b2b" && (
            <>
              <div className="footer-col">
                <h4>Service</h4>
                <ul>
                  <li><Link href="/#process">Comment ça marche</Link></li>
                  <li><Link href="/#tarifs">Tarifs</Link></li>
                  <li><a href="#">Exemple de rapport</a></li>
                  <li><a href="#faq">FAQ</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Testeurs</h4>
                <ul>
                  <li><Link href="/testeurs">Rejoindre le panel</Link></li>
                  <li><Link href="/testeurs#how">Comment ça marche</Link></li>
                  <li><a href="#">CGU testeurs</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Légal</h4>
                <ul>
                  <li><a href="#">Mentions légales</a></li>
                  <li><a href="#">Confidentialité</a></li>
                  <li><a href="#">CGV</a></li>
                  <li><a href="#">contact@testpanel.fr</a></li>
                </ul>
              </div>
            </>
          )}

          {variant === "b2c" && (
            <>
              <div className="footer-col">
                <h4>Testeurs</h4>
                <ul>
                  <li><a href="#register">Rejoindre le panel</a></li>
                  <li><a href="#how">Comment ça marche</a></li>
                  <li><a href="#faq">FAQ testeurs</a></li>
                  <li><a href="#">CGU testeurs</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Entreprises</h4>
                <ul>
                  <li><Link href="/entreprises">Démarrer un test</Link></li>
                  <li><Link href="/#tarifs">Tarifs</Link></li>
                  <li><Link href="/entreprises#faq">FAQ clients</Link></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Légal</h4>
                <ul>
                  <li><a href="#">Mentions légales</a></li>
                  <li><a href="#">Confidentialité</a></li>
                  <li><a href="#">CGU</a></li>
                  <li><a href="#">contact@testpanel.fr</a></li>
                </ul>
              </div>
            </>
          )}
        </div>
        <div className="footer-bottom">
          <p>© 2025 testpanel · Tous droits réservés</p>
          <div className="footer-legal">
            <a href="#">Mentions légales</a>
            <a href="#">Confidentialité</a>
            <a href="#">{variant === "b2c" ? "CGU" : "CGV"}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
