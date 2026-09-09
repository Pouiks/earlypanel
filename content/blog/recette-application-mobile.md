---
title: "Comment réaliser une bonne recette d'application mobile avant de publier"
description: "Recette d'une application mobile : ce qu'il faut tester, sur quels appareils, avec qui, et comment distinguer la recette technique du test utilisateur. Guide pratique."
date: 2026-09-11
tags: [application mobile, recette]
draft: false
---

La recette d'une application mobile est l'étape où l'on vérifie, avant de publier sur les stores, que l'application fait ce qu'elle doit faire et qu'un utilisateur normal s'en sort. Beaucoup d'équipes la réduisent à « on a testé sur nos téléphones, ça marche ». Puis les premiers avis à une étoile arrivent, sur un modèle que personne dans l'équipe ne possède, pour un parcours que personne n'avait refait depuis un mois. Voici comment organiser une recette qui évite ça, en séparant clairement ce qui relève de la vérification technique et ce qui relève du test utilisateur.

## Deux recettes, pas une

Une bonne recette d'application mobile est en fait deux exercices différents, faits par des personnes différentes.

**La recette technique** vérifie que l'application est conforme à ce qui a été spécifié : chaque écran s'affiche, chaque bouton fait ce qu'il doit, les données sont bien enregistrées, l'application ne plante pas. Elle est faite par l'équipe, à partir d'une liste de cas à vérifier, et elle produit des tickets de bug.

**Le test utilisateur** vérifie que des gens qui ne connaissent pas l'application arrivent à faire ce pour quoi elle existe : créer un compte, réserver, payer, retrouver une information. Il est fait par des personnes extérieures qui ressemblent à la cible, et il produit des frictions, c'est-à-dire des endroits où l'application fonctionne mais où l'utilisateur ne s'en sort pas.

Confondre les deux donne des recettes techniques faites par des inconnus qui ne savent pas ce qu'ils doivent vérifier, ou des tests utilisateurs faits par des développeurs qui ne peuvent plus voir les problèmes de compréhension. Les deux sont nécessaires, dans cet ordre : d'abord la technique, ensuite l'utilisateur. On ne fait pas tester par des inconnus une application qui plante au démarrage.

## La recette technique : une liste, pas une impression

Le principe est simple et rarement appliqué : écrire la liste de ce qu'il faut vérifier avant de commencer, puis la dérouler sans sauter d'étape. Les éléments qui manquent le plus souvent dans cette liste :

- **Les parcours complets**, pas les écrans isolés. Créer un compte, se déconnecter, se reconnecter, changer son mot de passe. Passer une commande, la modifier, l'annuler. Un écran qui fonctionne seul peut casser dans une séquence.
- **Les états intermédiaires** : chargement lent, connexion perdue au milieu d'une action, retour de l'application après un appel téléphonique, notification reçue pendant un formulaire.
- **Les permissions** : l'utilisateur refuse l'accès à la caméra, aux notifications, à la localisation. L'application doit continuer à fonctionner et expliquer ce qu'il perd.
- **Les entrées inattendues** : un nom avec un apostrophe, une adresse très longue, un montant à virgule, un clavier dans une autre langue.
- **La reprise après mise à jour** : installer la version précédente, créer des données, mettre à jour, vérifier que tout est encore là.
- **La suppression de compte** et l'export des données, obligatoires et souvent oubliés.

Chaque point est vérifié, daté, avec la version testée. Ce qui échoue devient un ticket avec les étapes pour reproduire, l'appareil et la version du système.

## Sur quels appareils tester

C'est la question où l'on se trompe le plus, parce que l'équipe teste sur ses propres téléphones, qui sont récents, rapides et bien configurés.

Le bon point de départ est votre cible réelle, pas le catalogue des constructeurs. Si vous avez déjà des utilisateurs, vos analytics donnent la répartition des modèles et des versions de système. Si vous n'en avez pas encore, partez du profil de votre cible : un public professionnel urbain n'a pas les mêmes téléphones qu'un public de retraités ou d'artisans.

Dans tous les cas, prévoyez au minimum :

- Un appareil **ancien ou d'entrée de gamme**, sur la version de système la plus basse que vous supportez. C'est là que les lenteurs et les plantages apparaissent.
- Un **grand écran** et un **petit écran**, pour les mises en page qui débordent ou qui laissent des trous.
- Les deux systèmes si vous êtes sur les deux, avec leurs différences de navigation : le bouton retour physique ou gestuel sur Android, les gestes de bord sur iOS.
- Une **connexion dégradée**, simulée ou réelle, et le mode avion en cours d'action.

Les simulateurs et émulateurs servent pour la mise en page, pas pour la recette finale : ils ne reproduisent ni les performances, ni les permissions, ni les interruptions d'un vrai téléphone.

## Le test utilisateur : des inconnus, un scénario, leurs propres téléphones

Une fois la recette technique passée, l'application est stable mais rien ne dit qu'elle est compréhensible. C'est le moment de la mettre entre les mains de personnes qui correspondent à votre cible, ne l'ont jamais vue, et l'utilisent sur leur propre appareil.

Ce qui fait la différence dans un test utilisateur d'application mobile :

- **La distribution.** Une version de test (TestFlight, lien de test interne sur le Play Store, fichier d'installation) que les testeurs peuvent installer seuls, avec une consigne d'installation vérifiée avant l'envoi. Un testeur qui n'arrive pas à installer l'application n'est pas un résultat, c'est un test perdu.
- **Le vrai téléphone.** Le testeur utilise son appareil, avec ses paramètres, sa connexion, son clavier. C'est exactement ce que vous ne pouvez pas reproduire en interne.
- **Des scénarios, pas des instructions.** « Vous venez de télécharger l'application pour réserver votre prochain cours. Réservez celui de jeudi soir. » Rien sur où cliquer. La méthode complète est décrite dans [test utilisateur à distance : la méthode](/blog/test-utilisateur-a-distance-methode).
- **Des captures d'écran.** Demandez aux testeurs de capturer l'écran à chaque hésitation. Sur mobile, une capture vaut souvent mieux qu'un paragraphe.
- **Un critère de réussite par scénario.** « La réservation apparaît dans l'onglet Mes cours. » C'est ce qui permet de dire combien ont réussi.

Huit à douze testeurs proches de votre cible suffisent pour voir les frictions principales d'une application avant publication. Le déroulé d'une mission sur une préversion est décrit sur [tester son produit avant le lancement](/test-pre-lancement-staging).

## Ce qu'une bonne recette produit

À la fin, vous devez avoir trois listes, et pas une seule :

1. **Les bugs**, issus de la recette technique et du test utilisateur, avec appareil, version et étapes pour reproduire. À corriger avant publication ou à documenter comme limitation connue.
2. **Les frictions**, issues du test utilisateur : ce qui fonctionne mais que les gens ne comprennent pas. Classées par gravité : bloque le parcours, ralentit, agace.
3. **Les décisions** : ce qui bloque la publication, ce qui attend la version suivante, ce que le support doit savoir dès le premier jour.

Une recette qui ne produit que la première liste vous dira que l'application marche. Elle ne vous dira pas si quelqu'un arrivera à s'en servir.

## Le calendrier réaliste

Comptez au moins deux semaines entre la fin du développement et la soumission aux stores : quelques jours de recette technique et de corrections, une semaine de test utilisateur sur une version stabilisée, quelques jours pour corriger ce qui bloque. Ajoutez le délai de validation des stores, qui n'est pas sous votre contrôle.

Si le calendrier ne laisse pas cette place, ce n'est pas la recette qu'il faut raccourcir, c'est la publication qu'il faut décaler. Une application publiée avec un parcours que personne ne comprend coûte plus cher en avis négatifs et en support qu'une semaine de retard.
