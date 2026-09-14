---
title: "Comment définir la cible d'un test utilisateur (et recruter les bons testeurs)"
description: "Définir sa cible avant un test utilisateur : les critères qui comptent vraiment, ceux qui ne servent à rien, et comment écrire un profil de testeur qu'on peut recruter."
date: 2026-09-11
tags: [panel, méthode]
draft: false
---

Comment définir qui est ma cible ? C'est la question qui décide de la valeur d'un test utilisateur avant même qu'il commence. Des scénarios parfaits, lus par les mauvaises personnes, produisent des conclusions fausses avec une grande assurance. Cet article donne une méthode pour passer de « nos utilisateurs » à un profil de testeur précis et recrutable, en s'appuyant sur ce que recommandent les références du métier et sur la façon dont earlypanel compose un panel.

## En bref

- Définissez la décision que le test doit éclairer avant de décrire la cible : le même produit appelle des cibles différentes selon la question.
- Recrutez sur des comportements vérifiables, pas sur des adjectifs : ce que la personne fait déjà, avec quels outils, sur quel équipement, et si elle connaît le produit.
- Les critères démographiques servent à trier un panel, rarement à choisir un testeur.
- Un profil de testeur utile tient en quelques lignes, et chaque ligne correspond à une information qu'on peut demander.
- Sur un panel de cette taille, on exclut seulement l'impossible et on classe le reste. Le choix final se fait à la main.

## Commencer par la décision, pas par le persona

Avant de décrire une cible, écrivez la décision que le test doit éclairer. « Faut-il simplifier l'inscription ? » appelle des testeurs qui n'ont jamais eu de compte. « Pourquoi les clients n'utilisent-ils pas le module d'export ? » appelle des testeurs qui ont déjà un usage régulier de ce type d'outil. Le même produit, deux cibles différentes.

Un persona marketing ne suffit pas pour cela. « Marie, 34 ans, responsable marketing dans une PME, dynamique et connectée » décrit une personne à qui l'on vend. Un profil de testeur décrit une personne qui doit vivre la situation du scénario : ce qu'elle fait, avec quoi, et ce qu'elle n'a jamais fait.

## Recruter sur des comportements, pas sur des adjectifs

Le Nielsen Norman Group, qui recrute des participants pour ses propres études depuis les années 1990, résume la règle dans son guide de recrutement : les participants doivent être représentatifs des utilisateurs visés, et le filtrage se fait sur des comportements, comme les outils que la personne utilise ou son niveau d'expérience, pas seulement sur des cases démographiques. Le guide insiste aussi sur les biais du recrutement lui-même : qui répond à une annonce, qui accepte d'être payé pour tester, qui a le temps.

Concrètement, les critères qui décrivent un comportement sont ceux qu'on peut demander et obtenir sous forme de fait :

- **La tâche ou le métier.** Un outil de devis doit être testé par des gens qui font des devis. Ce n'est pas une question de secteur au sens large mais de tâche vécue : ce que la personne fait déjà, régulièrement, avec ou sans outil.
- **La connaissance du produit.** Pour un parcours de découverte, il faut des personnes qui ne l'ont jamais vu. Pour un module mal adopté, il faut au contraire des clients qui ont le produit et n'ouvrent pas ce module.
- **Les outils utilisés.** Ce que la personne ouvre tous les jours dit plus sur son aisance que n'importe quel adjectif. « Utilise Microsoft 365 et Pennylane » se demande et se vérifie. « À l'aise avec le numérique » non.
- **L'équipement réel.** Le téléphone, l'ordinateur, le navigateur, la connexion. Une application mobile testée uniquement sur des iPhone récents ne dit rien de l'expérience sur un Android d'entrée de gamme.
- **L'expérience des tests.** Quelqu'un qui n'a jamais participé à un test utilisateur réagit autrement qu'un habitué. Ce n'est pas un critère d'exclusion, c'est une information à connaître pour composer le panel.

## Ce que valent les critères démographiques

L'âge, le genre, la localisation ou le secteur au sens large sont faciles à demander, et c'est leur principal défaut : ils donnent une apparence de rigueur sans garantir que la personne vit la situation du scénario. « Travaille dans la santé » recouvre un chirurgien, une secrétaire médicale et un commercial en dispositifs médicaux.

Ils ont pourtant un usage : trier. Quand le produit s'adresse à une tranche d'âge précise, ou que la décision dépend d'un territoire, ces critères délimitent le panel. Ils ne remplacent pas les critères de comportement, ils les précèdent.

## Comment earlypanel compose un panel

Chaque testeur du panel renseigne son profil avant toute mission : métier, secteur, taille d'entreprise, outils du quotidien, appareils, navigateurs, système mobile, type de connexion, disponibilité, centres d'intérêt, et s'il a déjà participé à des tests utilisateurs, avec trois réponses possibles : jamais, quelquefois, régulièrement. Le compte n'est activé que lorsque le profil est complet.

Pour chaque projet, la cible du client est décrite avec ces mêmes critères, plus les critères démographiques classiques. Chaque critère est « souhaité » par défaut et note les profils. Il devient « obligatoire » s'il ne peut souffrir d'exception, et dans ce cas il exclut. Le principe, avec un panel de cette taille, est d'écarter seulement l'impossible et de classer le reste. La sélection finale se fait à la main, profil par profil, et le rapport présente la composition du panel retenu.

Les réponses sont ensuite relues une par une. Une participation n'entre dans le rapport que si elle a été validée : soumise, notée par le staff, et non bâclée. Ce qui est refusé n'est ni payé ni compté. Ce fonctionnement est décrit sur la page [entreprises](/entreprises).

## Écrire le profil de testeur

Un profil utile tient en quelques lignes et se lit comme une consigne de recrutement. Par exemple, pour un outil de facturation destiné aux indépendants :

> Indépendants et gérants de très petites structures, une à cinq personnes, qui émettent eux-mêmes leurs factures. Aujourd'hui sur un outil bureautique, sur un logiciel de facturation concurrent ou à la main. N'ont jamais utilisé notre produit. Au moins la moitié sur mobile, avec des appareils Android et iOS.

Chaque phrase correspond à une information du profil ou à une question qu'on peut poser : la taille de la structure, le métier, les outils utilisés, les appareils. « Aime la simplicité » ne correspond à rien qu'on puisse demander.

## Combien de profils, et combien par profil

Si votre cible contient plusieurs situations distinctes, celui qui configure l'outil et celui qui l'utilise au quotidien, le prescripteur et le patient, chaque situation est un profil. Chez earlypanel, un test sur maquette réunit cinq à dix testeurs et un test avant lancement dix à vingt, avec un petit groupe par rôle utilisateur quand le produit en compte plusieurs.

Le nombre par profil se justifie par la recherche sur les tailles d'échantillon : Laura Faulkner a montré en 2003, sur soixante participants, que des groupes de cinq tirés au hasard trouvaient entre 55 % et 99 % des problèmes selon les personnes tombées dans le groupe, alors qu'avec dix participants aucun groupe ne descendait sous 80 %. Le raisonnement complet est dans [combien de testeurs pour un test utilisateur](/blog/combien-de-testeurs-test-utilisateur).

Si votre cible semble contenir six profils, c'est le signe que le test essaie de répondre à trop de questions. Revenez à la décision et gardez les deux profils qui la concernent le plus.

## Sources

- Nielsen Norman Group, « How to Recruit Participants for Usability Studies », rapport gratuit : [media.nngroup.com](https://media.nngroup.com/media/reports/free/How_To_Recruit_Participants_for_Usability_Studies.pdf)
- Laura Faulkner, « Beyond the five-user assumption: Benefits of increased sample sizes in usability testing », Behavior Research Methods, Instruments, & Computers, 2003 : [link.springer.com](https://link.springer.com/article/10.3758/BF03195514)
- Le fonctionnement du profil testeur et de la sélection décrit ici est celui d'earlypanel au moment de la publication.

## Questions fréquentes

### Comment définir la cible d'un test utilisateur ?

En partant de la décision que le test doit éclairer, puis en décrivant des comportements vérifiables : la tâche que les participants vivent déjà, leur connaissance du produit, les outils qu'ils utilisent, leur équipement réel. Le persona marketing ne suffit pas.

### Faut-il tester avec ses propres clients ?

Seulement quand la décision porte sur des utilisateurs existants, par exemple un module qu'ils n'utilisent pas. Pour un parcours de découverte, il faut des personnes qui n'ont jamais vu le produit.

### Les critères démographiques sont-ils inutiles ?

Non, mais ils servent à trier, pas à choisir. L'âge, le genre ou le secteur au sens large délimitent un panel quand la décision en dépend. Ils ne garantissent pas que la personne vit la situation du scénario.

### Comment earlypanel choisit-il les testeurs d'une mission ?

À partir du profil complet de chaque testeur et des critères du projet. Les critères obligatoires excluent, les critères souhaités classent, et la sélection finale se fait à la main. Seules les participations validées après relecture entrent dans le rapport.
