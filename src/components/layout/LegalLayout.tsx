import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";

/**
 * Layout commun pour les pages legales (mentions legales, CGU, CGV,
 * confidentialite). Encadre le contenu avec Nav + Footer et applique
 * un style "long-form lisible" sobre.
 */
export default function LegalLayout({
  title,
  lastUpdated,
  temporary = false,
  children,
}: {
  title: string;
  lastUpdated: string;
  /** Affiche un bandeau "document temporaire phase de pre-lancement" en haut */
  temporary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="legal-main">
        <div className="legal-inner">
          {temporary && (
            <div className="legal-temp-banner" role="status">
              <strong>📄 Document temporaire — Phase de pré-lancement.</strong> earlypanel est actuellement en phase d&apos;ouverture du panel testeurs, exploité à titre personnel par son fondateur. Ce document sera mis à jour lors de la constitution de la structure commerciale officielle.
            </div>
          )}
          <div className="legal-eyebrow">Document légal</div>
          <h1 className="legal-title">{title}</h1>
          <p className="legal-updated">Dernière mise à jour : {lastUpdated}</p>
          <div className="legal-content">{children}</div>
        </div>
      </main>
      <Footer variant="index" />
      <style>{`
        .legal-main {
          background: #fff;
          padding: 60px 24px 80px;
          font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
        }
        .legal-inner {
          max-width: 760px;
          margin: 0 auto;
        }
        .legal-temp-banner {
          background: #fef3c7;
          border-left: 3px solid #f59e0b;
          padding: 14px 18px;
          margin: 0 0 32px;
          border-radius: 8px;
          font-size: 13px;
          color: #78350f;
          line-height: 1.6;
        }
        .legal-temp-banner strong { color: #92400e; }
        .legal-eyebrow {
          font-size: 12px;
          font-weight: 600;
          color: #0A7A5A;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }
        .legal-title {
          font-size: 36px;
          font-weight: 700;
          color: #1d1d1f;
          letter-spacing: -0.04em;
          margin: 0 0 8px;
          line-height: 1.15;
        }
        .legal-updated {
          font-size: 13px;
          color: #86868B;
          margin: 0 0 40px;
          font-style: italic;
        }
        .legal-content {
          font-size: 15px;
          color: #1d1d1f;
          line-height: 1.7;
        }
        .legal-content h2 {
          font-size: 20px;
          font-weight: 700;
          color: #1d1d1f;
          letter-spacing: -0.02em;
          margin: 40px 0 12px;
        }
        .legal-content h3 {
          font-size: 16px;
          font-weight: 700;
          color: #1d1d1f;
          margin: 28px 0 8px;
        }
        .legal-content p { margin: 0 0 14px; }
        .legal-content ul, .legal-content ol {
          margin: 0 0 18px;
          padding-left: 24px;
        }
        .legal-content li { margin-bottom: 6px; }
        .legal-content a {
          color: #0A7A5A;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .legal-content strong { font-weight: 700; }
        .legal-todo {
          background: #fef3c7;
          border-left: 3px solid #f59e0b;
          padding: 14px 18px;
          margin: 16px 0;
          border-radius: 8px;
          font-size: 14px;
          color: #92400e;
        }
        .legal-todo strong { color: #78350f; }
        @media (max-width: 768px) {
          .legal-title { font-size: 28px; }
        }
      `}</style>
    </>
  );
}
