import type { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation", // le template du layout ajoute « · earlypanel »
  description: "Conditions générales d'utilisation de la plateforme earlypanel pour les testeurs du panel.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cgu" },
  openGraph: {
    title: "Conditions générales d'utilisation · earlypanel",
    description: "Conditions générales d'utilisation de la plateforme earlypanel.",
    url: "/cgu",
    type: "article",
    locale: "fr_FR",
  },
};

export default function CguPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" lastUpdated="7 septembre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;utilisation de la plateforme earlypanel, accessible à <a href="https://www.earlypanel.fr">earlypanel.fr</a>. earlypanel met en relation des entreprises souhaitant tester leurs produits numériques avec des testeurs rémunérés.
      </p>

      <h2>2. Acceptation</h2>
      <p>
        L&apos;utilisation de la plateforme et l&apos;inscription au panel impliquent l&apos;acceptation pleine et entière des présentes CGU. Si vous n&apos;acceptez pas ces conditions, vous devez cesser d&apos;utiliser la plateforme.
      </p>

      <h2>3. Inscription au panel</h2>
      <ul>
        <li>L&apos;inscription est <strong>gratuite</strong> et soumise à vérification du profil.</li>
        <li>Le testeur doit être <strong>majeur</strong> (18 ans révolus) et résider en France métropolitaine.</li>
        <li>Les informations fournies doivent être exactes et à jour.</li>
        <li>L&apos;éditeur se réserve le droit de refuser ou révoquer un compte (compte multiple, fausse identité, comportement abusif).</li>
      </ul>

      <h2>4. Aucune mission garantie</h2>
      <p>
        L&apos;inscription au panel <strong>ne crée aucune obligation</strong> dans le chef d&apos;earlypanel. Plus précisément :
      </p>
      <ul>
        <li>Aucune mission n&apos;est garantie au testeur, quelle que soit la durée écoulée depuis l&apos;inscription.</li>
        <li>La fréquence des missions dépend exclusivement du profil du testeur et de la demande des clients.</li>
        <li>Certains profils peuvent ne jamais être sollicités.</li>
        <li>earlypanel se réserve le droit de fermer, suspendre ou réorienter le panel à tout moment, sans indemnité.</li>
      </ul>
      <p>
        <strong>Aucune rémunération ne peut être réclamée à earlypanel</strong> tant qu&apos;une mission n&apos;a pas été explicitement proposée et acceptée par le testeur, et que la prestation n&apos;a pas été réalisée et validée.
      </p>

      <h2>5. Obligations du testeur</h2>
      <p>Une fois inscrit, le testeur s&apos;engage à :</p>
      <ul>
        <li>Maintenir ses informations à jour.</li>
        <li>Ne pas créer plusieurs comptes ni partager son compte.</li>
        <li>Lorsqu&apos;une mission lui est proposée : respecter le NDA correspondant, garder confidentielles toutes les informations relatives aux produits testés, ne pas réaliser de captures d&apos;écran ni d&apos;enregistrements sans autorisation écrite.</li>
        <li>Déclarer aux autorités fiscales compétentes les revenus issus des tests rémunérés.</li>
      </ul>

      <h2>6. Score qualité</h2>
      <p>
        Chaque testeur dispose d&apos;un score qualité. Ce score évolue selon la qualité des contributions (réponses complètes, précises, dans les délais) et conditionne l&apos;accès à certaines missions et niveaux de rémunération. Les réponses jugées insuffisantes sont refusées, non payées, et peuvent entraîner une suspension du compte en cas de récidive. Le testeur est informé du motif par email et peut contester en y répondant : earlypanel réexamine les réponses.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        Toute réponse fournie dans le cadre d&apos;une mission devient la propriété d&apos;earlypanel, qui peut la transmettre au client commanditaire sous forme anonymisée ou pseudonymisée.
      </p>

      <h2>8. Résiliation et suppression du compte</h2>
      <ul>
        <li>Le testeur peut supprimer son compte à tout moment, depuis son espace personnel ou par email à <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>. La suppression est effective sous 30 jours maximum.</li>
        <li>earlypanel peut suspendre ou résilier un compte en cas de violation des CGU, après notification.</li>
      </ul>

      <h2>9. Responsabilité</h2>
      <p>
        earlypanel met en œuvre les moyens raisonnables pour offrir un service de qualité mais ne peut garantir l&apos;absence d&apos;interruption ou de bug. Le service est fourni « en l&apos;état » et la responsabilité de l&apos;éditeur ne saurait être engagée pour des dommages indirects ou pour l&apos;absence de mission proposée.
      </p>

      <h2>10. Données personnelles</h2>
      <p>
        Le traitement des données est détaillé dans la <a href="/confidentialite">Politique de confidentialité</a>.
      </p>

      <h2>11. Évolution des CGU</h2>
      <p>
        Les présentes CGU sont susceptibles d&apos;être modifiées. Toute modification substantielle sera notifiée par email aux testeurs inscrits, avec un délai raisonnable avant application. Le testeur pourra alors choisir de continuer à utiliser le service ou de supprimer son compte.
      </p>

      <h2>12. Loi applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige relèvera de la compétence des tribunaux français selon les règles de droit commun.
      </p>

      <h2>13. Contact</h2>
      <p>
        Pour toute question : <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>.
      </p>
    </LegalLayout>
  );
}
