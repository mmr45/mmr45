"""Le mur de peinture collectif du profil.

Un visiteur clique sur un pot de couleur dans le README, ce qui ouvre une issue
« peindre: <couleur> ». Le workflow .github/workflows/mur.yml appelle alors :

    python3 mur.py <dossier_du_mur> "<titre de l'issue>" "<login de l'auteur>"

Le script met à jour <dossier>/etat.json, redessine <dossier>/mur-{dark,light}.svg
et écrit la réponse à poster sous l'issue dans $MESSAGE_FILE.
Sans titre, il redessine simplement le mur.

    python3 mur.py --pots <dossier>    dessine les pots de couleur du README
"""
import datetime as dt
import json
import os
import random
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from profil import BASE_CSS, MONO, PAL, SANS, card_bg, esc, svg, t  # noqa: E402

COULEURS = {
    "orange": "#FF6A13",
    "bleu": "#2F7BEA",
    "vert": "#3FB950",
    "jaune": "#F2CC60",
    "rose": "#F778BA",
    "violet": "#A371F7",
    "blanc": "#EFE9DD",
}
COLS, ROWS = 24, 6
CASES = COLS * ROWS
MAX_PAR_JOUR = 5
LOGIN_OK = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")
ISSUE_URL = "https://github.com/mmr45/mmr45/issues/new"

# ordre de remplissage fixe mais éparpillé : le mur se couvre comme une vraie couche
ORDRE = list(range(CASES))
random.Random(45).shuffle(ORDRE)


def charge(dossier):
    try:
        with open(os.path.join(dossier, "etat.json"), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"couche": 1, "total": 0, "cases": []}


def peindre(etat, titre, login, maintenant):
    """Applique une touche. Renvoie (a_peint, message pour l'issue)."""
    m = re.match(r"^\s*peindre\s*:\s*([a-zé]+)\s*$", titre.strip().lower())
    couleurs = ", ".join(f"`{c}`" for c in COULEURS)
    if not m or m.group(1) not in COULEURS:
        return False, (f"Je n'ai pas reconnu la couleur. Le titre doit être `peindre: <couleur>` "
                       f"avec une de ces couleurs : {couleurs}.")
    if not LOGIN_OK.match(login or ""):
        return False, "Compte GitHub non reconnu, rien n'a été peint."
    couleur = m.group(1)
    jour = maintenant.date().isoformat()
    deja = sum(1 for c in etat["cases"] if c["par"] == login and c["le"].startswith(jour))
    if deja >= MAX_PAR_JOUR:
        return False, f"Tu as déjà donné {MAX_PAR_JOUR} coups de pinceau aujourd'hui. Reviens demain !"
    nouvelle_couche = False
    if len(etat["cases"]) >= CASES:
        etat["couche"] += 1
        etat["cases"] = []
        nouvelle_couche = True
    etat["cases"].append({"case": ORDRE[len(etat["cases"])], "couleur": couleur, "par": login,
                          "le": maintenant.isoformat(timespec="seconds")})
    etat["total"] += 1
    peintres = etat.setdefault("peintres", {})
    peintres[login] = peintres.get(login, 0) + 1
    reste = CASES - len(etat["cases"])
    msg = (f"Merci @{login} ! Ta touche **{couleur}** est sur le mur "
           f"(coup de pinceau n°{etat['total']}, couche n°{etat['couche']}). "
           f"Elle apparaît sur le profil d'ici une à deux minutes.")
    if nouvelle_couche:
        msg += " Le mur était plein : tu viens d'attaquer une nouvelle couche !"
    elif reste == 0:
        msg += " Tu as posé la dernière case de cette couche !"
    return True, msg


def rendu(etat, mode):
    p = PAL[mode]
    W, H = 1200, 470
    defs, bg = card_bg(p, W, H, ("50%", "50%"))
    cell, gap = 42, 6
    x0 = (W - (COLS * (cell + gap) - gap)) // 2
    y0 = 92
    peintes = {c["case"]: c for c in etat["cases"]}
    derniere = etat["cases"][-1] if etat["cases"] else None
    cases = []
    for k in range(CASES):
        col, row = k % COLS, k // COLS
        x, y = x0 + col * (cell + gap), y0 + row * (cell + gap)
        wave = (col + row) * 0.06
        c = peintes.get(k)
        if c is None:
            cases.append(f'<rect class="vide" style="animation-delay:{wave:.2f}s" x="{x + .75}" y="{y + .75}" width="{cell - 1.5}" '
                         f'height="{cell - 1.5}" rx="7" fill="{p["panel2"]}" stroke="{p["faint"]}" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="4 4"/>')
            continue
        coul = COULEURS[c["couleur"]]
        bord = f' stroke="{p["line"]}"' if c["couleur"] == "blanc" and mode == "light" else ""
        titre = f'<title>@{esc(c["par"])} · {esc(c["couleur"])}</title>'
        if c is derniere:
            cases.append(f'<g>{titre}<clipPath id="dc"><rect class="neuf" x="{x}" y="{y}" width="{cell}" height="{cell}" rx="7"/></clipPath>'
                         f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="7" fill="{coul}" fill-opacity=".18"/>'
                         f'<rect clip-path="url(#dc)" x="{x}" y="{y}" width="{cell}" height="{cell}" rx="7" fill="{coul}"{bord}/>'
                         f'<rect class="rouleau rm" x="{x - 4}" y="{y - 3}" width="{cell + 8}" height="7" rx="3.5" fill="{p["text"]}"/>'
                         f'<rect class="halo rm" x="{x}" y="{y}" width="{cell}" height="{cell}" rx="7" fill="none" stroke="{coul}" stroke-width="3"/></g>')
        else:
            cases.append(f'<rect class="pop" style="animation-delay:{.2 + wave:.2f}s" x="{x}" y="{y}" width="{cell}" height="{cell}" '
                         f'rx="7" fill="{coul}"{bord}>{titre}</rect>')
    n = len(etat["cases"])
    pct = n / CASES
    gy = y0 + ROWS * (cell + gap) - gap
    if derniere:
        bas = (f'Dernière touche : <tspan fill="{p["text"]}" font-weight="700">@{esc(derniere["par"])}</tspan> '
               f'en <tspan fill="{COULEURS[derniere["couleur"]]}" font-weight="700">{esc(derniere["couleur"])}</tspan>')
    else:
        bas = f'Le mur est vierge. <tspan fill="{p["text"]}" font-weight="700">Sois le premier à peindre</tspan>'
    top = sorted(etat.get("peintres", {}).items(), key=lambda kv: (-kv[1], kv[0]))[:3]
    if top:
        medailles = [p["orange"], p["muted"], p["faint"]]
        podium = "top : " + " ".join(
            f'<tspan fill="{medailles[i]}" font-weight="700">@{esc(l)}</tspan><tspan> ×{c}</tspan>' for i, (l, c) in enumerate(top))
    else:
        podium = "choisis ta couleur ↓"
    defs += f"""
  <linearGradient id="lu" x1="0" x2="1" y1="0" y2=".3"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="zone"><rect x="{x0}" y="{y0}" width="{COLS * (cell + gap) - gap}" height="{gy - y0}"/></clipPath>"""
    body = f"""
<g class="up">
  <circle class="pulse" cx="{x0 + 6}" cy="50" r="6" fill="{p['orange']}"/>
  {t(x0 + 22, 56, f"LE MUR · COUCHE N°{etat['couche']}", 17, p['faint'], 400, MONO, extra=' letter-spacing="2"')}
  {t(W - x0, 56, f"{etat['total']} coup{'s' if etat['total'] > 1 else ''} de pinceau · {n}/{CASES}", 20, p['text'], 700, MONO, "end")}
</g>
{''.join(cases)}
<g clip-path="url(#zone)"><rect class="lustre rm" x="{x0 - 400}" y="{y0}" width="300" height="{gy - y0}" fill="url(#lu)"/></g>
<rect x="{x0}" y="{gy + 26}" width="{W - 2 * x0}" height="6" rx="3" fill="{p['panel2']}"/>
<rect class="jauge" x="{x0}" y="{gy + 26}" width="{max((W - 2 * x0) * pct, 6):.0f}" height="6" rx="3" fill="{p['orange']}"/>
<g class="up" style="animation-delay:.5s">
  <text x="{x0}" y="{gy + 70}" font-family="{SANS}" font-size="22" fill="{p['muted']}">{bas}</text>
  <text x="{W - x0}" y="{gy + 70}" text-anchor="end" font-family="{MONO}" font-size="19" fill="{p['faint']}">{podium}</text>
</g>"""
    style = BASE_CSS + f"""
.vide{{animation:vide 4s ease-in-out infinite}}
@keyframes vide{{0%,100%{{opacity:.45}}50%{{opacity:1}}}}
.pop{{transform-box:fill-box;transform-origin:center;animation:pop .5s cubic-bezier(.3,1.6,.5,1) both}}
@keyframes pop{{from{{transform:scale(0)}}to{{transform:scale(1)}}}}
.neuf{{transform-box:fill-box;transform-origin:top;animation:neuf 4s infinite}}
@keyframes neuf{{0%,8%{{transform:scaleY(0)}}40%,100%{{transform:scaleY(1)}}}}
.rouleau{{animation:rouleau 4s infinite}}
@keyframes rouleau{{0%,8%{{transform:translateY(0);opacity:1}}40%{{transform:translateY({cell}px);opacity:1}}50%,100%{{transform:translateY({cell}px);opacity:0}}}}
.halo{{transform-box:fill-box;transform-origin:center;animation:halo 4s 1.6s infinite}}
@keyframes halo{{0%{{transform:scale(1);opacity:.9}}30%,100%{{transform:scale(1.8);opacity:0}}}}
.lustre{{animation:lustre 6s 1s ease-in-out infinite}}
@keyframes lustre{{0%{{transform:translateX(0)}}50%,100%{{transform:translateX({W + 600}px)}}}}
.jauge{{transform-box:fill-box;transform-origin:left;animation:jauge 1.6s .4s cubic-bezier(.6,0,.2,1) both}}
@keyframes jauge{{from{{transform:scaleX(0)}}to{{transform:scaleX(1)}}}}
"""
    return svg(W, H, f"Mur de peinture collectif : couche n°{etat['couche']}, {n} cases peintes sur {CASES}, "
                     f"{etat['total']} coups de pinceau au total.", bg + body, style, defs)


def pot(nom, coul):
    """Petit pot de peinture cliquable du README."""
    W, H = 120, 150
    dark = "#0B1220"
    body = f"""
<g class="bob">
  <path d="M26 52C26 18 94 18 94 52" fill="none" stroke="#8A9BB8" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M28 52h64v64a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10z" fill="#D5DDEA"/>
  <path d="M28 60h64v4H28z" fill="#000" fill-opacity=".06"/>
  <rect x="40" y="84" width="40" height="26" rx="5" fill="#fff" fill-opacity=".85"/>
  <circle cx="60" cy="97" r="7" fill="{coul}"/>
  <path d="M33 54v20a5.5 5.5 0 0 0 11 0V56zM74 55v11a4.5 4.5 0 0 0 9 0V56z" fill="{coul}"/>
  <ellipse cx="60" cy="52" rx="33" ry="9" fill="{coul}" stroke="#B8C3D6" stroke-width="4"/>
  <ellipse cx="52" cy="50" rx="12" ry="3" fill="#fff" fill-opacity=".35"/>
  <ellipse class="goutte" cx="38.5" cy="80" rx="3.5" ry="5" fill="{coul}"/>
</g>
<text x="60" y="146" text-anchor="middle" font-family="{MONO}" font-size="17" font-weight="700" fill="#8A9BB8">{esc(nom)}</text>"""
    style = """
.bob{transform-origin:60px 120px;animation:bob 3s ease-in-out infinite}
@keyframes bob{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
.goutte{animation:goutte 3s ease-in infinite}
@keyframes goutte{0%,40%{transform:translateY(0);opacity:0}50%{opacity:1}100%{transform:translateY(52px);opacity:0}}
"""
    return svg(W, H, f"Peindre en {nom}", body, style)


def ecrit_pots(dossier):
    os.makedirs(dossier, exist_ok=True)
    for nom, coul in COULEURS.items():
        with open(os.path.join(dossier, f"pot-{nom}.svg"), "w", encoding="utf-8") as f:
            f.write(pot(nom, coul))


def main():
    if sys.argv[1:2] == ["--pots"]:
        ecrit_pots(sys.argv[2])
        return
    dossier = sys.argv[1]
    titre = sys.argv[2] if len(sys.argv) > 2 else ""
    login = sys.argv[3] if len(sys.argv) > 3 else ""
    etat = charge(dossier)
    a_peint, msg = (False, "")
    if titre:
        a_peint, msg = peindre(etat, titre, login, dt.datetime.now(dt.timezone.utc))
    os.makedirs(dossier, exist_ok=True)
    with open(os.path.join(dossier, "etat.json"), "w", encoding="utf-8") as f:
        json.dump(etat, f, ensure_ascii=False, indent=1)
    for mode in PAL:
        with open(os.path.join(dossier, f"mur-{mode}.svg"), "w", encoding="utf-8") as f:
            f.write(rendu(etat, mode))
    if os.environ.get("MESSAGE_FILE") and msg:
        with open(os.environ["MESSAGE_FILE"], "w", encoding="utf-8") as f:
            f.write(msg)
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"peint={'oui' if a_peint else 'non'}\n")
    print(msg or "Mur redessiné.")


if __name__ == "__main__":
    main()
