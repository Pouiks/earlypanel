import type { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité — earlypanel",
  description: "Politique de confidentialité d'earlypanel : traitement des données conforme RGPD.",
  alternates: { canonical: "https://earlypanel.fr/confidentialite" },
  robots: { index: true, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité" lastUpdated="28 avril 2026" temporary>
      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement de vos données personnelles est l&apos;éditeur du site earlypanel.fr, agissant à titre personnel pendant la phase de pré-lancement (cf. <a href="/mentions-legales">Mentions légales</a>). Il est joignable à l&apos;adresse <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>.
      </p>

      <h2>2. Données collectées</h2>
      <p>
        Pendant la phase de pré-lancement, earlypanel collecte uniquement les données nécessaires à la constitution du panel testeurs.
      </p>

      <h3>2.1 Données collectées à l&apos;inscription</h3>
      <ul>
        <li>Email</li>
        <li>Prénom et nom</li>
      </ul>

      <h3>2.2 Données collectées au moment du complétion de profil (optionnel)</h3>
      <ul>
        <li>Téléphone, date de naissance</li>
        <li>Adresse postale (uniquement si vous souhaitez être éligible aux missions nécessitant cette information)</li>
        <li>Informations professionnelles (poste, secteur, taille d&apos;entreprise, niveau digital)</li>
        <li>Configuration technique (appareils, navigateurs, type de connexion)</li>
        <li>Préférences (disponibilité, centres d&apos;intérêt)</li>
      </ul>

      <h3>2.3 Données techniques</h3>
      <ul>
        <li>Adresse IP, user-agent, horodatage de connexion (à des fins de sécurité et de prévention de fraude)</li>
      </ul>

      <p>
        <strong>Aucune donnée bancaire n&apos;est collectée à ce stade.</strong> Les données de paiement (IBAN, etc.) ne seront collectées qu&apos;au moment du lancement officiel des missions rémunérées, via Stripe Connect (responsable de traitement distinct, conforme PCI-DSS).
      </p>

      <h2>3. Bases légales et finalités</h2>
      <ul>
        <li><strong>Consentement explicite</strong> à l&apos;inscription : constitution du panel testeurs en vue d&apos;un démarrage prochain des missions.</li>
        <li><strong>Intérêt légitime</strong> : sécurité de la plateforme, prévention de fraude, amélioration du service.</li>
      </ul>

      <h2>4. Durée de conservation</h2>
      <ul>
        <li><strong>Données de profil</strong> : pendant la durée d&apos;inscription au panel + 3 ans après la dernière connexion. Vous pouvez supprimer votre compte à tout moment, ce qui déclenche l&apos;effacement immédiat (sauf obligation légale contraire).</li>
        <li><strong>Logs techniques</strong> : 12 mois maximum.</li>
        <li><strong>Emails transactionnels</strong> : conservation par Resend selon leur politique (7 jours par défaut).</li>
      </ul>

      <h2>5. Destinataires des données</h2>
      <p>Vos données peuvent être transmises à :</p>
      <ul>
        <li>L&apos;éditeur du site (responsable du traitement) à titre personnel.</li>
        <li>Nos sous-traitants techniques : Vercel (hébergement, US/UE), Supabase (base de données, UE), Resend (emails transactionnels, US).</li>
      </ul>
      <p>
        <strong>Aucune donnée n&apos;est revendue à des tiers.</strong> Aucune donnée n&apos;est partagée à des fins publicitaires.
      </p>

      <h2>6. Transferts hors UE</h2>
      <p>
        Vercel et Resend sont basés aux États-Unis. Les transferts sont encadrés par les clauses contractuelles types (CCT) approuvées par la Commission européenne et, le cas échéant, par le Data Privacy Framework (DPF).
      </p>

      <h2>7. Vos droits (RGPD)</h2>
      <p>Vous disposez des droits suivants :</p>
      <ul>
        <li>Droit d&apos;accès à vos données</li>
        <li>Droit de rectification</li>
        <li>Droit à l&apos;effacement (« droit à l&apos;oubli »)</li>
        <li>Droit à la limitation du traitement</li>
        <li>Droit à la portabilité</li>
        <li>Droit d&apos;opposition</li>
        <li>Droit de retirer votre consentement à tout moment</li>
        <li>Droit d&apos;introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a></li>
      </ul>
      <p>
        Pour exercer ces droits, écrivez à <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>. Nous vous répondrons sous 30 jours maximum.
      </p>

      <h2>8. Cookies</h2>
      <p>
        earlypanel utilise un nombre minimal de cookies. Les seuls cookies déposés sont strictement nécessaires au fonctionnement du site (session utilisateur, sécurité). <strong>Aucun cookie de tracking publicitaire ou analytique n&apos;est déposé.</strong>
      </p>
      <p>Les outils statistiques utilisés sont configurés en mode <em>cookieless</em> :</p>
      <ul>
        <li><strong>Vercel Analytics</strong> : agrégation anonyme, sans cookie ni identifiant utilisateur persistant.</li>
        <li><strong>Microsoft Clarity</strong> (le cas échéant) : configuration sans cookie tiers, IP masquée.</li>
        <li><strong>Matomo</strong> (le cas échéant) : mode <code>disableCookies</code> activé.</li>
      </ul>
      <p>
        Conformément aux recommandations CNIL, l&apos;utilisation d&apos;outils analytiques en mode cookieless avec données strictement agrégées est <strong>exemptée de consentement actif</strong> mais reste informée par le bandeau d&apos;information cookies présent sur le site.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données : chiffrement TLS, contrôle d&apos;accès strict (Row Level Security côté base), audit log des actions sensibles, sauvegardes chiffrées, principe du moindre privilège.
      </p>

      <h2>10. Modifications</h2>
      <p>
        Cette politique peut être mise à jour, notamment lors du lancement officiel et de la création de la structure commerciale. La version applicable est celle publiée sur le site à la date de votre interaction avec earlypanel.
      </p>
    </LegalLayout>
  );
}
