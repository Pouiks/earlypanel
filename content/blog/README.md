# Blog earlypanel : format des articles

Un article = un fichier `content/blog/<slug>.md`. Le slug est le nom du fichier, en minuscules, chiffres et tirets (`tester-maquette-figma-preparer-prototype.md`). Il devient l'URL `/blog/<slug>` et ne doit plus changer une fois publié.

## En-tête (frontmatter)

```markdown
---
title: "Titre de l'article (65 caractères max, mot-clé principal en tête)"
description: "Méta-description : la promesse en une phrase, 150 caractères max."
date: 2026-09-15
updated: 2026-10-01
tags: [test utilisateur, onboarding]
draft: false
cover: /blog/mon-slug/cover.webp
cover_alt: "Ce que montre l'image, en une phrase."
---
```

- `audience` : `entreprise` (défaut, publié sous `/blog/<slug>`) ou `testeur` (publié sous `/testeurs/guides/<slug>`, navigation et appel à l'action testeurs). Les deux univers ne se mélangent jamais : un guide testeur n'apparaît pas dans le blog entreprise, ni dans son flux RSS.
- `title`, `description`, `date` sont obligatoires.
- `updated` : optionnel, uniquement pour une vraie mise à jour de fond.
- `tags` : 1 à 3, en minuscules. Le premier s'affiche sous le titre.
- `draft: true` : l'URL existe (noindex) pour relire en ligne, mais l'article n'apparaît ni dans la liste, ni dans le sitemap, ni dans le RSS.
- `cover` : optionnel. Chemin public absolu sous `/blog/`, le fichier vit dans `public/blog/<slug>/`. `cover_alt` devient obligatoire.

## Images

- Dossier : `public/blog/<slug>/`. Formats : `webp` de préférence, sinon `png` ou `jpg`.
- Couverture : 1600 × 900 px (16:9), 200 Ko max.
- Images dans le corps : 1400 px de large max, 200 Ko max chacune, jamais de texte illisible sur mobile.
- Syntaxe dans le corps, avec légende optionnelle entre guillemets :

```markdown
![Texte alternatif décrivant l'image](/blog/mon-slug/schema-scenario.webp "Légende affichée sous l'image")
```

- Pas de captures de produits clients, pas de visages sans accord, pas d'images générées avec du faux texte.

## Corps

- Markdown standard : `##` pour les sections (elles alimentent le sommaire automatique), `###` pour les sous-parties, listes, gras, liens. Pas de HTML.
- Pas de `#` de niveau 1 : le titre vient du frontmatter.
- Longueur utile : 900 à 1 500 mots. Au-delà, couper en deux articles qui se lient.
- Liens internes en chemin relatif : `/entreprises`, `/test-maquette-figma`, `/test-pre-lancement-staging`, `/test-conversion-funnel`, `/agences`, `/blog/<autre-slug>`. Côté testeur : `/testeurs`, `/testeurs#register`, `/securite`, `/testeurs/guides/<autre-slug>`.
- Le bouton « Réserver un appel » et les articles suivants sont ajoutés automatiquement en fin d'article : ne pas les écrire dans le corps.
- Les termes du glossaire (`src/data/glossaire.ts`) sont reconnus automatiquement : la première occurrence de chaque terme dans l'article devient un lien vers `/glossaire` avec sa définition en infobulle. Écrire les mots normalement (« panel », « scénario », « staging »), sans les mettre en lien soi-même. Un mot technique qui n'a pas de définition : l'ajouter au glossaire avec ses `aliases`, pas dans l'article.

## Deux sections spéciales, fortement recommandées

- `## En bref` en tête d'article : 3 à 5 puces qui répondent directement à la question du titre. Elles sont retirées du corps et affichées dans un encart en haut de page, et reprises telles quelles dans `/llms-full.txt`. C'est ce que les moteurs génératifs citent en priorité.
- `## Questions fréquentes` en fin d'article : 3 à 5 questions en `###`, chacune suivie d'une réponse courte (2 à 4 phrases, autoportante). Elles restent dans le corps et sont balisées FAQPage automatiquement.

## Règles de fond

- Aucun chiffre inventé, aucune étude citée sans source vérifiable, aucun client nommé sans accord écrit.
- Le stade produit se dit « avant lancement », jamais « pré-lancement ».
- Une seule ligne de prix sur tout le site : ne jamais écrire de tarif en dur. Écrire `{{PRICE_RANGE_LABEL}}` (remplacé au build par la fourchette officielle) et `{{BOOKING_DURATION_MIN}}` pour la durée de l'appel.
- Écrire pour une équipe produit ou une direction qui décide, pas pour un designer entre pairs : concret, décisionnel, sans jargon.

## Brief à coller dans Claude pour rédiger un article

> Rédige un article de blog en français pour earlypanel, service de tests utilisateurs à distance clés en main pour équipes produit, startups et agences (recrutement de testeurs à la main, questionnaire co-construit, relecture humaine de chaque réponse, NDA, rapport rédigé en 5 jours).
> Cible : responsable produit, fondateur ou directeur d'agence qui hésite à lancer un test utilisateur.
> Mot-clé principal : « … ». Mots-clés secondaires : « … », « … ».
> Contraintes : 1 000 à 1 400 mots ; un titre de 65 caractères max avec le mot-clé principal ; une méta-description de 150 caractères max ; des sections `##` qui répondent chacune à une question que la cible se pose ; des exemples concrets ; aucun chiffre ni étude inventés ; aucun client nommé ; pas de prix ; dire « avant lancement » et jamais « pré-lancement » ; proposer 2 liens internes parmi /entreprises, /test-maquette-figma, /test-pre-lancement-staging, /test-conversion-funnel, /agences ; terminer par une conclusion courte sans appel à l'action commercial (il est ajouté automatiquement).
> Livre le résultat au format Markdown avec l'en-tête frontmatter suivant, rempli : title, description, date (aujourd'hui), tags (1 à 3), draft: false.
