import type { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata: Metadata = {
  title: "Mentions légales — earlypanel",
  description: "Mentions légales d'earlypanel : éditeur, hébergeur, contact.",
  alternates: { canonical: "https://earlypanel.fr/mentions-legales" },
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" lastUpdated="28 avril 2026" temporary>
      <h2>1. Éditeur du site</h2>
      <p>
        Le site <strong>earlypanel.fr</strong> est édité à titre personnel par son fondateur, dans le cadre de la <strong>phase de pré-lancement</strong> du projet earlypanel. Aucune activité commerciale n&apos;est exercée sur le site à la date de publication des présentes mentions.
      </p>
      <ul>
        <li><strong>Éditeur :</strong> M. Joinville</li>
        <li><strong>Statut :</strong> Personne physique (projet en cours de structuration)</li>
        <li><strong>Adresse de contact :</strong> 117 rue pierre bouyeron 34000 Montpellier</li>
        <li><strong>Email :</strong> <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a></li>
      </ul>
      <p>
        Une structure juridique sera créée préalablement à toute prestation commerciale rémunérée. Les présentes mentions seront alors mises à jour avec les informations légales correspondantes (raison sociale, RCS, SIREN, TVA intracommunautaire).
      </p>

      <h2>2. Directeur de la publication</h2>
      <p>
        Le directeur de la publication est l&apos;éditeur lui-même, joignable à l&apos;adresse <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>.
      </p>

      <h2>3. Hébergeur</h2>
      <p>Le site est hébergé par :</p>
      <ul>
        <li><strong>Vercel Inc.</strong></li>
        <li>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
        <li>Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></li>
      </ul>
      <p>Les données utilisateurs (inscriptions au panel) sont stockées via :</p>
      <ul>
        <li><strong>Supabase Inc.</strong> (base de données + authentification) — région Europe (UE).</li>
        <li><strong>Resend Inc.</strong> (emails transactionnels).</li>
      </ul>
      <p>
        <em>Note : Stripe (paiements) sera intégré uniquement lors du lancement officiel, lorsque la structure commerciale sera constituée.</em>
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus du site (textes, graphismes, logos, icônes, images, vidéos, code source) est la propriété exclusive de l&apos;éditeur ou de ses partenaires, et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
      </p>
      <p>
        Toute reproduction, représentation, modification, publication, transmission, totale ou partielle, sans autorisation écrite préalable est interdite et constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
      </p>

      <h2>5. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est régi par la <a href="/confidentialite">Politique de confidentialité</a>, conforme au Règlement Général sur la Protection des Données (RGPD).
      </p>

      <h2>6. Crédits</h2>
      <p>Conception et développement : earlypanel.</p>

      <h2>7. Contact</h2>
      <p>
        Pour toute question relative à ces mentions légales, à un signalement ou à l&apos;exercice de vos droits : <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>.
      </p>
    </LegalLayout>
  );
}
