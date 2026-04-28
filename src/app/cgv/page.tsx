import type { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata: Metadata = {
  title: "CGV — earlypanel",
  description: "Conditions générales de vente d'earlypanel.",
  alternates: { canonical: "https://earlypanel.fr/cgv" },
  robots: { index: true, follow: true },
};

export default function CgvPage() {
  return (
    <LegalLayout title="Conditions générales de vente" lastUpdated="28 avril 2026" temporary>
      <h2>1. Préambule</h2>
      <p>
        earlypanel est actuellement en <strong>phase de pré-lancement</strong>. Aucune offre commerciale stabilisée n&apos;est proposée à la date de publication des présentes. Aucune commande ferme ne peut être passée tant que la structure commerciale officielle n&apos;a pas été constituée.
      </p>

      <h2>2. Demandes d&apos;information et ateliers de cadrage</h2>
      <p>
        Pendant la phase de pré-lancement, earlypanel propose aux entreprises intéressées des <strong>ateliers de cadrage gratuits</strong> destinés à :
      </p>
      <ul>
        <li>Comprendre les besoins de tests utilisateurs de l&apos;entreprise.</li>
        <li>Présenter le futur service earlypanel et son positionnement.</li>
        <li>Évaluer la faisabilité de missions pilotes.</li>
      </ul>
      <p>
        Ces ateliers ne donnent lieu à aucune facturation ni engagement de part et d&apos;autre.
      </p>

      <h2>3. Missions pilotes (le cas échéant)</h2>
      <p>
        Pendant la phase de pré-lancement, des <strong>missions pilotes peuvent être proposées au cas par cas</strong> à des entreprises sélectionnées, à titre d&apos;expérimentation. Ces missions :
      </p>
      <ul>
        <li>Font l&apos;objet d&apos;un accord écrit spécifique entre earlypanel et l&apos;entreprise concernée (devis ou lettre de mission), précisant le périmètre, les délais, les livrables et les éventuelles modalités financières.</li>
        <li>Sont encadrées par un NDA mutuel signé avant tout échange d&apos;information sensible.</li>
        <li>Ne constituent pas une offre commerciale standardisée et ne créent aucun précédent contractuel pour les futures prestations.</li>
      </ul>

      <h2>4. Tarifs indicatifs</h2>
      <p>
        Les fourchettes tarifaires affichées sur le site (Quick Test, Standard, Expert) sont communiquées <strong>à titre indicatif</strong> et reflètent l&apos;intention commerciale d&apos;earlypanel pour le futur lancement officiel. Elles ne constituent pas une offre ferme tant que la structure commerciale n&apos;est pas opérationnelle.
      </p>

      <h2>5. Confidentialité (NDA)</h2>
      <p>
        Tout échange d&apos;information sensible avec une entreprise prospect ou cliente fait l&apos;objet d&apos;un NDA mutuel signé préalablement. Les preuves de signature (hash, IP, horodatage) sont conservées 5 ans à des fins probatoires.
      </p>

      <h2>6. Propriété des livrables</h2>
      <p>
        Pour les missions pilotes effectivement réalisées : le rapport livré devient la propriété du Client après acquittement intégral de la prestation. earlypanel conserve un droit d&apos;usage interne anonymisé à des fins d&apos;amélioration de ses méthodologies.
      </p>

      <h2>7. Lancement officiel</h2>
      <p>
        Lors du lancement officiel et de la constitution de la structure commerciale d&apos;earlypanel, des CGV complètes seront publiées, comprenant notamment :
      </p>
      <ul>
        <li>Les tarifs forfaitaires définitifs et les conditions de paiement.</li>
        <li>Les SLA (délais garantis et pénalités).</li>
        <li>Les conditions d&apos;annulation et de remboursement.</li>
        <li>Les engagements de qualité et de remplacement de tests insuffisants.</li>
      </ul>

      <h2>8. Loi applicable</h2>
      <p>
        Les présentes CGV sont soumises au droit français. Tout litige relèvera de la compétence des tribunaux français selon les règles de droit commun.
      </p>

      <h2>9. Contact</h2>
      <p>
        Pour toute question, demande de devis ou prise de rendez-vous : <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a> ou <a href="https://calendly.com/earlypanel/demo" target="_blank" rel="noopener noreferrer">réservation directe</a>.
      </p>
    </LegalLayout>
  );
}
