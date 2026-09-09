---
title: "Comment définir la cible d'un test utilisateur (et recruter les bons testeurs)"
description: "Définir sa cible avant un test utilisateur : les critères qui comptent vraiment, ceux qui ne servent à rien, et comment écrire un profil de testeur qu'on peut recruter."
date: 2026-09-11
tags: [panel, méthode]
draft: false
---

Comment définir qui est ma cible ? C'est la question qui décide de la valeur d'un test utilisateur avant même qu'il commence. Des scénarios parfaits, lus par les mauvaises personnes, produisent des conclusions fausses avec une grande assurance. Cet article donne une méthode simple pour passer de « nos utilisateurs » à un profil de testeur précis, recrutable, et suffisamment proche de vos vrais clients pour que leurs réactions vous apprennent quelque chose.

## Commencer par la décision, pas par le persona

Avant de décrire une cible, écrivez la décision que le test doit éclairer. « Faut-il simplifier l'inscription ? » appelle des testeurs qui n'ont jamais eu de compte. « Pourquoi les clients n'utilisent-ils pas le module d'export ? » appelle des testeurs qui ont déjà un usage régulier de ce type d'outil. Le même produit, deux cibles différentes.

Un persona marketing ne suffit pas pour cela. « Marie, 34 ans, responsable marketing dans une PME, dynamique et connectée » décrit une personne à qui l'on vend. Un profil de testeur décrit une personne qui doit vivre la situation du scénario : ce qu'elle sait, ce qu'elle fait, avec quoi, et ce qu'elle n'a jamais fait.

## Les critères qui changent les résultats

Dans l'ordre de ce qui pèse le plus, d'après ce que l'on observe en relisant des réponses.

### 1. La situation ou le métier

C'est le critère décisif. Un outil de devis doit être testé par des gens qui font des devis. Un parcours patient, par des patients concernés. Une application de gestion de planning pour cabinets, par des personnes qui tiennent un planning de cabinet. Ce n'est pas une question de secteur au sens large mais de tâche vécue : ce que la personne fait déjà, régulièrement, avec ou sans outil.

La question à se poser : « Quelle tâche cette personne accomplit-elle aujourd'hui, que mon produit veut rendre plus simple ? » Si votre testeur n'accomplit pas cette tâche dans sa vie, il ne verra pas ce qui manque.

### 2. La fraîcheur

Le testeur ne doit pas connaître votre produit. Ni vos clients, ni vos collègues, ni les participants de votre dernière bêta. La première utilisation est irremplaçable : c'est le seul moment où quelqu'un lit vraiment vos libellés au lieu de les reconnaître.

Exception : quand la décision porte sur des utilisateurs existants (un module qu'ils n'utilisent pas, une fonctionnalité mal adoptée). Dans ce cas, la cible est précisément « nos clients qui ont le produit depuis plus de trois mois et n'ont jamais ouvert ce module ».

### 3. L'aisance numérique

Un même parcours est évident pour quelqu'un qui change d'outil tous les six mois et opaque pour quelqu'un qui n'a jamais quitté le logiciel installé en 2015. Si votre cible réelle mélange les deux, votre panel doit les mélanger aussi, dans des proportions décidées, pas au hasard.

Décrivez ce critère par des faits, pas par des adjectifs : « utilise au moins trois outils en ligne dans son travail », « n'a jamais utilisé d'outil de ce type », plutôt que « à l'aise » ou « débutant ».

### 4. L'équipement réel

Le téléphone, l'ordinateur, le navigateur, la connexion. Une application mobile testée uniquement sur des iPhone récents ne dit rien de l'expérience sur un Android d'entrée de gamme. Si vous avez des analytics, partez de la répartition réelle. Sinon, imposez au moins un appareil ancien et un petit écran dans le panel.

### 5. Le contexte d'usage

Où et quand la personne utilise le produit : au bureau sur deux écrans, dans un cabinet entre deux patients, dans un camion avant un chantier, dans les transports. Ce critère est rarement recrutable directement, mais il doit apparaître dans les scénarios : « vous avez cinq minutes entre deux rendez-vous ».

## Les critères qui ne servent à rien

- **L'âge et le genre**, sauf quand le produit s'adresse spécifiquement à une tranche d'âge ou quand la décision en dépend. Dans tous les autres cas, ils remplacent les vrais critères par une apparence de rigueur.
- **Le secteur au sens large.** « Travaille dans la santé » recouvre un chirurgien, une secrétaire médicale et un commercial en dispositifs médicaux. C'est la tâche qui compte, pas l'étiquette.
- **L'intérêt pour le produit.** Les gens qui se déclarent intéressés par votre catégorie sont plus indulgents et moins représentatifs. Vous ne cherchez pas des enthousiastes, vous cherchez des utilisateurs.
- **La capacité à donner un avis.** Un test utilisateur ne demande pas des avis mais des comportements. Quelqu'un qui « n'y connaît rien » et qui échoue sur votre onboarding vous apprend plus qu'un expert UX qui le commente.

## Écrire le profil de testeur

Un profil utile tient en quelques lignes et se lit comme une consigne de recrutement. Par exemple, pour un outil de facturation destiné aux indépendants :

> Indépendants et gérants de très petites structures (1 à 5 personnes) qui émettent eux-mêmes leurs factures, au moins cinq par mois. Aujourd'hui sur tableur, sur un outil concurrent ou à la main. N'ont jamais utilisé notre produit. Mélange : deux tiers à l'aise avec les outils en ligne, un tiers qui n'en utilise presque aucun. Au moins la moitié sur mobile, dont deux sur Android d'entrée de gamme.

Chaque phrase est vérifiable au recrutement : on peut poser la question et obtenir une réponse factuelle. « Aime la simplicité » ne l'est pas ; « fait ses factures sur tableur » l'est.

## Combien de profils, et combien par profil

Si votre cible contient plusieurs situations distinctes (celui qui configure l'outil et celui qui l'utilise au quotidien, le prescripteur et le patient), chaque situation est un profil, et chaque profil a besoin de trois ou quatre testeurs pour qu'une friction observée ne soit pas un cas isolé. Avec deux ou trois profils, on arrive naturellement à huit à douze testeurs, la taille de panel qui fonctionne pour un test qualitatif. Le raisonnement complet est dans [combien de testeurs pour un test utilisateur](/blog/combien-de-testeurs-test-utilisateur).

Si votre cible semble contenir six profils, c'est le signe que le test essaie de répondre à trop de questions. Revenez à la décision et gardez les deux profils qui la concernent le plus.

## Vérifier le profil pendant le recrutement, pas après

Le meilleur profil ne sert à rien si le recrutement ne le respecte pas. Deux pratiques simples :

- **Des questions de qualification factuelles** avant d'accepter un testeur : « Combien de factures émettez-vous par mois ? Avec quel outil ? Sur quel téléphone répondrez-vous ? » Pas de question à laquelle on peut répondre « oui » pour être sélectionné.
- **Un tableau du panel** avant le lancement, avec chaque testeur et ses critères, pour voir d'un coup d'œil si les proportions décidées sont respectées. Si le panel ne ressemble pas au profil, on ne lance pas.

C'est ce travail de sélection, un par un, qui prend le plus de temps dans un test utilisateur et qui en fait la valeur. Quand vous passez par un service qui recrute pour vous, exigez de voir ce tableau avant le lancement, sans noms mais avec les critères. Ce que nous recrutons, et comment, est décrit sur la page [entreprises](/entreprises).
