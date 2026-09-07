import type { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata: Metadata = {
  title: "Mentions légales", // le template du layout ajoute « · earlypanel »
  description: "Mentions légales du site earlypanel.fr : éditeur, hébergeur, propriété intellectuelle, contact.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/mentions-legales" },
  openGraph: {
    title: "Mentions légales · earlypanel",
    description: "Mentions légales du site earlypanel.fr.",
    url: "/mentions-legales",
    type: "article",
    locale: "fr_FR",
  },
};

export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" lastUpdated="7 septembre 2026">
      <h2>1. Éditeur du site</h2>
      <p>
        Le site <strong>earlypanel.fr</strong> est édité par Virgile Joinville, entrepreneur individuel (micro-entreprise), SIREN 848 300 117, 117 rue Pierre Bouyeron, 34070 Montpellier, France. TVA non applicable, article 293 B du CGI.
      </p>
      <p>
        Directeur de la publication : Virgile Joinville. Contact : <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>.
      </p>

      <h2>2. Hébergeur</h2>
      <p>Le site est hébergé par :</p>
      <ul>
        <li><strong>Vercel Inc.</strong></li>
        <li>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
        <li>Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></li>
      </ul>
      <p>Les données utilisateurs (inscriptions au panel, missions, documents) sont stockées et traitées via :</p>
      <ul>
        <li><strong>Supabase Inc.</strong> (base de données, authentification, stockage de documents), région Europe (UE).</li>
        <li><strong>Resend Inc.</strong> (emails transactionnels).</li>
      </ul>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus du site (textes, graphismes, logos, icônes, images, vidéos, code source) est la propriété exclusive de l&apos;éditeur ou de ses partenaires, et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
      </p>
      <p>
        Toute reproduction, représentation, modification, publication, transmission, totale ou partielle, sans autorisation écrite préalable est interdite et constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
      </p>

      <h2>4. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est régi par la <a href="/confidentialite">Politique de confidentialité</a>, conforme au Règlement Général sur la Protection des Données (RGPD).
      </p>

      <h2>5. Crédits</h2>
      <p>Conception et développement : earlypanel.</p>

      <h2>6. Contact</h2>
      <p>
        Pour toute question relative à ces mentions légales, à un signalement ou à l&apos;exercice de vos droits : <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>.
      </p>
    </LegalLayout>
  );
}
