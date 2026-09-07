import type { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata: Metadata = {
  title: "Conditions générales de vente", // le template du layout ajoute « · earlypanel »
  description: "Conditions générales de vente des prestations de tests utilisateurs earlypanel.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cgv" },
  openGraph: {
    title: "Conditions générales de vente · earlypanel",
    description: "Conditions générales de vente des prestations earlypanel.",
    url: "/cgv",
    type: "article",
    locale: "fr_FR",
  },
};

// Placeholder a remplacer avant mise en ligne : [TVA] (« TVA non applicable,
// article 293 B du CGI » ou « N° TVA intracommunautaire : FRxx... »).
export default function CgvPage() {
  return (
    <LegalLayout title="Conditions générales de vente" lastUpdated="7 septembre 2026">
      <p>
        Les présentes conditions générales de vente (CGV) s&apos;appliquent à toute prestation de tests utilisateurs fournie par earlypanel, éditée par Virgile Joinville, entrepreneur individuel (voir <a href="/mentions-legales">Mentions légales</a>), ci-après « earlypanel », à tout client professionnel, ci-après « le Client ». Toute commande implique l&apos;acceptation sans réserve des présentes.
      </p>

      <h2>1. Objet</h2>
      <p>
        earlypanel fournit une prestation de tests utilisateurs comprenant : un atelier de cadrage, la rédaction du questionnaire en collaboration avec le Client, la sélection des testeurs dans le panel earlypanel selon les critères convenus, la collecte et la validation manuelle des réponses, leur analyse, la remise d&apos;un rapport écrit et une restitution en visioconférence. Le périmètre exact de chaque mission (nombre de testeurs, profils, parcours testés, livrables) est défini au devis.
      </p>

      <h2>2. Devis et commande</h2>
      <p>
        Chaque mission fait l&apos;objet d&apos;un devis établi par earlypanel à l&apos;issue de l&apos;atelier de cadrage. Le devis est valable trente (30) jours à compter de sa date d&apos;émission. La commande est ferme et définitive à l&apos;acceptation écrite du devis par le Client, par signature ou par email de confirmation. Toute modification du périmètre après acceptation fait l&apos;objet d&apos;un avenant ou d&apos;un nouveau devis.
      </p>

      <h2>3. Prix et paiement</h2>
      <p>
        Les prix sont exprimés en euros hors taxes. [TVA]. Le paiement s&apos;effectue en deux fois : cinquante pour cent (50 %) à la commande, cinquante pour cent (50 %) à la remise du rapport. Les factures sont payables par virement bancaire à trente (30) jours à compter de leur date d&apos;émission. En cas de retard de paiement, des pénalités sont exigibles de plein droit au taux de refinancement de la Banque centrale européenne majoré de dix (10) points, ainsi qu&apos;une indemnité forfaitaire de recouvrement de quarante (40) euros, conformément à l&apos;article L441-10 du Code de commerce.
      </p>

      <h2>4. Délais</h2>
      <p>
        Le rapport est remis dans un délai de cinq (5) jours ouvrés à compter du lancement effectif des tests, c&apos;est-à-dire une fois le questionnaire validé par le Client et les testeurs sélectionnés. Sauf engagement écrit au devis, ce délai est indicatif. Le Client fournit les accès et validations nécessaires sous cinq (5) jours ouvrés à compter de la demande d&apos;earlypanel ; à défaut, le délai de livraison est décalé d&apos;autant.
      </p>

      <h2>5. Obligations du Client</h2>
      <p>
        Le Client s&apos;engage à fournir un support testable (maquette cliquable, URL de recette ou de production, application), des accès de test dédiés lorsque nécessaire, à valider le questionnaire dans les délais convenus et à désigner un interlocuteur unique pour la durée de la mission. Le Client garantit disposer des droits nécessaires sur le support soumis au test.
      </p>

      <h2>6. Confidentialité</h2>
      <p>
        Un accord de confidentialité (NDA) mutuel est signé entre earlypanel et le Client avant tout échange d&apos;informations sensibles. Chaque testeur signe également un engagement de confidentialité avant d&apos;accéder au support testé. Les preuves de signature (empreinte du document, horodatage, adresse IP) sont conservées pendant cinq (5) ans à des fins probatoires.
      </p>

      <h2>7. Qualité des tests</h2>
      <p>
        Chaque réponse est relue par earlypanel avant intégration au rapport. Toute réponse jugée insuffisante (trop courte, hors sujet, incohérente ou dupliquée) est refusée : elle n&apos;est ni payée au testeur ni facturée au Client, et un test de remplacement est lancé. Si l&apos;ensemble des retours d&apos;une mission ne permet aucune conclusion exploitable, earlypanel relance gratuitement une vague de tests avec d&apos;autres profils.
      </p>

      <h2>8. Propriété des livrables</h2>
      <p>
        Le rapport et les livrables associés deviennent la propriété du Client après paiement intégral de la mission. earlypanel conserve un droit d&apos;usage interne, sous forme anonymisée, des données collectées et des enseignements de la mission, à des fins d&apos;amélioration de ses méthodes. Aucune information permettant d&apos;identifier le Client ou son produit n&apos;est publiée sans son accord écrit.
      </p>

      <h2>9. Annulation</h2>
      <p>
        En cas d&apos;annulation par le Client avant le lancement des tests, earlypanel conserve l&apos;acompte à hauteur du travail réalisé (atelier de cadrage, rédaction du questionnaire, sélection des testeurs), le solde éventuel étant restitué. En cas d&apos;annulation après le lancement des tests, la mission est facturée intégralement.
      </p>

      <h2>10. Responsabilité</h2>
      <p>
        La responsabilité d&apos;earlypanel est limitée, tous préjudices confondus, au montant hors taxes de la mission concernée. Les recommandations contenues dans le rapport sont fournies à titre d&apos;aide à la décision : earlypanel ne garantit aucun résultat commercial, de conversion ou de chiffre d&apos;affaires découlant de leur mise en œuvre. earlypanel ne saurait être tenue responsable des dommages indirects.
      </p>

      <h2>11. Données personnelles</h2>
      <p>
        Le traitement des données personnelles des interlocuteurs du Client et des testeurs est décrit dans la <a href="/confidentialite">Politique de confidentialité</a>. Les données sont hébergées dans l&apos;Union européenne.
      </p>

      <h2>12. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGV sont soumises au droit français. À défaut de résolution amiable, tout litige relatif à leur interprétation ou à leur exécution relève de la compétence exclusive du tribunal de commerce de Montpellier.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question ou demande de devis : <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>.
      </p>
    </LegalLayout>
  );
}
