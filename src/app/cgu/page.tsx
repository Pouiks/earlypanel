import type { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata: Metadata = {
  title: "CGU — earlypanel",
  description: "Conditions générales d'utilisation de la plateforme earlypanel pendant la phase de pré-lancement.",
  alternates: { canonical: "https://earlypanel.fr/cgu" },
  robots: { index: true, follow: true },
};

export default function CguPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" lastUpdated="28 avril 2026" temporary>
      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;utilisation de la plateforme earlypanel, accessible à <a href="https://earlypanel.fr">earlypanel.fr</a>, pendant sa <strong>phase de pré-lancement</strong>. earlypanel a vocation, à terme, à mettre en relation des entreprises souhaitant tester leurs produits numériques avec des testeurs rémunérés.
      </p>
      <p>
        À la date de publication des présentes, aucune mission rémunérée n&apos;est encore active. Le panel est en cours de constitution.
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

      <h2>4. Phase de pré-lancement — Aucune mission garantie</h2>
      <p>
        L&apos;inscription au panel <strong>ne crée aucune obligation</strong> dans le chef d&apos;earlypanel. Plus précisément :
      </p>
      <ul>
        <li>Aucune mission n&apos;est garantie au testeur, quelle que soit la durée écoulée depuis l&apos;inscription.</li>
        <li>La fréquence éventuelle des missions dépendra exclusivement du profil du testeur et de la demande client au moment du lancement.</li>
        <li>Certains profils pourront ne jamais être sollicités.</li>
        <li>earlypanel se réserve le droit de fermer, suspendre ou réorienter le panel à tout moment, sans indemnité.</li>
      </ul>
      <p>
        <strong>Aucune rémunération ne peut être réclamée à earlypanel pendant la phase de pré-lancement</strong> tant qu&apos;une mission n&apos;a pas été explicitement proposée et acceptée par le testeur, et que la prestation n&apos;a pas été réalisée et validée.
      </p>

      <h2>5. Obligations du testeur</h2>
      <p>Une fois inscrit, le testeur s&apos;engage à :</p>
      <ul>
        <li>Maintenir ses informations à jour.</li>
        <li>Ne pas créer plusieurs comptes ni partager son compte.</li>
        <li>Lorsqu&apos;une mission lui sera proposée à l&apos;avenir : respecter le NDA correspondant, garder confidentielles toutes les informations relatives aux produits testés, ne pas réaliser de captures d&apos;écran ni d&apos;enregistrements sans autorisation écrite.</li>
        <li>Le moment venu, déclarer aux autorités fiscales compétentes les revenus issus des tests rémunérés.</li>
      </ul>

      <h2>6. Score qualité (futur)</h2>
      <p>
        Lors du lancement officiel des missions rémunérées, chaque testeur disposera d&apos;un score qualité initial. Ce score évoluera selon la qualité des contributions et conditionnera l&apos;accès à certaines missions et niveaux de rémunération. Les modalités exactes seront détaillées dans une version mise à jour des présentes CGU.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        Toute réponse fournie dans le cadre d&apos;une future mission deviendra la propriété d&apos;earlypanel, qui pourra la transmettre au client commanditaire sous forme anonymisée ou pseudonymisée.
      </p>

      <h2>8. Résiliation et suppression du compte</h2>
      <ul>
        <li>Le testeur peut supprimer son compte à tout moment, par email à <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>. La suppression est effective sous 30 jours maximum.</li>
        <li>earlypanel peut suspendre ou résilier un compte en cas de violation des CGU, après notification.</li>
      </ul>

      <h2>9. Responsabilité</h2>
      <p>
        earlypanel met en œuvre les moyens raisonnables pour offrir un service de qualité mais ne peut garantir l&apos;absence d&apos;interruption ou de bug. Pendant la phase de pré-lancement, le service est fourni « en l&apos;état » et la responsabilité de l&apos;éditeur ne saurait être engagée pour des dommages indirects ou pour l&apos;absence de mission proposée.
      </p>

      <h2>10. Données personnelles</h2>
      <p>
        Le traitement des données est détaillé dans la <a href="/confidentialite">Politique de confidentialité</a>.
      </p>

      <h2>11. Évolution des CGU</h2>
      <p>
        Les présentes CGU sont susceptibles d&apos;être modifiées, notamment lors du lancement officiel et de la création de la structure commerciale. Toute modification substantielle sera notifiée par email aux testeurs inscrits, avec un délai raisonnable avant application. Le testeur pourra alors choisir de continuer à utiliser le service ou de supprimer son compte.
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
