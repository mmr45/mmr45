# Fiche de livraison — thèmes et langues

## Ce que tu vas voir

### 1. Vingt-quatre nouvelles ambiances

Le profil passe de 12 choix à **36 choix, mode Auto compris**. Les nouveaux thèmes sont Aurore boréale, Volcan, Abysses, Glacier, Désert, Terracotta, Cuivre, Cobalt, Émeraude, Rubis, Améthyste, Menthe, Citron, Café crème, Papier & encre, Graphite, Arcade rétro, Synthwave, Rose poudré, Lagon, Prune, Cosmos, Ardoise et Contraste net.

Dans le README, ouvre **« Explorer les 36 ambiances »**. La galerie permet de chercher par nom, filtrer les collections et comparer le clair et le sombre. Cliquer une vignette affiche un aperçu ; le bouton **« Activer… pour tous »** change réellement les couleurs du profil partagé. Le menu du README contient aussi des liens directs vers les nouveaux thèmes.

Les animations déjà présentes sont conservées. Les nouvelles palettes recolorent les cartes existantes : pas de centaines de copies d’images ni de fonction Vercel supplémentaire. L’image PNG de partage social utilise le visuel Chantier pour ces nouvelles palettes ; les SVG du profil prennent bien leurs couleurs.

### 2. Un menu de langues défilant

Tout en haut du README, le bouton **« Lire dans ta langue / Read in your language »** ouvre la page Langues.

Tu peux rechercher une langue avec son nom français, anglais, son nom natif ou son code. Le catalogue contient **190 langues et variantes**. Le lien vers Google donne également accès à son propre sélecteur de langues.

Le bouton de lecture ouvre une **traduction automatique par Google** de la version textuelle du profil. Le français original reste disponible sans traduction ; le README visuel anglais conserve son lien séparé.

**La limite importante :** GitHub n’autorise pas une application interactive complète dans un README. Le menu défilant s’ouvre donc dans une page liée. Le texte dessiné dans les images SVG ne devient pas automatiquement arabe, japonais ou espagnol. La page lisible reprend la présentation, les projets, la stack, le parcours et les explications des cartes sous forme de vrai texte traduisible. Elle ne reproduit pas les compteurs dynamiques en temps réel.

### 3. Les deux améliorations de la livraison précédente

- **PR #32 :** un atelier pour la fresque, avec sélection de case, couleur avant peinture, recherche d’une case libre, replay des touches visibles et partage d’une case. La carte animée reste dans le README.
- **PR #33 :** tableau de bord avec périodes 7/30/90 jours, export CSV, réactions, mode Auto et message visible en cas de panne.

Cette fiche accompagne l’enrichissement de la PR #32. Ces changements deviennent publics après ta fusion ; les aperçus Vercel permettent de les voir avant.

## Comment vérifier en deux minutes

1. Ouvre la galerie des thèmes dans l’aperçu Vercel de la PR #32. Cherche « Cosmos », puis bascule Clair/Sombre. Tant que tu ne cliques pas sur Activer, tu ne changes pas le thème collectif.
2. Ouvre la page Langues du même aperçu. Cherche « العربية », « japonais » ou « English ». Choisis une langue, puis clique sur Lire : le lien indique Google Traduction.
3. Ouvre le README de la branche de la PR #32 pour voir les nouveaux boutons et les liens de thèmes. Avant la fusion, ses liens absolus vers le site principal peuvent encore ouvrir l’ancienne production : utilise l’aperçu pour tester les nouvelles pages.
4. Pour le tableau de bord, utilise l’aperçu de la PR #33. Les deux PR restent soumises à ta validation.

## Vérifications et limites

Les tests contrôlent le catalogue, les contrastes des nouvelles palettes, la recoloration des SVG, les codes de langues, les liens de traduction et les fonctions du tableau de bord. Les contrôles visuels servent à vérifier la recherche, les filtres, le défilement, les aperçus et l’absence de débordement sur mobile.

La traduction dépend de Google, de la langue et de la région. Elle n’est pas une traduction humaine relue dans 190 langues. Le cache des images de GitHub peut retarder les couleurs. Aucune migration vers Supabase, aucun abonnement et aucune fusion automatique n’ont été ajoutés.

## Format pour les prochaines livraisons

Chaque livraison se terminera avec : **ce qui change**, **où cliquer pour le voir**, **comment tester**, **ce qui reste limité** et **ce que tu dois valider**. Une fiche du même type restera dans le dépôt.
