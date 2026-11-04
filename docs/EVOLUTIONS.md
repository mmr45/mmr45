# Profil GitHub : pousser l’expérience plus loin

## Livré dans cette proposition

- Le README conserve la ville 3D, le rouleau de contributions, les succès, les thèmes et les cartes animées. La fresque utilise le rendu animé existant dans une seule image plutôt que 144 images indépendantes. Le clic ouvre l’atelier complet.
- L’atelier propose la sélection de case au clavier, le choix de couleur avant validation, une case libre au hasard, la répartition des couleurs, le partage d’une case et le replay des touches encore visibles. Aucune écriture ne part avant le clic sur « Peindre ».
- Le tableau de bord fait l’objet d’une PR distincte : périodes 7/30/90 jours, export des agrégats quotidiens, réactions, thème Auto et messages d’erreur explicites.

## Architecture constatée

Le profil `mmr45/mmr45` utilise Vercel pour les pages et les cartes SVG, et Redis/Upstash pour les compteurs et l’état partagé. Le code conserve Vercel Blob en secours. Aucune migration Supabase n’apparaît dans ce dépôt. Supabase appartient aux SaaS présentés, pas au stockage actuel du profil.

Les branches `stats`, `live` et `output` sont des sorties des Actions GitHub. Les derniers déploiements de `live` et `output` sont en erreur, tandis que la production issue de `main` est prête. Ces erreurs ne prouvent pas une panne du profil.

## Prochaines améliorations proposées

| Priorité | Idée | Expérience et prérequis |
| --- | --- | --- |
| 1 | Voyage dans la ville de contributions | Dans une page dédiée, parcourir les semaines, survoler les tours et rejouer l’année. Le README conserve un SVG animé cliquable. Réutiliser les données publiques de la branche `stats`. |
| 2 | Galerie des couches du mur | Archiver chaque couche terminée puis permettre de la revoir et la partager. Il faut d’abord conserver les couches et les touches recouvertes ; l’état actuel ne contient que la couche visible. |
| 3 | Le chantier de la semaine | Montrer une vraie amélioration livrée, son avant/après et sa PR. Utiliser les PR publiques et distinguer les idées des fonctionnalités publiées. Ne rien extraire des dépôts privés sans choix explicite. |
| 4 | Défi collectif de couleurs | Une composition cible à compléter ensemble, progression et célébration animée. D’abord rendre les écritures concurrentes atomiques, puis conserver les limites d’usage. Aucun faux participant ni compteur simulé. |
| 5 | Mode exposition | Une page grand écran qui alterne la ville, le mur et les projets, avec pause et réduction des animations. Réutiliser les rendus et données existants plutôt que multiplier les fonctions serveur. |

## Avant une augmentation du trafic

- Le remplacement des 144 images réduit le nombre d’URL de fresque demandées par le README, sans supprimer les cases ni l’interaction dans l’atelier.
- Les mises à jour Redis actuelles font une lecture puis une réécriture du document : deux visiteurs simultanés peuvent écraser leurs changements. Corriger avec une opération atomique avant de lancer un défi public à grande échelle.
- Les visites sont des chargements d’image, pas des personnes uniques. Le proxy d’images de GitHub influence leur fraîcheur. Les graphiques doivent conserver cette distinction.
- Garder la publication par PR. Pas de nouveau stockage, de dépense, de migration ni de déploiement de production direct dans cette proposition.
