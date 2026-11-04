"""Écrit README.en.md (version anglaise du profil) à partir de README.md.

Les images servies par Vercel reçoivent &lang=en (textes dessinés en anglais) ; les textes
du README sont traduits ci-dessous. Relancer après chaque modification de README.md :
    python3 .github/scripts/readme_en.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

TEXTES = [
    ('Découvrir Bâtipro', 'Discover Bâtipro'), ('Tester MyWattUp', 'Try MyWattUp'),
    ('Explorer le tableau de bord', 'Explore the dashboard'), ('Peindre la fresque', 'Paint the mural'),
    ('Fresque collective animée : 144 cases, une seule image. Ouvre la fresque pour choisir une case et la peindre.',
     'Animated community mural: 144 squares in one image. Open the mural to choose a square and paint it.'),

    ('<p align="center"><a href="https://github.com/mmr45"><img src="https://img.shields.io/badge/Fran%C3%A7ais-%E2%9C%93-E8B04B?style=for-the-badge" alt="Français (langue actuelle)" /></a> <a href="https://github.com/mmr45/mmr45/blob/main/README.en.md"><img src="https://img.shields.io/badge/English-version-2F81F7?style=for-the-badge" alt="English version" /></a></p>',
     '<p align="center"><a href="https://github.com/mmr45"><img src="https://img.shields.io/badge/Version-fran%C3%A7aise-2F81F7?style=for-the-badge" alt="Version française" /></a> <a href="https://github.com/mmr45/mmr45/blob/main/README.en.md"><img src="https://img.shields.io/badge/English-%E2%9C%93-E8B04B?style=for-the-badge" alt="English (current language)" /></a></p>'),
    ("Osman — peintre en bâtiment, développeur et fondateur de deux SaaS en production. Du chantier au code.",
     "Osman — building painter, developer and founder of two SaaS in production. From the site to the code."),
    ("Terminal en direct : heure de Paris et ping réel de Bâtipro et MyWattUp à chaque affichage",
     "Live terminal: Paris time and a real ping of Bâtipro and MyWattUp on every view"),
    ("Visites du profil en direct : ton numéro de visite, les 30 derniers jours et les dernières visites. Clique pour le tableau de bord complet.",
     "Live profile visits: your visitor number, the last 30 days and the latest visits. Click for the full dashboard."),
    ("Thème actuel du profil.", "Current profile theme."),
    ("<b>🎨 Changer le thème du profil</b> : clique ici pour ouvrir le menu (12 thèmes, dont un automatique)",
     "<b>🎨 Change the profile theme</b>: click here to open the menu (12 themes, including an automatic one)"),
    ("Thème automatique : suit l'heure et la saison", "Automatic theme: follows the time and season"),
    ('alt="Thème ', 'alt="Theme '),
    ('Theme Néon"', 'Theme Neon"'), ('Theme Océan"', 'Theme Ocean"'), ('Theme Forêt"', 'Theme Forest"'),
    ('Theme Coucher de soleil"', 'Theme Sunset"'), ('Theme Or &amp; noir"', 'Theme Gold &amp; black"'), ('Theme Lavande"', 'Theme Lavender"'),
    ("Un clic change les couleurs de tout le profil, pour tout le monde. « Auto » suit l'heure et la saison : printemps sakura, été océan, automne forêt, hiver nord, coucher de soleil le soir et néon la nuit. Recharge la page pour voir le résultat.",
     "One click changes the colours of the whole profile, for everyone. “Auto” follows the time and season: sakura in spring, ocean in summer, forest in autumn, nord in winter, sunset in the evening and neon at night. Reload the page to see the result."),
    ("Ce que j'ai mis en ligne", "What I've shipped"),
    ("Bâtipro — créer son entreprise du bâtiment sans se noyer dans la paperasse : test de qualification, statut juridique, dossier INPI, devis BTP en PDF.",
     "Bâtipro — start a construction business without drowning in paperwork: eligibility test, legal status, company filing, compliant quotes as PDF."),
    ("MyWattUp — le coach qui croise sommeil, sport et alimentation : score d'énergie, repas adaptés, scanner de produits.",
     "MyWattUp — the coach that blends sleep, training and food: energy score, tailored meals, product scanner."),
    ("En direct : disponibilité et temps de réponse de Bâtipro et MyWattUp, mesurés toutes les 30 minutes, avec l'heure de Paris en direct",
     "Live: uptime and response time of Bâtipro and MyWattUp, with the live Paris time"),
    ("Comment je construis", "How I build"),
    ("Architecture : interface JavaScript/TypeScript, hébergement Vercel, backend Supabase, paiements Stripe et IA ; chaque git push part en production.",
     "Architecture: JavaScript/TypeScript front end, Vercel hosting, Supabase back end, Stripe payments and AI; every git push goes to production."),
    ("D'où je viens", "Where I come from"),
    ("Parcours : apprenti peintre en alternance de 2024 à 2026, CAP Peinture avec mention en 2026, Bâtipro en ligne en juillet 2026, MyWattUp en ligne en septembre 2026.",
     "Path: apprentice painter in work-study 2024–2026, painting diploma with honours in 2026, Bâtipro live in July 2026, MyWattUp live in September 2026."),
    ('alt="Activité"', 'alt="Activity"'),
    ("Mes stats GitHub sur 12 mois : contributions, commits, pull requests, jours actifs, série de jours et langages, aux couleurs du thème",
     "My GitHub stats over 12 months: contributions, commits, pull requests, active days, streak and languages, in the theme's colours"),
    ("Feuille de route : mes dernières livraisons sur Bâtipro et MyWattUp, et ce qui est en cours, relevées chaque nuit",
     "Roadmap: my latest releases on Bâtipro and MyWattUp, and what is in progress, collected every night"),
    ("Succès débloqués : ils s'allument tout seuls quand je passe un cap (commits, contributions, visites, coups de pinceau…)",
     "Achievements: they light up on their own when I reach a milestone (commits, contributions, visits, brush strokes…)"),
    ('<b>La fresque : ouvre le mur, choisis une case et ta couleur.</b> Ou clique un pot pour peindre la prochaine case libre. Pas de compte ; le mur est partagé entre tous les visiteurs.', '<b>The mural: open the wall, choose a square and your colour.</b> Or click a paint can to paint the next empty square. No account; everyone shares the wall.'),
    ("Mon mur de code : un rouleau de peinture repeint mes contributions des 12 derniers mois, une case par jour",
     "My code wall: a paint roller repaints my contributions of the last 12 months, one square per day"),
    ("Mes contributions des 12 derniers mois en ville 3D animée : une tour par jour, plus elle est haute, plus j'ai codé",
     "My contributions over the last 12 months as an animated 3D city: one tower per day, the taller it is, the more I coded"),
    ("Laisse ta trace", "Leave your mark"),
    ("Réactions des visiteurs au profil, comptées en direct", "Visitor reactions to the profile, counted live"),
    ("Réagir : Ça claque", "React: Fire"), ("Réagir : Bravo", "React: Bravo"), ("Réagir : Impressionnant", "React: Mind-blown"),
    ("Réagir : Inspirant", "React: Inspiring"), ("Réagir : Beau boulot", "React: Nice work"),
    ("On en parle ?", "Let's talk?"),
    ("Un retour sur un projet, une question sur le bâtiment ou sur le code : écris-moi, je réponds.",
     "Feedback on a project, a question about building work or code: write to me, I reply."),
    ("Préparer le support, soigner la finition — au chantier comme dans le code.",
     "Prep the surface, perfect the finish — on site as in code."),
]
COULEURS = {"orange": "orange", "bleu": "blue", "vert": "green", "jaune": "yellow", "rose": "pink", "violet": "purple", "blanc": "white"}


def main():
    s = open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
    for fr, en in TEXTES:
        if fr not in s:
            print(f"! texte absent de README.md : {fr[:60]}")
        s = s.replace(fr, en)
    s = re.sub(r'alt="Peindre en (\w+)"', lambda m: f'alt="Paint it {COULEURS.get(m.group(1), m.group(1))}"', s)
    # images dessinées par le serveur : version anglaise
    s = re.sub(r'(https://mmr45-profil\.vercel\.app/(?:img/[\w-]+\.svg|terminal\.svg|vues\.svg|live\.svg|reactions\.svg|mur\.svg|theme-actuel\.svg)\?[^"]*)"',
               lambda m: m.group(1) + '&amp;lang=en"', s)
    s = re.sub(r'(https://mmr45-profil\.vercel\.app/theme-actuel\.svg)"', r'\1?lang=en"', s)
    restes = re.findall(r"[àâçéèêëîïôûùœ]\w*", re.sub(r"Bâtipro|Français|française", "", s))
    if restes:
        print("! mots français restants :", sorted(set(restes))[:20])
    open(os.path.join(ROOT, "README.en.md"), "w", encoding="utf-8").write(s)
    print("README.en.md écrit")


if __name__ == "__main__":
    main()

