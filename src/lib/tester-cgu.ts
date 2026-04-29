import { createHash } from "node:crypto";

/**
 * Texte des CGU testeur signees au moment de la saisie de l'IBAN.
 * Toute modification de fond doit incrementer CGU_VERSION : on hashera la
 * nouvelle version au moment de la signature, et on demandera resignature
 * a chaque testeur a sa prochaine action sensible (paiement / modif IBAN).
 *
 * Version active : v1.0-2026-04
 *
 * IMPORTANT : ce texte n'est PAS un document juridique definitif. A faire
 * relire par un avocat avant production reelle. Voir bandeau "Document
 * temporaire" sur les pages legales.
 */

export const CGU_VERSION = "v1.0-2026-04";

export const CGU_TEXT = `CONDITIONS GENERALES TESTEUR — earlypanel
Version ${CGU_VERSION}

1. OBJET
Les presentes conditions encadrent la relation entre earlypanel (l'editeur) et
le testeur (vous), dans le cadre de missions de test utilisateur remunerees
sous forme d'indemnites.

2. NATURE DE LA RELATION
Le testeur agit en tant que participant independant. Les presentes ne creent
ni contrat de travail, ni lien de subordination, ni relation commerciale.
Les indemnites versees ne constituent pas un salaire mais une compensation
forfaitaire pour la participation aux tests.

3. INDEMNITES ET PAIEMENT
A chaque mission validee, le testeur recoit une indemnite definie a l'avance.
Le paiement est effectue par virement SEPA vers le compte bancaire dont l'IBAN
a ete renseigne par le testeur. Les versements sont regroupes en lots
periodiques (mensuels ou hebdomadaires).

4. AUTORISATION DE VIREMENT
En signant ces CGU, le testeur autorise earlypanel a effectuer des virements
SEPA vers l'IBAN qu'il a fourni. Cet IBAN sert exclusivement a la reception
des indemnites : aucun prelevement ne pourra etre effectue depuis ce compte.

5. OBLIGATIONS FISCALES
Au-dela d'un seuil annuel cumule (DAS-2 en France), earlypanel devra declarer
les sommes versees a l'administration fiscale. Le testeur est seul responsable
de la declaration de ses indemnites au titre de l'impot sur le revenu, selon
les regles applicables a sa residence fiscale.

6. CONFIDENTIALITE ET SECURITE DES DONNEES
L'IBAN est stocke chiffre au repos. Il n'est jamais affiche en clair dans
l'interface : seuls les 4 derniers caracteres sont visibles. Le testeur peut
le modifier ou le supprimer a tout moment depuis son profil.

7. SIGNATURE ELECTRONIQUE (eIDAS SES)
La signature electronique de ces CGU est realisee selon la norme eIDAS niveau
"Signature Electronique Simple". earlypanel conserve : la date et heure de
signature, l'adresse IP, le user-agent du navigateur, ainsi que le hash SHA-256
de cette version du texte. Ces elements constituent la preuve de signature.

8. RESILIATION
Le testeur peut a tout moment supprimer son IBAN et fermer son compte. Les
indemnites deja gagnees et non versees seront reglees lors du prochain lot
de paiement.

9. PROTECTION DES DONNEES (RGPD)
earlypanel est responsable du traitement des donnees personnelles. Les bases
contractuelle (execution des CGU) et legale (obligations fiscales) sont
applicables. Les donnees sont conservees pendant la duree minimale legale.
Pour exercer vos droits RGPD : contact@earlypanel.fr

10. DROIT APPLICABLE
Les presentes sont regies par le droit francais. Tout litige releve de la
competence des tribunaux francais.
`;

/**
 * Calcule le hash SHA-256 du texte CGU. Sert de preuve d'integrite : si
 * le texte change, le hash change, et on saura que le testeur n'a pas
 * signe la version courante.
 */
export function getCguHash(): string {
  return createHash("sha256").update(CGU_TEXT, "utf8").digest("hex");
}
