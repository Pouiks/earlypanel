import type { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";

/**
 * Page publique « Sécurité et données ». Chaque affirmation correspond a un
 * mecanisme reel du code (references en commentaire). Ne rien promettre ici
 * qui ne soit pas implemente : cette page sert de reference en cas de
 * question client ou testeur.
 */
export const metadata: Metadata = {
  title: "Sécurité et protection des données", // le template du layout ajoute « · earlypanel »
  description:
    "Comment earlypanel protège les données des testeurs et les projets des clients : hébergement en Europe, connexion sans mot de passe, IBAN chiffré, NDA tracé, documents privés, conservation limitée.",
  alternates: { canonical: "/securite" },
  openGraph: {
    title: "Sécurité et protection des données · earlypanel",
    description:
      "Hébergement en Europe, connexion sans mot de passe, IBAN chiffré, NDA tracé, documents privés, conservation limitée à 3 ans.",
    url: "/securite",
    type: "article",
    locale: "fr_FR",
  },
};

export default function SecuritePage() {
  return (
    <LegalLayout eyebrow="Sécurité et données" title="Comment nous protégeons vos données" lastUpdated="9 septembre 2026">
      <p>
        earlypanel manipule deux choses sensibles : les données personnelles des testeurs (identité, coordonnées, IBAN) et les produits non publiés de nos clients (maquettes, préversions, accès de test). Cette page décrit, sans jargon, ce que nous faisons concrètement pour les protéger. Pour les aspects juridiques, voir la <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>1. Où sont vos données</h2>
      <ul>
        {/* PROJECT_CONTEXT §13.1 : Supabase eu-north-1, fonctions Vercel epinglees arn1 (vercel.json). */}
        <li><strong>Base de données et fichiers</strong> : Supabase (PostgreSQL), hébergé dans l&apos;Union européenne (Stockholm, Suède).</li>
        <li><strong>Application</strong> : Vercel, avec le code serveur exécuté en Europe, dans la même région que la base.</li>
        <li><strong>Emails</strong> : Resend, uniquement pour les emails transactionnels (connexion, NDA, missions, paiements). Aucun email marketing.</li>
        <li>Toutes les connexions sont chiffrées (TLS). Aucune donnée n&apos;est revendue ni partagée à des fins publicitaires.</li>
      </ul>

      <h2>2. Connexion sans mot de passe</h2>
      <ul>
        {/* src/app/api/testers/login/route.ts, src/app/app/auth/confirm/page.tsx, src/lib/rate-limit.ts */}
        <li>Il n&apos;y a <strong>aucun mot de passe à retenir, donc aucun mot de passe à voler</strong>. Vous recevez un lien de connexion à usage unique, limité dans le temps.</li>
        <li>Le lien passe par une page de confirmation : un antivirus ou un scanner d&apos;emails qui l&apos;ouvre à votre place ne peut pas consommer votre connexion.</li>
        <li>Les demandes de connexion sont limitées par adresse IP et par adresse email pour bloquer les tentatives automatisées.</li>
        <li>Le formulaire répond de la même façon que l&apos;email existe ou non : impossible de deviner qui est inscrit au panel.</li>
      </ul>

      <h2>3. Cloisonnement des accès</h2>
      <ul>
        {/* RLS deny-all sur toutes les tables (PROJECT_CONTEXT C8), middleware.ts, getStaffMember / getAuthedTester */}
        <li>Chaque table de la base est verrouillée par défaut (Row Level Security). Le navigateur n&apos;accède jamais directement aux données : tout passe par notre serveur, qui vérifie votre identité à chaque requête.</li>
        <li>Les espaces testeur et staff sont séparés. Un testeur ne voit que ses propres missions, documents et paiements.</li>
        <li>Un testeur ne voit une mission, ses adresses de test et ses consignes <strong>qu&apos;après avoir signé l&apos;accord de confidentialité</strong> du projet.</li>
      </ul>

      <h2>4. Coordonnées bancaires</h2>
      <ul>
        {/* supabase/migrations/027 (pgp_sym_encrypt), src/app/api/testers/me/payment-info/route.ts, export CSV 029 */}
        <li>L&apos;IBAN est <strong>chiffré dans la base de données</strong> avec une clé qui n&apos;est pas stockée dans la base. Un accès direct aux données ne suffit pas à le lire.</li>
        <li>Il n&apos;est jamais renvoyé en clair à l&apos;application ni envoyé par email : seuls le pays et les quatre derniers caractères sont affichés.</li>
        <li>Les virements sont exécutés par notre banque, pas par la plateforme. Chaque export de paiement est tracé (qui, quand, quel lot).</li>
        <li>Vous pouvez supprimer votre IBAN à tout moment depuis votre espace.</li>
      </ul>

      <h2>5. Accords de confidentialité (NDA)</h2>
      <ul>
        {/* src/app/api/testers/documents/[projectId]/sign/route.ts, src/lib/nda-pdf.ts, Flux 11 */}
        <li>Chaque NDA signé est généré en PDF sur nos serveurs, avec une empreinte SHA-256, l&apos;horodatage serveur, l&apos;adresse IP et le navigateur du signataire.</li>
        <li>La signature est enregistrée dans un journal d&apos;audit <strong>inaltérable</strong> (ajout seul, ni modification ni suppression), indépendant du dossier du testeur.</li>
        <li>Si le PDF ne peut pas être archivé, la signature est refusée : nous ne considérons jamais un NDA comme signé sans sa preuve.</li>
        <li>Le testeur et l&apos;équipe earlypanel peuvent consulter le document signé à tout moment.</li>
      </ul>

      <h2>6. Documents et fichiers</h2>
      <ul>
        {/* bucket documents prive (ensureDocumentsBucketPrivate), URLs signees, src/lib/document-validation.ts, src/lib/image-validation.ts */}
        <li>Les NDA signés et les documents de projet sont stockés dans un espace <strong>privé</strong>, jamais accessible par une adresse publique. Chaque ouverture passe par un lien à durée de vie courte (quelques minutes à une heure), généré après vérification de votre identité.</li>
        <li>Les fichiers envoyés (captures d&apos;écran, briefs) sont vérifiés sur leur contenu réel, pas sur leur extension, et limités en taille.</li>
        <li>Les captures d&apos;écran de mission ne sont visibles que par le testeur qui les a prises et par l&apos;équipe earlypanel.</li>
      </ul>

      <h2>7. Traçabilité</h2>
      <ul>
        {/* src/lib/audit.ts, staff_audit_log append-only */}
        <li>Les actions sensibles (envoi et signature de NDA, paiements, suppressions, consultations de documents, tâches automatiques) sont journalisées avec leur auteur, leur date, l&apos;adresse IP et le navigateur.</li>
        <li>Ce journal ne peut être ni modifié ni effacé, y compris par nous.</li>
      </ul>

      <h2>8. Vos réponses sont lues par des humains</h2>
      <p>
        {/* Decision fondateur 2026-09-09 : pas de scoring IA. La notation est manuelle (PATCH answers, staff_rating). */}
        Aucun traitement automatisé ne note vos réponses ni ne décide de votre rémunération. Chaque retour est lu et évalué par l&apos;équipe earlypanel. Les seules vérifications automatiques portent sur la forme (réponse vide, fichier invalide), jamais sur le fond.
      </p>

      <h2>9. Conservation et effacement</h2>
      <ul>
        {/* migrations 043/044, /api/cron/retention, /api/testers/me DELETE */}
        <li>Les données de profil sont conservées <strong>3 ans après votre dernière connexion</strong>. 90 jours avant l&apos;échéance, un email vous prévient. Sans connexion, le compte est anonymisé automatiquement : identité, coordonnées, date de naissance et IBAN effacés, accès supprimé.</li>
        <li>Vous pouvez supprimer votre compte vous-même depuis votre espace. Si vous avez des missions payées, l&apos;anonymisation remplace la suppression pour respecter nos obligations comptables : écrivez à <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a>.</li>
        <li>Les NDA signés et les écritures de paiement sont conservés pendant les durées légales (preuve contractuelle, comptabilité), rattachés à un identifiant anonyme.</li>
      </ul>

      <h2>10. Pour les entreprises clientes</h2>
      <ul>
        <li>Chaque testeur signe un NDA propre à votre projet avant de voir la moindre adresse ou consigne.</li>
        <li>Votre brief et vos documents ne sont visibles que par l&apos;équipe earlypanel, jamais par les testeurs.</li>
        <li>Les accès de test que vous nous confiez sont distribués aux seuls testeurs sélectionnés, après signature du NDA. Nous vous recommandons des comptes de test dédiés, révoqués à la fin de la mission.</li>
        <li>Le rapport présente les retours par profil (métier, équipement, contexte). Les coordonnées des testeurs (email, téléphone, adresse, IBAN) ne sont jamais transmises aux clients.</li>
      </ul>

      <h2>11. Signaler une faille</h2>
      <p>
        Vous avez repéré un problème de sécurité ? Écrivez à <a href="mailto:contact@earlypanel.fr">contact@earlypanel.fr</a> avec les étapes pour le reproduire. Nous accusons réception, corrigeons en priorité et vous tenons informé. Les coordonnées de contact sont aussi publiées à l&apos;adresse standard <a href="/.well-known/security.txt">/.well-known/security.txt</a>.
      </p>

      <h2>12. Ce que nous ne faisons pas</h2>
      <ul>
        <li>Pas de mot de passe stocké.</li>
        <li>Pas de cookie publicitaire, pas de traceur tiers.</li>
        <li>Pas de revente ni de partage de données à des tiers.</li>
        <li>Pas d&apos;IBAN en clair, nulle part.</li>
        <li>Pas de notation automatique de vos réponses.</li>
      </ul>
    </LegalLayout>
  );
}
