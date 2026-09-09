---
title: "Tester une maquette Figma avec de vrais utilisateurs : préparer le prototype pour qu'il tienne"
description: "Un prototype Figma soumis à des inconnus casse vite. Ce qu'il faut préparer avant le test : parcours fermés, états, données réalistes, écran de secours, et ce qu'on ne peut pas tester sur une maquette."
date: 2026-09-09
tags: [figma, prototype, méthode]
draft: false
---

Tester une maquette avant d'écrire une ligne de code est la meilleure économie qu'une équipe produit puisse faire. Mais un prototype Figma conçu pour une démo interne n'est pas un prototype prêt pour des inconnus. En démo, c'est vous qui cliquez, et vous savez où. Un testeur, lui, cliquera partout où il s'attend à pouvoir cliquer. Si rien ne se passe, il conclura que le produit est cassé, et sa réponse ne vous apprendra rien.

Voici ce qu'il faut préparer, et ce qu'il faut accepter de ne pas pouvoir tester.

## Fermer les parcours, pas seulement le chemin idéal

Un prototype de démo relie les écrans dans l'ordre prévu. Un prototype de test doit aussi prévoir les écarts raisonnables :

- **Les chemins alternatifs.** Si deux boutons peuvent mener à la création d'un devis, les deux doivent fonctionner. Sinon, vous ne saurez jamais lequel est le plus naturel.
- **Les retours en arrière.** Le bouton retour du navigateur ne fonctionne pas dans un prototype. Prévoyez un retour visible sur chaque écran, sinon un testeur perdu reste perdu.
- **Les sorties.** Fermer un panneau, annuler, quitter un formulaire. Ce sont des actions que les gens font constamment et qui, absentes, bloquent le test.

Le critère : un testeur doit pouvoir atteindre l'objectif du scénario par au moins deux chemins et revenir en arrière depuis n'importe quel écran sans se retrouver dans une impasse.

## Afficher les états, pas seulement l'écran parfait

Un formulaire ne se teste pas sans ses états : champ vide, champ en erreur, chargement, succès. Si un testeur valide un formulaire incomplet et que la maquette passe à l'écran suivant comme si de rien n'était, vous perdez exactement l'information que vous cherchiez (comprend-il ce qui est obligatoire ?) et vous donnez une fausse impression de réussite.

Les états qui comptent pour un test :

1. L'erreur de saisie la plus probable, avec son message.
2. L'état de chargement, même symbolique, pour que la transition soit crédible.
3. L'état vide (pas encore de devis, pas encore de client) si le scénario commence à zéro.
4. La confirmation de fin : c'est elle qui permet au testeur de savoir qu'il a terminé, et à vous de compter une réussite.

## Remplacer le faux texte par des données plausibles

Des « Lorem ipsum », des clients nommés « Client 1 » et des montants à 0 € poussent les testeurs hors de la situation. Ils ne lisent plus, ils cliquent. Remplissez la maquette avec des données qui ressemblent à la réalité de votre cible : des noms d'entreprises crédibles, des montants réalistes, des dates cohérentes avec le scénario.

Attention à l'inverse : si le scénario demande de « créer un devis pour Dupont Menuiserie » et qu'un devis Dupont Menuiserie existe déjà dans la liste, vous venez de donner la réponse. Les données de la maquette doivent servir le scénario sans le résoudre.

## Prévoir l'écran de secours

Quoi que vous fassiez, un testeur finira dans un cul-de-sac que vous n'aviez pas prévu. Plutôt que de le laisser conclure à un bug, prévoyez un écran ou un encart discret, accessible depuis partout, qui dit en une phrase : « Cette partie n'est pas encore disponible dans cette version de test. Revenez à l'étape précédente. » Ce n'est pas une tricherie : c'est ce qui distingue un problème de votre produit d'une limite de votre maquette dans les réponses.

## Choisir le bon mode de partage

Trois réglages Figma à vérifier avant d'envoyer le lien :

- **Le lien de prototype, pas le lien du fichier.** Un testeur qui atterrit sur le canevas de conception voit tous vos écrans d'un coup, y compris ceux que vous ne vouliez pas montrer.
- **L'accès sans connexion.** Si le lien exige un compte Figma, vous perdrez les testeurs qui n'en ont pas, et précisément ceux qui ressemblent le moins à vos collègues.
- **Le mode d'affichage.** Masquez l'interface Figma (barre d'outils, panneau de commentaires) et choisissez un cadrage « ajuster à l'écran ». Pour un prototype mobile, précisez dans le scénario qu'il faut l'ouvrir sur téléphone : tester un parcours mobile sur un écran d'ordinateur donne des résultats sans valeur.

Testez le lien vous-même en navigation privée, depuis un téléphone, avant de l'envoyer.

## Ce qu'une maquette ne peut pas vous dire

Soyez lucide sur les limites, et dites-le dans le scénario pour ne pas polluer les réponses :

- **La performance.** Une maquette est instantanée. Votre produit ne le sera pas. Aucune conclusion sur la rapidité perçue.
- **Le contenu réel.** Les libellés sont testables, les données ne le sont pas : le testeur ne peut pas saisir son vrai client, ses vrais montants.
- **Les cas limites.** Un nom trop long, un montant négatif, un retour réseau : tout ce qui n'est pas dessiné n'existe pas.
- **L'apprentissage.** Un test sur maquette capture la première utilisation. Il ne dit rien de ce que deviendra le parcours à la dixième.

Ce qu'une maquette teste très bien, en revanche, c'est l'essentiel : la compréhension des libellés, la logique de navigation, l'ordre des étapes, la hiérarchie visuelle, et la capacité d'un nouvel arrivant à atteindre un objectif sans aide. C'est là que se jouent la plupart des abandons, et c'est là qu'une correction coûte encore quelques heures plutôt que quelques sprints.

## Le bon moment

Le meilleur moment pour tester une maquette est celui où elle est assez complète pour qu'un inconnu puisse dérouler un scénario de bout en bout, et encore assez légère pour que vous acceptiez de la changer. Si l'équipe de développement a déjà commencé, vous testerez quand même, mais vous écouterez moins.

Pour le déroulé complet d'une mission sur maquette, du cadrage au rapport, voir [tester une maquette Figma avec earlypanel](/test-maquette-figma).
