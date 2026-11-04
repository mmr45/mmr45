# Profil GitHub d'Osman (mmr45/mmr45)

Ce dépôt est le profil GitHub d'Osman : peintre en bâtiment, développeur, fondateur de Bâtipro et MyWattUp. Le README s'affiche sur github.com/mmr45. Tout est en français, sauf la version anglaise générée automatiquement.

## Règles absolues

- **Jamais le nom de famille d'Osman**, nulle part : texte, URL, alt d'image, commit, nom de fichier. Ne le cite pas non plus dans une PR ou un commentaire. Seule exception, autorisée par Osman : l'adresse de son profil LinkedIn dans le bouton de contact.
- **Aucune info perso critique** : pas d'e-mail, de téléphone, d'adresse ni de lieu de formation précis. Les seuls contacts publics sont TikTok, X, Discord et LinkedIn.
- Avant chaque PR, cherche « mail » et le nom de famille dans tout le dépôt (hors bouton LinkedIn).
- L'ancien nom de famille reste dans de vieux commits. Pour le purger, il faut réécrire l'historique et forcer un push : **seulement avec l'accord explicite d'Osman.**
- Aucun secret dans le dépôt. Les jetons vivent dans les variables d'environnement de Vercel.
- Tout passe par une PR. Osman fusionne lui-même, souvent en quelques minutes : ne pousse jamais sur une branche peut-être déjà fusionnée. Pour une retouche après une fusion, ouvre une nouvelle branche depuis `main`.

## Architecture

```
README.md          version française (source)
README.en.md       généré par .github/scripts/readme_en.py, ne pas éditer à la main
assets/            images statiques (captures des projets dans assets/captures/)
serveur/           projet Vercel « mmr45-profil » → https://mmr45-profil.vercel.app
  api/             fonctions (11 sur 12 max du plan Hobby : n'en ajoute pas, passe par img.js)
  lib/             rendu SVG, thèmes, stockage, traduction
  themes/<id>/     images pré-générées par thème (+ en/ pour l'anglais), servies par /img
  vercel.json      réécritures d'URL (/img/:n, /theme/:t, /mur.svg, /peindre/:c, …)
.github/scripts/   générateurs Python
.github/workflows/ Actions planifiées
```

### Images

- `profil.py` dessine toutes les images statiques (hero, titres, projets, parcours, archi, pied, réactions…) pour chaque thème, en clair et en sombre, et en français et en anglais. Il écrit `serveur/themes/<id>/[en/]`. Relance-le après toute modification du design ou de `serveur/lib/themes.json`.
- Les cartes projet contiennent des marqueurs `__CAPTURE:<fichier>__`. `api/img.js` les remplace à la volée par les captures de `serveur/themes/captures/`.
- `/img/<nom>.svg?mode=dark|light&lang=en` lit le thème actif et renvoie le fichier du bon thème. `stats` et `ville` (ville 3D) sont dessinées en direct par `lib/gh-cartes.js`.
- Les cartes dynamiques (`/terminal.svg`, `/vues.svg`, `/live.svg`, `/reactions.svg`, `/mur.svg`, `/theme-actuel.svg`) sont redessinées à chaque affichage.
- La version anglaise des cartes dynamiques passe par `avecLangue(lang, rendu)` et `traduitSvg` dans `lib/langue.js`. Pour traduire un nouveau texte français, ajoute-le dans `EXACT` ou `REGLES`.

### Données et stockage

- **Redis (Upstash, offre gratuite via le Marketplace Vercel)** stocke le thème choisi, le mur, les visites, les réactions et l'historique « en direct » (`lib/store.js`, variables `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Clés `mmr45:<nom>`.
- **Vercel Blob n'est plus utilisé** : son quota gratuit d'opérations a été dépassé le 2026-11-04 (fresque de 144 cases + relectures du thème) et le store a été suspendu, ce qui a figé tout le profil. Le code garde Blob en secours seulement si Redis n'est pas configuré.
- Chaque image du README déclenche une requête : garde les lectures en mémoire (memo de quelques secondes, une seule lecture partagée par instance) et compte le coût avant d'ajouter des dizaines d'images dynamiques.
- Le thème est **le même pour tout le monde** : un clic sur `/theme/<id>` le change pour tous les visiteurs. Le thème `auto` suit l'heure de Paris et la saison (`lib/theme.js` → `themeAuto`).
- Les vraies stats GitHub sont calculées chaque nuit par `activite.py` et publiées dans `donnees.json`, sur la branche `stats`. Vercel les lit sans jeton.

### Actions

| Workflow | Quand | Rôle |
|---|---|---|
| `activite.yml` | chaque nuit, ou au push du script | `donnees.json` et carte activité sur la branche `stats` |
| `captures.yml` | lundi, à la main, ou au push du script | captures Playwright de Bâtipro et MyWattUp, puis `profil.py`, puis commit |
| `live.yml` | toutes les 30 min | mesure des deux SaaS, branche `live` |
| `snake.yml` | chaque nuit | animation snake (sortie sur la branche `output`) |

Les builds Vercel de preview échouent sur les branches `output` et `stats` : c'est normal et sans conséquence.

## Pièges connus (déjà rencontrés)

1. **Le cache de camo.** GitHub fait passer toutes les images par son proxy camo, dont les caches sont **régionaux**. Un test depuis les États-Unis ne prouve donc pas ce qu'on voit en France.
   - Pour vider le cache d'une image, **change son adresse** : ajoute `&v=N` ou incrémente-le. Le README est actuellement en `v=4`, sauf stats et ville en `v=5`.
   - Camo suit les redirections et garde la cible en cache pendant un an. **`/img` ne doit jamais rediriger** : en cas d'erreur, il renvoie un 503 non mis en cache.
   - Les cartes dynamiques envoient `Cache-Control: no-cache, no-store, must-revalidate, max-age=0`. Le cache CDN de Vercel se règle à part, avec `Vercel-CDN-Cache-Control`.
2. **GitHub entoure toute image d'un lien vers l'image.** Une image cliquable doit avoir son propre `<a href>`. Dans un `<summary>`, utilise du texte plutôt qu'une image, sinon le menu déroulant ne s'ouvre plus.
3. **Les liens relatifs sont cassés sur github.com/mmr45.** Utilise toujours des URL absolues, par exemple `https://github.com/mmr45/mmr45/blob/main/README.en.md`.
4. **Le crayon d'édition de GitHub**, visible par Osman en haut à droite du README, recouvre ce qui est placé à cet endroit. Ne mets rien de cliquable en haut à droite. Le choix de langue est en boutons centrés.
5. **Dans un `srcset`, la virgule sépare les candidats.** Une virgule dans une URL doit être écrite `%2C`, par exemple pour skillicons.
6. **Le plan Hobby de Vercel est limité à 12 fonctions.**
7. Un nouveau déploiement Vercel prend environ 30 s après la fusion. Une image vue pendant ce temps peut apparaître cassée : recharge avant de chercher un bug.

## Vérifier ce que voient vraiment les visiteurs

```bash
# HTML rendu du README, avec les vraies URL camo
gh api repos/mmr45/mmr45/readme -H "Accept: application/vnd.github.html" > r.html
grep -o 'https://camo[^" ]*' r.html | sort -u | while read u; do
  curl -s -o /dev/null -w "%{http_code} %{size_download}\n" "$u"; done
# version anglaise
gh api repos/mmr45/mmr45/contents/README.en.md -H "Accept: application/vnd.github.html"
```

Avant de dire qu'une image est corrigée, ouvre le SVG servi par camo dans un vrai navigateur (Playwright) et regarde-le.

## Modifier le README

1. Modifie `README.md`.
2. Ajoute toute nouvelle phrase française à la table `TEXTES` de `.github/scripts/readme_en.py`, puis lance `python3 .github/scripts/readme_en.py`. Le script signale les textes absents et les accents restés en anglais.
3. Si le design change, lance `python3 .github/scripts/profil.py`.
4. Vérifie la règle « jamais le nom de famille », puis ouvre une PR.

## Goûts d'Osman

- Il veut un profil « full animé » qui pousse GitHub à ses limites : les animations bouclent, et les cartes affichent des données en direct.
- Il préfère des liens et boutons visibles, et des réponses courtes en français.
- Il juge sur ce qu'il voit sur github.com depuis la France. Quand il dit que quelque chose ne marche pas, vérifie le rendu réel avant de soupçonner son navigateur.


## Évolutions proposées par Codex — 4 novembre 2026

- PR #32 : README avec raccourcis visibles, une seule carte animée pour la fresque, liens absolus des thèmes et atelier enrichi dans `serveur/fresque.html`. Le replay reconstitue les dernières touches visibles de la couche, pas l’historique des couleurs recouvertes. La sélection et le choix d’une couleur ne modifient pas le mur ; le bouton « Peindre » utilise l’endpoint existant.
- Tableau de bord : filtres 7/30/90 jours, CSV des agrégats quotidiens, réactions, mode Auto dans la liste des thèmes, application des couleurs sans recharger la page, états de panne et pause de l’actualisation quand l’onglet est masqué.
- `serveur/dashboard-metrics.js` calcule les séries de jours de Paris et l’export. Les jours précédant le début du suivi sont `null`, exportés sans valeur, jamais présentés comme de vrais zéros.
- Tests sans dépendance : `node --test serveur/tests/*.test.js`. Les tests couvrent les changements d’heure, les jours sans suivi, le CSV et la réponse publique de `/api/stats` (Auto, palettes et absence des limites par IP).
- Vérification visuelle locale avec des données de démonstration et les écritures bloquées. Aucune migration de stockage ; Redis/Upstash reste utilisé. Aucun ajout de fonction Vercel.
- Pistes de suite : `docs/EVOLUTIONS.md` dans la PR #32. Priorité technique avant un afflux de visiteurs : rendre atomiques les lectures/modifications/écritures Redis, qui peuvent actuellement perdre des mises à jour concurrentes.
