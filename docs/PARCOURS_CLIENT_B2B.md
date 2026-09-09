# Parcours client earlypanel : de la sollicitation B2B au rapport livré

Document de référence pour produire un diaporama. Chaque section numérotée correspond à une diapositive (ou un groupe de diapositives). Tout ce qui est décrit ici est ce que la plateforme fait réellement au 9 septembre 2026 (source : code de `src/`, `PROJECT_CONTEXT.md`). Les étapes « hors plateforme » (appel, atelier, restitution) sont signalées comme telles.

---

## 0. Vue d'ensemble

**Trois acteurs**

| Acteur | Rôle | Espace |
|---|---|---|
| Le client (équipe produit, startup, agence) | Exprime un besoin, valide le questionnaire, reçoit le rapport | Site public, email, visio. Pas de portail client. |
| L'équipe earlypanel (« staff ») | Cadre, configure, recrute, contrôle, rédige, paie | Dashboard staff `/staff/dashboard` |
| Le testeur | Signe un NDA, réalise la mission, répond au questionnaire, est payé | Espace testeur `/app/dashboard` |

**Dix phases**

1. Sollicitation du client (site, formulaire, appel)
2. Qualification et cadrage
3. Configuration du projet
4. Recrutement et invitation des testeurs
5. Côté testeur : NDA, mission, formulaire
6. Contrôle qualité et dépouillement
7. Rédaction du rapport
8. Livraison et restitution au client
9. Paiement des testeurs
10. Après-projet

**Ligne de temps type**

| Moment | Événement |
|---|---|
| J0 | Brief reçu ou appel réservé |
| J0 à J+1 | Réponse sous 24 h, appel découverte de 30 min |
| J+1 à J+3 | Atelier de cadrage (1 h), devis sous 48 h, NDA client |
| Semaine suivante | Questionnaire co-construit et validé, testeurs invités |
| Lancement | NDA signés, missions ouvertes |
| Lancement + 5 jours ouvrés | Rapport livré et restitué (3 à 4 jours sur petit scope, 7 à 10 sur scope complexe) |
| Rapport + 72 h | Testeurs payés |

---

## 1. Sollicitation du client

### 1.1 Points d'entrée

- Recherche Google et citations ChatGPT vers la home, `/entreprises` (page pilier), et les quatre landings thématiques : test de maquette Figma, test avant lancement sur staging, test de funnel de conversion, page agences.
- LinkedIn (page entreprise earlypanel).
- Recommandation directe.

### 1.2 Trois portes d'entrée sur le site

| Porte | Friction | Ce qui se passe |
|---|---|---|
| « Réserver un appel gratuit » | Forte | Ouvre l'agenda de réservation (créneau de 30 min). |
| « Voir un rapport d'exemple » | Faible | Formulaire email sur la home (`#rapport`). |
| « Démarrer un projet » | Moyenne | Formulaire de brief sur `/entreprises#brief`. |

### 1.3 Rapport d'exemple (lead magnet)

- Le visiteur saisit son email.
- La plateforme envoie automatiquement l'email « Votre exemple de rapport earlypanel » avec le PDF `earlypanel-rapport-exemple.pdf` en pièce jointe.
- Aucun compte créé, aucune relance automatique.

### 1.4 Formulaire de brief

Champs : prénom, nom, email professionnel (obligatoire), entreprise, type de produit à tester (liste), description du besoin (obligatoire, 20 caractères minimum), budget indicatif (1 000 à 3 000 € / 3 000 à 10 000 € / plus de 10 000 €).

Protections : champ piège invisible (honeypot), limite de 5 envois par minute par adresse IP et 3 par heure par email, détection de saisies factices sur le nom et le prénom.

Ce que la plateforme fait : elle ne stocke rien en base. Elle envoie un email interne à l'équipe, sujet « [earlypanel] Nouveau brief : {société} », contenant tous les champs plus l'IP et le navigateur de l'expéditeur.

Promesse affichée au client : réponse sous 24 h avec un créneau d'appel et un forfait chiffré.

---

## 2. Qualification et cadrage (hors plateforme)

### 2.1 Appel découverte (30 min)

- Produit à tester, cible utilisateur, délai souhaité.
- Vérification que le panel contient les profils demandés.
- Pas de présentation commerciale, pas d'engagement.

### 2.2 Atelier de cadrage offert (visio d'une heure)

- Qui sont les utilisateurs réels.
- Ce qui bloque aujourd'hui, ce qui aiderait l'équipe à décider.
- Objectif business, périmètre inclus et exclu, consignes particulières.
- Choix du support : maquette Figma, URL de staging, produit en production, application mobile, document ou processus, tunnel e-commerce.
- Dimensionnement : 5 à 8 testeurs pour explorer, 12 à 20 pour mesurer un taux de conversion, 30 et plus pour des chiffres significatifs.

### 2.3 Devis et contrat

- Forfait fixe par mission, devis sous 48 h, fourchette publique de 1 500 à 6 000 € HT.
- Variables : nombre de testeurs, rareté du profil, durée du parcours, complexité du livrable.
- Paiement : 50 % à la commande, 50 % à la remise du rapport. Pas d'abonnement.
- NDA signé avec le client avant tout échange de matériel (signature électronique à valeur de preuve eIDAS).

### 2.4 Création de la fiche client (dashboard staff, page Clients)

Champs : nom de la société (obligatoire), secteur, site web, taille, numéro de TVA, adresse de facturation, contact (prénom, nom, email, téléphone, rôle), statut. La fiche compte les projets rattachés.

---

## 3. Configuration du projet (dashboard staff)

### 3.1 Création

- Titre, date de début et date de fin (obligatoires, fin après début), client rattaché.
- Référence automatique « PROJ-00001 » (séquence).
- Statut initial : brouillon (`draft`).

### 3.2 Onglet Informations

- Description de la mission (texte riche), URLs à tester, domaine restreint.
- Type de test : modéré ou non modéré (dans la pratique, non modéré : le testeur suit le parcours seul, à distance).
- Option audit Lighthouse (scores performance, accessibilité, SEO, bonnes pratiques et constats, repris dans le rapport).
- Contexte du rapport : objectif business, périmètre inclus, hors périmètre, consignes du client.
- Rémunération des testeurs : montant de base en centimes, ou grille par niveau (standard, expert, premium).
- Ciblage : genre, âge, CSP, secteur, villes, plus les critères étendus (persona, métier, taille d'entreprise, niveau digital, appareils, navigateurs, OS mobile, connexion, outils, centres d'intérêt, disponibilité, expérience UX). Chaque critère peut être marqué « obligatoire ». Nombre de testeurs voulu.

### 3.3 Onglet Scénarios (le questionnaire, co-construit avec le client)

- Un projet contient un ou plusieurs cas d'usage.
- Chaque cas d'usage : titre, consigne donnée au testeur (« Inscrivez-vous et créez votre premier projet »), critères de succès dont un critère principal (sert au taux de complétion), liste de questions.
- Types de question : texte libre (avec indication d'aide), Oui / Non / Partiel, échelle de 1 à 5.
- Questions conditionnelles : une question peut dépendre d'une question Oui / Non placée avant elle.
- Le client voit et valide la version finale avant envoi aux testeurs (ordre, ton, ce qui est explicite, ce qui reste ouvert).

### 3.4 Onglet NDA

- Un NDA par projet, généré depuis un modèle standard avec variables (société cliente, projet, identité du testeur), personnalisable.
- Si aucun NDA n'a été rédigé, il est créé automatiquement au moment de l'invitation.

---

## 4. Recrutement et invitation des testeurs

### 4.1 Le vivier : comment un testeur entre dans le panel

- Inscription gratuite sur `/testeurs` (email, métier, quelques champs) : email de bienvenue avec lien de connexion sans mot de passe.
- Onboarding en 5 étapes : identité, adresse (nécessaire au NDA), profil professionnel, équipement, préférences. 18 champs obligatoires.
- Activation automatique dès que le profil est complet. Relances automatiques du profil incomplet à partir de J+2 (au plus 3 relances espacées de 5 jours), puis mise en pause réversible.
- Attribution automatique d'un persona, vue « Diversité » du panel dans le dashboard staff.
- Score qualité initial de 100, niveau standard.

### 4.2 Campagne de disponibilité (optionnelle)

Email « Êtes-vous toujours disponible pour des tests earlypanel ? » avec deux boutons cliquables sans connexion. Réutilisable tous les 7 jours. Permet de ne solliciter que des testeurs disponibles.

### 4.3 Onglet Testeurs : sélection à la main

- Le panel est affiché face à la cible du projet : une pastille par critère (satisfait, non satisfait, non renseigné).
- Score = nombre de critères souhaités satisfaits. Seuls les critères obligatoires excluent un testeur.
- Un humain lit chaque profil et choisit. Deux options : constituer une présélection (statut `selected`, aucun email) ou inviter directement.

### 4.4 Invitation

Conditions : projet non clôturé, au moins une question, testeur actif avec profil complet.

Séquence pour chaque testeur :
1. Envoi de l'email « NDA à signer - {projet} » avec lien vers ses documents.
2. Seulement si l'email part : passage au statut `nda_sent`, horodaté.
3. Le projet passe automatiquement de brouillon à actif au premier envoi.
4. Trace dans le journal d'audit (qui a invité qui, quand).

### 4.5 Relance automatique du NDA

Cron quotidien à 9 h UTC : testeurs en `nda_sent` depuis plus de 3 jours reçoivent « Relance : NDA en attente de signature - {projet} ». Une relance tous les 3 jours au plus, uniquement si le projet est actif et non expiré.

---

## 5. Côté testeur : NDA, mission, formulaire

### 5.1 Connexion et espace personnel

- Connexion par lien magique reçu par email (« Votre lien de connexion earlypanel »), pas de mot de passe.
- Tableau de bord avec compteurs : documents à signer, missions ouvertes, profil à compléter.
- Sections : Missions, Documents, Gains, Profil.

### 5.2 Signature du NDA (page Documents)

- Le testeur lit le NDA et le signe électroniquement.
- La plateforme génère le PDF, calcule son empreinte SHA-256, le stocke dans un espace privé (URLs signées valables 1 h), enregistre IP, navigateur, identité, date de naissance et horodatage dans un journal d'audit immuable. C'est la preuve juridique.
- Statut `nda_signed`. Email « NDA validé - démarrez votre mission {projet} ».

### 5.3 Page mission

- Titre, société cliente, description, URLs à tester, dates d'ouverture et de clôture.
- Bouton « Démarrer le test », désactivé avec explication si : délai dépassé, projet inactif, mission pas encore ouverte, NDA non signé (lien vers Documents), NDA pas encore envoyé.
- Le démarrage est irréversible : statut `in_progress`, horodaté. Le testeur s'engage à terminer avant la clôture.

### 5.4 Remplissage du formulaire

- Organisation par cas d'usage : consigne, critères de succès, puis questions dans l'ordre.
- Réponse texte jusqu'à 10 000 caractères, Oui / Non / Partiel, échelle 1 à 5, questions conditionnelles affichées selon la réponse parente.
- Captures d'écran : jusqu'à 3 par question et 15 par mission, 5 Mo maximum, JPEG / PNG / WebP, compressées côté navigateur (1920 px, JPEG qualité 0,82).
- Sauvegarde automatique 2 secondes après chaque frappe et à la sortie du champ. Le testeur peut fermer et reprendre.
- Aucun jargon, pas de bonne ou mauvaise réponse : on demande le vécu.

### 5.5 Soumission

- Condition : toutes les questions ont une réponse texte non vide (les images ne sont pas obligatoires).
- Modale « Soumettre votre mission ? » puis « Soumettre définitivement ».
- Statut `completed`, +5 points de score qualité.

### 5.6 Rappels et clôture automatiques

- À mi-parcours du projet : email « Mi-parcours : pensez à compléter votre mission {projet} » aux testeurs qui n'ont pas soumis (une seule fois).
- À la date de fin : le projet passe automatiquement en clôturé (cron horaire).
- Un testeur qui n'a pas soumis, ou n'a pas signé son NDA, à la clôture reçoit un malus de 15 points.

---

## 6. Contrôle qualité et dépouillement (dashboard staff)

### 6.1 Onglet Réponses : lecture testeur par testeur

- Pour chaque testeur : ses réponses et ses captures d'écran.
- Notation de 1 à 5, note interne, case « bâclé ».
- Effets automatiques de la première notation :

| Notation | Score qualité | Mission comptée | Rémunération |
|---|---|---|---|
| 4 ou 5 | +10 | oui | base × 1,1 |
| 3 | +2 | oui | base × 1,0 |
| 1 ou 2 | −10 | non | base × 0,85 |
| Bâclé | −20 | non | 0 € |

- Un test refusé n'est ni payé ni comptabilisé dans le rapport. Un nouveau testeur est lancé, sans facturation supplémentaire.
- Le niveau du testeur est recalculé (expert : score ≥ 65 et 2 missions ; premium : score ≥ 80 et 5 missions). Sous 40, suspension automatique.

### 6.2 Onglet Dépouillement : lecture question par question

- Vue transversale par cas d'usage : chaque question avec toutes les réponses des testeurs côte à côte.
- C'est la matière de l'analyse : repérer les frictions récurrentes, les verbatims illustratifs, les écarts entre profils.

### 6.3 Export

- Export JSON ou CSV du projet : panel anonymisé (T01, T02…), âge, genre, métier, secteur, niveau digital, équipement, toutes les réponses, scores d'audit si activé.

---

## 7. Rédaction du rapport (onglet Rapport)

### 7.1 Principe

Le staff rédige, le système assiste. Deux sources proposées automatiquement :
- Verbatims : les vraies réponses texte, avec l'identifiant anonyme du testeur (T01…) et la question, insérables en un clic dans une friction.
- Chiffres calculés : taille du panel, âge moyen, taux de complétion sur le critère principal de chaque scénario.

### 7.2 Structure du rapport

1. Date de livraison.
2. Synthèse exécutive : verdict et chiffres clés.
3. Bugs.
4. Frictions UX : titre, étape du parcours, impact (bloquant, ralentit, mineur), verbatims rattachés, analyse. Seuils de sévérité proposés : bloquant si 40 % des testeurs sont touchés, majeur entre 25 % et 50 %.
5. Recommandations : titre, priorité (P1 critique, P2 important, P3 souhaitable), ce que ça résout, impact attendu, effort technique.
6. Matrice impact / effort : quick wins, stratégique, à planifier, backlog.
7. Audit technique Lighthouse si activé.
8. Annexes (optionnelles) : réponses complètes.

### 7.3 Vue consultable et PDF

Page « Rapport » mise en page : en-tête projet, contexte (objectif, périmètre, consignes), synthèse, panel de test (tableau anonymisé), scénarios testés, bugs, frictions, recommandations, matrice, audit, annexes. Bouton « Télécharger en PDF » (impression, contrôles masqués). Pied de page : « earlypanel · Rapport de test utilisateur · {projet} ».

### 7.4 Statut du rapport

- Brouillon pendant la rédaction, sauvegarde manuelle.
- « Marquer comme livré » : statut publié, date de livraison figée. Retour en brouillon possible.

---

## 8. Livraison et restitution au client

### 8.1 Envoi

- Le PDF est envoyé par email au contact client par l'équipe (envoi manuel : il n'existe pas de portail client ni d'email automatique de livraison).
- Facturation du solde de 50 %.

### 8.2 Restitution en visioconférence

- Présentation à l'équipe du client : frictions priorisées, verbatims, quick wins.
- Objectif : l'équipe repart avec des actions concrètes, pas un PDF à archiver.

### 8.3 Engagement qualité

Si les retours ne permettent aucune conclusion claire, une nouvelle vague de tests est relancée gratuitement avec d'autres profils.

---

## 9. Paiement des testeurs

### 9.1 Création du versement

Un versement est créé à la première notation, montant = base (ou grille par niveau) × multiplicateur, 0 si bâclé. Le staff peut ajuster le montant final à la main.

### 9.2 Page Versements : virement SEPA

1. Sélection des lignes éligibles (testeur avec IBAN renseigné, non encore exportées).
2. Export CSV : lot référencé « BATCH-AAAA-SXX-NNN », IBAN déchiffrés par lot, trace d'audit de l'accès aux IBAN.
3. Import du fichier dans la banque (Qonto) et exécution des virements.
4. « Marquer le batch comme payé » : statut payé, date, audit, et email à chaque testeur « Votre paiement earlypanel a été émis · X € » avec lien vers ses gains.

Alternative disponible : transfert Stripe Connect par projet (transfert idempotent, confirmation par webhook).

### 9.3 Côté testeur

- Page Gains : état de chaque paiement (en attente, programmé, payé).
- Promesse : virement sous 72 h après validation, 5 à 7 jours sur projets complexes.
- Récapitulatif annuel des gains, déclaration DAC7 au-delà des seuils (2 000 € ou 30 transactions par an).

---

## 10. Après-projet

- Projet clôturé puis archivé ; réactivation possible avec nouvelle date de fin.
- Fiche client mise à jour (compteur de projets), base pour une seconde mission.
- Journal d'audit complet : invitations, signatures NDA, notations, accès IBAN, paiements.
- Le panel s'est enrichi : scores et niveaux mis à jour, testeurs fiables identifiés pour la prochaine sélection.

---

## Annexe A. Statuts d'un testeur sur un projet

`selected` (présélectionné) → `nda_sent` (NDA envoyé) → `nda_signed` (NDA signé) → `in_progress` (mission démarrée) → `completed` (soumise). Aucun retour en arrière.

## Annexe B. Statuts d'un projet

`draft` (brouillon) → `active` (au premier envoi de NDA) → `closed` (à la date de fin, automatique) → `archived`. Réactivation possible depuis clôturé ou archivé.

## Annexe C. Emails automatiques

| Moment | Sujet | Destinataire |
|---|---|---|
| Demande de rapport d'exemple | Votre exemple de rapport earlypanel (PDF joint) | Prospect |
| Formulaire de brief | [earlypanel] Nouveau brief : {société} | Équipe |
| Inscription testeur | {Prénom}, complétez votre profil earlypanel → | Testeur |
| Nouvelle inscription | [earlypanel] Nouvelle inscription : {email} | Équipe |
| Profil incomplet (J+2, max 3) | Relance profil, liste des champs manquants | Testeur |
| Campagne disponibilité | Êtes-vous toujours disponible pour des tests earlypanel ? | Testeur |
| Connexion | Votre lien de connexion earlypanel | Testeur |
| Invitation | NDA à signer - {projet} | Testeur |
| NDA non signé à J+3 | Relance : NDA en attente de signature - {projet} | Testeur |
| Signature | NDA validé - démarrez votre mission {projet} | Testeur |
| Mi-parcours | Mi-parcours : pensez à compléter votre mission {projet} | Testeur |
| Paiement | Votre paiement earlypanel a été émis · X € | Testeur |

## Annexe D. Ce qui est humain, ce qui est automatique

| Humain (équipe earlypanel) | Automatique (plateforme) |
|---|---|
| Appel, atelier, devis | Email de brief, rapport d'exemple |
| Rédaction du questionnaire avec le client | Activation des profils, relances, personas |
| Choix de chaque testeur | Score de correspondance à la cible |
| Envoi des invitations | Emails NDA, relances J+3, mi-parcours |
| Lecture et notation de chaque réponse | Score qualité, niveau, suspension, montant du versement |
| Rédaction du rapport | Verbatims et chiffres proposés, PDF |
| Envoi au client, restitution | Clôture à la date de fin |
| Exécution des virements dans la banque | Lot SEPA, emails de paiement, audit |
