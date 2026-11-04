"""Dessine toutes les images du profil (thème clair + thème sombre).

Usage : python3 .github/scripts/profil.py
Les SVG sont écrits dans assets/. Aucune dépendance obligatoire : Pillow sert
seulement à compresser les captures d'écran des projets (sinon PNG brut).

Contraintes GitHub prises en compte :
  - les SVG sont affichés via <img> : pas de JavaScript, pas de police externe,
    seulement CSS + SMIL ;
  - l'état « au repos » de chaque animation est l'état final, pour que tout
    reste lisible avec prefers-reduced-motion ;
  - le texte est volontairement grand : l'image est réduite à ~360 px sur mobile.
"""
import base64
import io
import os
from xml.sax.saxutils import escape as esc

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "assets")

SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Inter, Arial, sans-serif"
MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', 'DejaVu Sans Mono', Menlo, monospace"

PAL = {
    "dark": dict(
        bg="#0B1220", panel="#0F1729", panel2="#131D33", line="#22304D", grid="#1A2742",
        text="#EEF3FA", muted="#8A9BB8", faint="#5C6E8F", orange="#FF6A13", orange2="#FF9A5C",
        blue="#4A92FF", green="#3FB950", glow=".18", bar="#0E1626",
        kw="#FF7B3A", str="#7EE787", prop="#9CC4FF", typ="#F2CC60", pun="#8A9BB8", com="#5C6E8F",
    ),
    "light": dict(
        bg="#F7F4EE", panel="#FFFFFF", panel2="#FBF9F5", line="#E3DCCF", grid="#E9E3D8",
        text="#14213D", muted="#5B6B85", faint="#97A3B6", orange="#F0600F", orange2="#F58A4B",
        blue="#1D5FA3", green="#1A7F37", glow=".12", bar="#EFE9DD",
        kw="#D2500A", str="#1A7F37", prop="#1D5FA3", typ="#9A6700", pun="#5B6B85", com="#97A3B6",
    ),
}

REDUCED = "@media (prefers-reduced-motion: reduce){*{animation:none!important}.rm{display:none}}"


def svg(w, h, label, body, style="", defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            f'width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{esc(label)}">\n'
            f'<title>{esc(label)}</title>\n<defs>{defs}</defs>\n<style>{style}{REDUCED}</style>\n{body}\n</svg>\n')


def card_bg(p, w, h, glow_at=("80%", "40%")):
    """Fond commun : carte arrondie, quadrillage de plan qui s'efface, halo orange."""
    defs = f"""
  <pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="{p['grid']}"/></pattern>
  <radialGradient id="fd" cx="{glow_at[0]}" cy="{glow_at[1]}" r="80%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="m"><rect width="{w}" height="{h}" fill="url(#fd)"/></mask>
  <radialGradient id="gl" cx="{glow_at[0]}" cy="{glow_at[1]}" r="50%"><stop offset="0" stop-color="{p['orange']}" stop-opacity="{p['glow']}"/><stop offset="1" stop-color="{p['orange']}" stop-opacity="0"/></radialGradient>
  <clipPath id="card"><rect width="{w}" height="{h}" rx="22"/></clipPath>"""
    body = f"""
<g clip-path="url(#card)">
  <rect width="{w}" height="{h}" fill="{p['bg']}"/>
  <rect width="{w}" height="{h}" fill="url(#g)" mask="url(#m)"/>
  <rect width="{w}" height="{h}" fill="url(#gl)"/>
</g>
<rect x=".5" y=".5" width="{w - 1}" height="{h - 1}" rx="21.5" fill="none" stroke="{p['line']}"/>"""
    return defs, body


BASE_CSS = """
.up{animation:up .8s cubic-bezier(.2,.8,.2,1) both}
@keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.pulse{animation:pulse 2s ease-in-out infinite}
@keyframes pulse{50%{opacity:.25}}
"""


def t(x, y, s, size, fill, weight=400, font=SANS, anchor="start", extra=""):
    a = f' text-anchor="{anchor}"' if anchor != "start" else ""
    return (f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}"{a}{extra}>{esc(s)}</text>')


# ─────────────────────────────────────────────────────────────── bannière ──
CODE = [
    [("kw", "export const "), ("prop", "osman"), ("pun", " = {")],
    [("prop", "  métier"), ("pun", ": "), ("str", '"peintre & dev"'), ("pun", ",")],
    [("prop", "  diplôme"), ("pun", ": "), ("str", '"CAP · mention"'), ("pun", ",")],
    [("prop", "  en_prod"), ("pun", ": ["), ("str", '"Bâtipro"'), ("pun", ", ")],
    [("pun", "            "), ("str", '"MyWattUp"'), ("pun", "],")],
    [("prop", "  stack"), ("pun", ": "), ("str", '"TS · Supabase"'), ("pun", ",")],
    [("prop", "  devise"), ("pun", ": "), ("str", '"finition > vite"'), ("pun", ",")],
    [("pun", "} "), ("kw", "satisfies "), ("typ", "Artisan"), ("pun", ";")],
]


def hero(mode):
    p = PAL[mode]
    W, H = 1200, 540
    defs, bg = card_bg(p, W, H, ("82%", "38%"))

    # --- éditeur de code qui se tape tout seul ---
    ex, ey, ew, eh = 668, 52, 480, 400
    fs, lh, cw = 19, 31, 11.45          # taille, interligne, largeur d'un caractère mono
    gx = ex + 52                        # début du code (après les numéros de ligne)
    y0 = ey + 92
    C = 16.0                            # durée d'un cycle complet (s)

    def pc(sec):
        return f"{min(max(sec / C * 100, 0), 100):.2f}%"

    lines, covers, kf = [], [], []
    delay = 0.9
    N = len(CODE)
    for i, toks in enumerate(CODE):
        y = y0 + i * lh
        spans = "".join(f'<tspan fill="{p[k]}">{esc(s)}</tspan>' for k, s in toks)
        n = sum(len(s) for _, s in toks)
        dur = max(n * 0.026, 0.2)
        lines.append(t(ex + 34, y, str(i + 1), fs - 3, p["faint"], font=MONO, anchor="end"))
        lines.append(f'<text x="{gx}" y="{y}" font-family="{MONO}" font-size="{fs}" xml:space="preserve">{spans}</text>')
        dist = n * cw + 14
        s0, s1 = delay, delay + dur
        e0 = C * .9 + (N - 1 - i) * .09     # effacement de bas en haut, façon retour arrière
        covers.append(
            f'<g class="rm" style="animation:ty{i} {C}s linear infinite">'
            f'<rect x="{gx - 2}" y="{y - 22}" width="{ew - (gx - ex) + 2}" height="{lh}" fill="{p["panel"]}"/>'
            f'<rect style="animation:cu{i} {C}s linear infinite" x="{gx - 1}" y="{y - 19}" width="2.5" height="24" fill="{p["orange"]}" opacity="0"/></g>')
        kf.append(f"@keyframes ty{i}{{0%,{pc(s0)}{{transform:translateX(0);animation-timing-function:steps({n},end)}}"
                  f"{pc(s1)},{pc(e0)}{{transform:translateX({dist:.0f}px);animation-timing-function:ease-in}}"
                  f"{pc(e0 + .3)},100%{{transform:translateX(0)}}}}")
        kf.append(f"@keyframes cu{i}{{0%,{pc(s0 - .01)}{{opacity:0}}{pc(s0)},{pc(s1)}{{opacity:1}}{pc(s1 + .01)},100%{{opacity:0}}}}")
        delay += dur + 0.08
    type_end = delay
    last_y = y0 + (len(CODE) - 1) * lh
    last_n = sum(len(s) for _, s in CODE[-1])
    hold_end = C * .9
    cursor = (f'<g class="rm" style="animation:hold {C}s linear infinite" opacity="0"><rect style="animation:blink 1.1s steps(1) infinite" '
              f'x="{gx + last_n * cw + 3:.0f}" y="{last_y - 19}" width="2.5" height="24" fill="{p["orange"]}"/></g>')
    kf.append(f"@keyframes hold{{0%,{pc(type_end - .01)}{{opacity:0}}{pc(type_end)},{pc(hold_end)}{{opacity:1}}{pc(hold_end + .01)},100%{{opacity:0}}}}")
    for nm, st in (("tm", type_end + .2), ("ok", type_end + .9)):
        kf.append(f"@keyframes {nm}{{0%,{pc(st)}{{opacity:0;transform:translateY(8px)}}{pc(st + .5)},{pc(C * .89)}{{opacity:1;transform:none}}"
                  f"{pc(C * .91)},100%{{opacity:0;transform:none}}}}")
    term_y = ey + eh - 44
    term = f"""
  <g class="lp" style="animation:tm {C}s infinite">
    <rect x="{ex}" y="{term_y - 4}" width="{ew}" height="1" fill="{p['line']}"/>
    {t(ex + 22, term_y + 28, "$ git push", 18, p['muted'], font=MONO)}
    <g class="lp" style="animation:ok {C}s infinite">
      <circle cx="{ex + 168}" cy="{term_y + 22}" r="9" fill="{p['green']}"/>
      <path d="M{ex + 163.5} {term_y + 22.5}l3 3 6-6.5" fill="none" stroke="{p['panel']}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      {t(ex + 186, term_y + 28, "en ligne · 2 apps", 18, p['green'], 600, MONO)}
    </g>
  </g>"""
    editor = f"""
<g class="up" style="animation-delay:.5s">
  <rect x="{ex}" y="{ey}" width="{ew}" height="{eh}" rx="16" fill="{p['panel']}" stroke="{p['line']}"/>
  <path d="M{ex} {ey + 16}a16 16 0 0 1 16-16h{ew - 32}a16 16 0 0 1 16 16v28H{ex}z" fill="{p['panel2']}"/>
  <rect x="{ex}" y="{ey + 44}" width="{ew}" height="1" fill="{p['line']}"/>
  <circle cx="{ex + 24}" cy="{ey + 22}" r="6" fill="#FF5F57"/><circle cx="{ex + 44}" cy="{ey + 22}" r="6" fill="#FEBC2E"/><circle cx="{ex + 64}" cy="{ey + 22}" r="6" fill="#28C840"/>
  <rect x="{ex + 90}" y="{ey + 8}" width="206" height="37" rx="8" fill="{p['panel']}"/>
  <rect x="{ex + 90}" y="{ey + 42}" width="206" height="3" fill="{p['panel']}"/>
  <rect x="{ex + 90}" y="{ey + 8}" width="206" height="2" rx="1" fill="{p['orange']}"/>
  {t(ex + 108, ey + 32, "TS", 13, p['blue'], 800, MONO)}
  {t(ex + 134, ey + 32, "osman.config.ts", 15, p['text'], 400, MONO)}
  {''.join(lines)}
  <g clip-path="url(#ed)">{''.join(covers)}</g>
  {cursor}
  {term}
</g>"""

    # --- nom peint au rouleau ---
    nx, ny = 64, 226
    name_w = 368
    roll = f"""
<clipPath id="paint"><rect class="reveal" x="{nx - 8}" y="{ny - 110}" width="{name_w + 30}" height="160"/></clipPath>
<g clip-path="url(#paint)"><g class="nm">
  <path d="M{nx - 4} {ny + 18}c60-5 140 4 200-1s110 3 {name_w - 196} -1v14c-70 4-130-3-200 1s-140-4-{name_w - 4} 0z" fill="{p['orange']}"/>
  {t(nx - 4, ny, "Osman", 112, p['text'], 800, extra=' letter-spacing="-3"')}
</g></g>
<g class="roller rm">
  <g transform="translate({nx - 8} 0)">
    <path d="M18 {ny - 92}V{ny - 112}H62V{ny - 150}" fill="none" stroke="{p['muted']}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="53" y="{ny - 196}" width="18" height="50" rx="8" fill="{p['text']}"/>
    <rect x="0" y="{ny - 92}" width="34" height="132" rx="10" fill="{p['orange']}"/>
    <path d="M8 {ny - 80}V{ny + 28}M17 {ny - 84}V{ny + 32}M26 {ny - 80}V{ny + 28}" stroke="#000" stroke-opacity=".14" stroke-width="2"/>
  </g>
</g>"""
    taglines = ["Préparer le support", "Écrire le code", "Livrer en production"]
    tag = "".join(
        f'<g class="cyc" style="animation-delay:{1.6 + i * 4}s"><text x="{nx}" y="{ny + 84}" font-family="{SANS}" font-size="42" '
        f'font-weight="800" fill="{p["text"]}" letter-spacing="-.5">{esc(s)}<tspan fill="{p["orange"]}">.</tspan></text></g>'
        for i, s in enumerate(taglines))
    left = f"""
<g class="up" style="animation-delay:.1s">{t(nx, 104, "// peintre · développeur · fondateur", 19, p['orange'], 400, MONO)}</g>
{roll}
<g class="stat0">{t(nx, ny + 84, "Préparer le support", 42, p['text'], 800).replace('</text>', f'<tspan fill="{p["orange"]}">.</tspan></text>')}</g>
{tag}
<g class="up" style="animation-delay:1.3s">
  {t(nx, ny + 140, "Peintre en bâtiment, je conçois, code", 25, p['muted'])}
  {t(nx, ny + 174, "et mets en ligne mes propres SaaS. Seul.", 25, p['muted'])}
</g>"""

    # --- barre d'état façon éditeur ---
    sy = H - 52
    items_l = [("⎇ main", p['muted']), ("✓ 2 SaaS en production", p['green']), ("◆ CAP Peinture · mention", p['muted'])]
    items_r = [("France", p['muted']), ("UTF-8", p['faint']), ("TypeScript", p['blue'])]
    sx, parts = 24, []
    for s, c in items_l:
        parts.append(t(sx, sy + 33, s, 18, c, 600 if c == p['green'] else 400, MONO))
        sx += len(s) * 11 + 34
    rx = W - 24
    for s, c in items_r:
        parts.append(t(rx, sy + 33, s, 18, c, 400, MONO, anchor="end"))
        rx -= len(s) * 11 + 30
    status = f"""
<g clip-path="url(#card)">
  <rect x="0" y="{sy}" width="{W}" height="52" fill="{p['bar']}"/>
  <rect x="0" y="{sy}" width="{W}" height="1" fill="{p['line']}"/>
  <rect x="0" y="{sy}" width="6" height="52" fill="{p['orange']}"/>
</g>
<g class="up" style="animation-delay:.3s">{''.join(parts)}</g>"""

    style = BASE_CSS + f"""
@keyframes blink{{0%{{opacity:1}}50%{{opacity:0}}}}
.reveal{{transform-box:fill-box;transform-origin:left;animation:reveal {C}s infinite}}
@keyframes reveal{{0%,{pc(.35)}{{transform:scaleX(0);animation-timing-function:cubic-bezier(.65,0,.35,1)}}{pc(1.65)},100%{{transform:scaleX(1)}}}}
.nm{{animation:nm {C}s infinite}}
@keyframes nm{{0%,{pc(C * .9)}{{opacity:1}}{pc(C * .96)},100%{{opacity:0}}}}
.roller{{animation:roll {C}s infinite}}
@keyframes roll{{0%{{opacity:0;transform:translate(0,0)}}{pc(.3)}{{opacity:1;transform:translate(0,0);animation-timing-function:cubic-bezier(.65,0,.35,1)}}{pc(1.65)}{{opacity:1;transform:translate({name_w + 14}px,0);animation-timing-function:ease-in}}{pc(2.1)},100%{{opacity:0;transform:translate({name_w + 14}px,-30px)}}}}
.lp{{opacity:0}}
.scan{{animation:scan 7s linear infinite}}
@keyframes scan{{from{{transform:translateY(-10px)}}to{{transform:translateY({H}px)}}}}
.cyc{{opacity:0;animation:cyc 12s cubic-bezier(.4,0,.2,1) infinite}}
@keyframes cyc{{0%{{opacity:0;transform:translateY(16px)}}4%,30%{{opacity:1;transform:none}}34%,100%{{opacity:0;transform:translateY(-16px)}}}}
.stat0{{opacity:0}}
@media (prefers-reduced-motion: reduce){{.stat0,.lp{{opacity:1}}.cyc{{display:none}}}}
"""
    style += "\n".join(kf)
    defs += f'<linearGradient id="sc" x1="0" x2="1"><stop offset="0" stop-color="{p["orange"]}" stop-opacity="0"/><stop offset=".75" stop-color="{p["orange"]}" stop-opacity=".5"/><stop offset="1" stop-color="{p["orange"]}" stop-opacity="0"/></linearGradient>'
    scan = f'<g clip-path="url(#card)"><rect class="scan rm" x="0" y="0" width="{W}" height="1.5" fill="url(#sc)"/></g>'
    defs += f'<clipPath id="ed"><rect x="{ex}" y="{ey}" width="{ew}" height="{eh}" rx="16"/></clipPath>'
    return svg(W, H, "Osman — peintre en bâtiment, développeur et fondateur de deux SaaS en production. Du chantier au code.",
               bg + scan + left + editor + status, style, defs)


# ──────────────────────────────────────────────────────── titres de section ──
def titre(mode, num, title, comment):
    p = PAL[mode]
    W, H = 1200, 104
    uw = min(len(title) * 10, 230)
    body = f"""
<g class="in">
  <rect class="bx" x="2" y="26" width="58" height="38" rx="10" fill="{p['orange']}" fill-opacity="0" stroke="{p['orange']}" stroke-width="2"/>
  {t(31, 52, num, 19, p['orange'], 700, MONO, "middle")}
  {t(80, 60, title, 42, p['text'], 800, extra=' letter-spacing="-.6"')}
</g>
<path class="u" pathLength="100" d="M82 80c70-6 150 3 {uw}-3" fill="none" stroke="{p['orange']}" stroke-width="6" stroke-linecap="round"/>
<rect class="l" x="0" y="{H - 2}" width="{W}" height="1.5" fill="{p['line']}"/>
<g class="in" style="animation-delay:.3s">{t(W - 2, 52, comment, 19, p['faint'], 400, MONO, "end")}</g>"""
    style = """
.in{animation:in .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes in{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
.u{stroke-dasharray:100 100;animation:u 9s .3s cubic-bezier(.6,0,.2,1) infinite both}
@keyframes u{0%{stroke-dashoffset:100}10%,80%{stroke-dashoffset:0}92%,100%{stroke-dashoffset:-100}}
.bx{animation:bx 9s .3s ease-in-out infinite}
@keyframes bx{0%,8%,100%{fill-opacity:0}4%{fill-opacity:.25}}
.l{transform-box:fill-box;transform-origin:left;animation:l 1.2s .2s cubic-bezier(.6,0,.2,1) both}
@keyframes l{from{transform:scaleX(0)}to{transform:scaleX(1)}}
"""
    return svg(W, H, title, body, style)


# ───────────────────────────────────────────────────────────── cartes projet ──
def capture(path):
    try:
        from PIL import Image
        im = Image.open(path).convert("RGB")
        im = im.resize((960, 600), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=82, optimize=True, progressive=True)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except ImportError:
        return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()


def image_brute(path, largeur):
    """Image déjà optimisée (JPEG des captures) : intégrée telle quelle, renvoie (data-uri, hauteur à cette largeur)."""
    data = open(path, "rb").read()
    try:
        from PIL import Image
        w, h = Image.open(io.BytesIO(data)).size
    except ImportError:
        w, h = 1, 1
    return "data:image/jpeg;base64," + base64.b64encode(data).decode(), largeur * h / w


PROJETS = {
    "batipro": dict(
        nom="Bâtipro", tag="SAAS · BTP", url="batipro-ten.vercel.app", img="batipro.png",
        pitch=["Créer son entreprise du bâtiment,", "sans se noyer dans la paperasse."],
        feats=["Test de qualification du projet", "Simulation du statut juridique",
               "Dossier INPI généré tout seul", "Devis BTP conformes en PDF"],
        stack=["JavaScript", "Supabase", "Stripe", "Vercel"],
    ),
    "mywattup": dict(
        nom="MyWattUp", tag="SAAS · SANTÉ", url="my-watt-up.vercel.app", img="mywattup.png",
        pitch=["Le coach qui croise sommeil,", "sport et alimentation."],
        feats=["Score d'énergie + conseil IA du jour", "Repas selon objectif et allergies",
               "Scanner de produits (code-barres)", "Offre gratuite et offre Pro"],
        stack=["JavaScript", "Supabase", "IA", "PWA"],
    ),
}


def projet(mode, key, flip=False):
    p = PAL[mode]
    d = PROJETS[key]
    W, H = 1200, 560
    defs, bg = card_bg(p, W, H, ("25%" if not flip else "75%", "45%"))
    # fenêtre de navigateur avec la capture
    bw, bh = 640, 400 + 44
    bx = 36 if not flip else W - 36 - bw
    by = (H - bh) // 2
    tx = bx + bw + 52 if not flip else 56
    vw, vh = bw, bh - 44  # zone visible du site dans la fenêtre
    scroll = os.path.join(OUT, "captures", f"{key}-scroll.jpg")
    mobile = os.path.join(OUT, "captures", f"{key}-mobile.jpg")
    if os.path.exists(scroll):
        img, ih = image_brute(scroll, vw)
    else:  # ancienne capture fixe
        img, ih = capture(os.path.join(OUT, "captures", d["img"])), vh
    dist = max(ih - vh, 0)
    defs += f"""
  <clipPath id="shot"><path d="M{bx} {by + 44}h{bw}v{bh - 44 - 14}a14 14 0 0 1-14 14H{bx + 14}a14 14 0 0 1-14-14z"/></clipPath>
  <linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="bas" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
  <filter id="ombre" x="-30%" y="-20%" width="160%" height="150%"><feGaussianBlur stdDeviation="14"/></filter>"""
    # barre de défilement qui suit la page
    pouce = max(vh * vh / ih, 40) if dist else 0
    barre = (f'<rect x="{bx + bw - 9}" y="{by + 50}" width="4" height="{pouce:.0f}" rx="2" fill="{p["muted"]}" fill-opacity=".55" class="defile rm"/>'
             if dist else "")
    tel = ""
    if os.path.exists(mobile):
        mimg, mih_ = image_brute(mobile, 160)
        pw_, ph_ = 176, 362
        px = bx + bw - 150 if not flip else bx - 20
        py = H - ph_ - 14
        sx, sy, sw, sh_ = px + 8, py + 8, pw_ - 16, ph_ - 16
        mdist = max(mih_ - sh_, 0)
        defs += f"""
  <clipPath id="ecran"><rect x="{sx}" y="{sy}" width="{sw}" height="{sh_}" rx="24"/></clipPath>"""
        tel = f"""
<g class="float2">
  <rect x="{px + 6}" y="{py + 18}" width="{pw_}" height="{ph_}" rx="32" fill="#000" fill-opacity=".45" filter="url(#ombre)"/>
  <rect x="{px}" y="{py}" width="{pw_}" height="{ph_}" rx="32" fill="#0B0F17" stroke="{p['line']}" stroke-width="2"/>
  <g clip-path="url(#ecran)">
    <rect x="{sx}" y="{sy}" width="{sw}" height="{sh_}" fill="#111"/>
    <image class="{'mdefile' if mdist else ''}" x="{sx}" y="{sy}" width="{sw}" height="{mih_}" preserveAspectRatio="xMidYMin slice" xlink:href="{mimg}"/>
  </g>
  <rect x="{px + pw_ / 2 - 30}" y="{py + 15}" width="60" height="17" rx="8.5" fill="#000"/>
  <rect x="{px + pw_ / 2 - 40}" y="{py + ph_ - 17}" width="80" height="4" rx="2" fill="#fff" fill-opacity=".55"/>
</g>"""
    browser = f"""
<g class="float">
  <rect x="{bx + 8}" y="{by + 24}" width="{bw}" height="{bh}" rx="14" fill="#000" fill-opacity=".3" filter="url(#ombre)"/>
  <rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="14" fill="{p['panel']}" stroke="{p['line']}"/>
  <circle cx="{bx + 22}" cy="{by + 22}" r="5.5" fill="#FF5F57"/><circle cx="{bx + 40}" cy="{by + 22}" r="5.5" fill="#FEBC2E"/><circle cx="{bx + 58}" cy="{by + 22}" r="5.5" fill="#28C840"/>
  <rect x="{bx + 84}" y="{by + 9}" width="{bw - 108}" height="26" rx="13" fill="{p['panel2']}" stroke="{p['line']}"/>
  <path d="M{bx + 102} {by + 19}v-2a4 4 0 0 1 8 0v2m-9 0h10v8h-10z" fill="none" stroke="{p['green']}" stroke-width="1.6"/>
  {t(bx + 120, by + 27, d['url'], 15, p['muted'], 400, MONO)}
  <g clip-path="url(#shot)">
    <rect x="{bx}" y="{by + 44}" width="{vw}" height="{vh}" fill="#fff"/>
    <image class="{'defile' if dist else ''}" x="{bx}" y="{by + 44}" width="{vw}" height="{ih:.0f}" preserveAspectRatio="xMidYMin slice" xlink:href="{img}"/>
    <rect x="{bx}" y="{by + bh - 60}" width="{vw}" height="60" fill="url(#bas)"/>
    <rect class="shine rm" x="{bx - 300}" y="{by + 44}" width="260" height="{bh}" fill="url(#sh)" transform="skewX(-18)"/>
  </g>
  {barre}
</g>{tel}"""
    # défilement : pauses sur le haut, le milieu et le bas de la page, puis remontée
    def cles(dd, nom):
        if not dd:
            return ""
        return (f"@keyframes {nom}{{0%,10%{{transform:translateY(0)}}28%,38%{{transform:translateY(-{dd * .36:.0f}px)}}"
                f"56%,66%{{transform:translateY(-{dd * .7:.0f}px)}}80%,90%{{transform:translateY(-{dd:.0f}px)}}100%{{transform:translateY(0)}}}}")
    trajet_barre = (vh - pouce - 12) if dist else 0
    style_defile = (cles(dist, "def") + cles(mdist if tel else 0, "mdef")
                    + (f"@keyframes barre{{0%,10%{{transform:translateY(0)}}28%,38%{{transform:translateY({trajet_barre * .36:.0f}px)}}"
                       f"56%,66%{{transform:translateY({trajet_barre * .7:.0f}px)}}80%,90%{{transform:translateY({trajet_barre:.0f}px)}}100%{{transform:translateY(0)}}}}" if dist else ""))
    y = 92
    chips, cx = [], tx
    for s in d["stack"]:
        w = len(s) * 9.9 + 28
        chips.append(f'<rect x="{cx}" y="{y + 342}" width="{w:.0f}" height="36" rx="18" fill="{p["panel2"]}" stroke="{p["line"]}"/>'
                     + t(cx + w / 2, y + 366, s, 16, p['muted'], 400, MONO, "middle"))
        cx += w + 10
    feats = "".join(
        f'<g class="up" style="animation-delay:{.55 + i * .12:.2f}s">'
        f'<circle cx="{tx + 12}" cy="{y + 176 + i * 40}" r="12" fill="{p["orange"]}" fill-opacity=".16"/>'
        f'<path d="M{tx + 6.5} {y + 176 + i * 40}l4 4 7-8" fill="none" stroke="{p["orange"]}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
        + t(tx + 36, y + 184 + i * 40, f, 23, p['text']) + '</g>'
        for i, f in enumerate(d["feats"]))
    text = f"""
<g class="up" style="animation-delay:.2s">
  {t(tx, y - 6, d['tag'], 16, p['faint'], 400, MONO, extra=' letter-spacing="2"')}
  {t(tx, y + 50, d['nom'], 58, p['text'], 800, extra=' letter-spacing="-1.5"')}
  <g transform="translate({tx + len(d['tag']) * 12.2 + 22:.0f} {y - 12})">
    <rect x="0" y="-17" width="122" height="32" rx="16" fill="{p['green']}" fill-opacity=".14"/>
    <circle class="pulse" cx="20" cy="1" r="6" fill="{p['green']}"/>
    {t(34, 5, "en ligne", 16, p['green'], 700, MONO)}
  </g>
</g>
<g class="up" style="animation-delay:.35s">
  {t(tx, y + 92, d['pitch'][0], 23, p['muted'])}
  {t(tx, y + 122, d['pitch'][1], 23, p['muted'])}
</g>
<rect class="hl rm" x="{tx - 10}" y="{y + 157}" width="{W - tx - 30 if not flip else bx - tx - 30}" height="38" rx="10" fill="{p['orange']}" fill-opacity=".1" stroke="{p['orange']}" stroke-opacity=".35"/>
{feats}
<g class="up" style="animation-delay:1.1s">{''.join(chips)}</g>
<g class="up" style="animation-delay:1.25s">{t(tx, y + 420, d['url'] + "  ↗", 21, p['orange'], 700, MONO)}</g>"""
    style = BASE_CSS + """
.float{animation:float 7s ease-in-out infinite alternate}
@keyframes float{from{transform:translateY(-4px)}to{transform:translateY(4px)}}
.shine{animation:shine 6s 1.2s ease-in-out infinite}
@keyframes shine{0%{transform:skewX(-18deg) translateX(0)}35%,100%{transform:skewX(-18deg) translateX(1300px)}}
.hl{animation:hl 8s infinite}
.defile{animation:def 16s cubic-bezier(.65,0,.35,1) infinite}
image.defile{animation-name:def}rect.defile{animation-name:barre}
.mdefile{animation:mdef 16s 1.5s cubic-bezier(.65,0,.35,1) infinite}
.float2{animation:float 6s 1s ease-in-out infinite alternate-reverse}
@keyframes hl{0%{transform:translateY(120px)}7.5%,25%{transform:translateY(0)}32.5%,50%{transform:translateY(40px)}57.5%,75%{transform:translateY(80px)}82.5%,100%{transform:translateY(120px)}}
""" + style_defile
    label = f"{d['nom']} — {' '.join(d['pitch'])} " + ", ".join(d['feats']) + f". En ligne sur {d['url']}."
    return svg(W, H, label, bg + browser + text, style, defs)


# ────────────────────────────────────────────────────── schéma d'architecture ──
def archi(mode):
    p = PAL[mode]
    W, H = 1200, 580
    defs, bg = card_bg(p, W, H, ("50%", "30%"))
    nodes = [
        ("CLIENT", "Interface", ["JS / TS · Vue", "Tailwind · PWA"], p['blue']),
        ("HÉBERGEMENT", "Vercel", ["Déploiement auto", "à chaque push"], p['text']),
        ("BACKEND", "Supabase", ["Auth · Postgres", "Edge Functions"], p['green']),
        ("SERVICES", "Stripe · IA", ["Paiements, webhooks", "conseils générés"], p['orange']),
    ]
    nw, nh, gap, ny = 252, 196, 30, 52
    x0 = (W - (4 * nw + 3 * gap)) // 2
    parts, links = [], []
    for i, (k, name, sub, c) in enumerate(nodes):
        x = x0 + i * (nw + gap)
        parts.append(f"""
<g class="up" style="animation-delay:{.15 + i * .15:.2f}s">
  <rect x="{x}" y="{ny}" width="{nw}" height="{nh}" rx="16" fill="{p['panel']}" stroke="{p['line']}"/>
  <rect x="{x}" y="{ny}" width="{nw}" height="5" rx="2.5" fill="{c}"/>
  <rect class="act rm" style="animation-delay:{1 + i * .35:.2f}s" x="{x}" y="{ny}" width="{nw}" height="{nh}" rx="16" fill="none" stroke="{c}" stroke-width="2" opacity="0"/>
  {t(x + 22, ny + 44, k, 15, p['faint'], 400, MONO, extra=' letter-spacing="2"')}
  {t(x + 22, ny + 90, name, 33, p['text'], 800, extra=' letter-spacing="-.5"')}
  {t(x + 22, ny + 132, sub[0], 20, p['muted'])}
  {t(x + 22, ny + 162, sub[1], 20, p['muted'])}
</g>""")
        if i < 3:
            ax = x + nw
            links.append(f'<path id="l{i}" d="M{ax + 2} {ny + nh / 2}H{ax + gap - 2}" stroke="{p["line"]}" stroke-width="2" stroke-dasharray="4 4"/>')
            for j, dl in enumerate((0, 1)):
                links.append(
                    f'<circle class="rm" r="4.5" fill="{p["orange"]}"><animateMotion dur="2s" begin="{1 + i * .35 + dl:.2f}s" '
                    f'repeatCount="indefinite" path="M{ax - 4} {ny + nh / 2}H{ax + gap + 4}"/>'
                    f'<animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="{1 + i * .35 + dl:.2f}s" repeatCount="indefinite"/></circle>')
    # retour Stripe → Supabase (webhooks), en arc sous les boîtes
    sx = x0 + 2 * (nw + gap) + nw / 2
    ex_ = x0 + 3 * (nw + gap) + nw / 2
    arc = f"M{ex_} {ny + nh + 2}C{ex_} {ny + nh + 48} {sx} {ny + nh + 48} {sx} {ny + nh + 2}"
    links.append(f'<path d="{arc}" fill="none" stroke="{p["line"]}" stroke-width="2" stroke-dasharray="4 4"/>')
    links.append(t((sx + ex_) / 2, ny + nh + 60, "webhook", 15, p['faint'], 400, MONO, "middle"))
    links.append(f'<circle class="rm" r="4.5" fill="{p["green"]}"><animateMotion dur="2.4s" begin="2s" repeatCount="indefinite" path="{arc}"/>'
                 f'<animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin="2s" repeatCount="indefinite"/></circle>')

    # pipeline de mise en prod
    py = 340
    steps = ["git push", "build", "preview", "production"]
    pipe = [f"""
<g class="up" style="animation-delay:.8s">
  {t(56, py, "DE MON ÉDITEUR À LA PROD", 16, p['faint'], 400, MONO, extra=' letter-spacing="2"')}
  <rect x="56" y="{py + 70}" width="{W - 112}" height="8" rx="4" fill="{p['panel2']}" stroke="{p['line']}"/>
  <rect class="fill" x="56" y="{py + 70}" width="{W - 112}" height="8" rx="4" fill="{p['orange']}"/>
</g>"""]
    for i, s in enumerate(steps):
        cx = 56 + i * (W - 112) / (len(steps) - 1)
        anchor = "start" if i == 0 else "end" if i == len(steps) - 1 else "middle"
        last = i == len(steps) - 1
        c = p['green'] if last else p['orange']
        pipe.append(f"""
{f'<circle class="glow rm" cx="{cx}" cy="{py + 74}" r="17" fill="none" stroke="{c}" stroke-width="2" opacity="0"/>' if last else ''}
<g class="pop" style="animation-delay:{1 + i * .7:.2f}s">
  <circle cx="{cx}" cy="{py + 74}" r="17" fill="{p['bg']}" stroke="{c}" stroke-width="3"/>
  <path d="M{cx - 6} {py + 74.5}l4 4 8-8.5" fill="none" stroke="{c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<g class="up" style="animation-delay:{1 + i * .7:.2f}s">
  {t(cx + (-17 if i == 0 else 17 if last else 0), py + 132, s, 24, p['text'] if not last else p['green'], 700, MONO, anchor)}
</g>""")
    pipe.append(f"""
<g class="up" style="animation-delay:3.4s">
  {t(W / 2, py + 196, "Je code, je pousse, c'est en ligne : chaque modification part en production en quelques minutes.", 21, p['muted'], 400, SANS, "middle")}
</g>""")
    style = BASE_CSS + """
.fill{transform-box:fill-box;transform-origin:left;animation:fill 8s infinite}
@keyframes fill{0%,10%{transform:scaleX(0);opacity:1;animation-timing-function:cubic-bezier(.6,0,.3,1)}42%,86%{transform:scaleX(1);opacity:1}94%,100%{transform:scaleX(1);opacity:0}}
.pop{transform-box:fill-box;transform-origin:center;animation:pop 8s infinite}
@keyframes pop{0%{transform:scale(0)}5%{transform:scale(1.25)}8%,86%{transform:scale(1)}94%,100%{transform:scale(0)}}
.act{animation:act 2s infinite}
@keyframes act{0%,100%{opacity:0}15%{opacity:.85}45%{opacity:0}}
.glow{transform-box:fill-box;transform-origin:center;animation:glow 8s 3.6s infinite}
@keyframes glow{0%{transform:scale(1);opacity:.9}12%,100%{transform:scale(2.6);opacity:0}}
"""
    return svg(W, H, "Comment je construis mes SaaS : interface en JavaScript/TypeScript, hébergée sur Vercel, "
                     "backend Supabase (Auth, Postgres, Edge Functions), paiements Stripe et IA ; chaque git push part en production.",
               bg + "".join(links) + "".join(parts) + "".join(pipe), style, defs)


# ─────────────────────────────────────────────────────────────────── parcours ──
def parcours(mode):
    p = PAL[mode]
    W, H = 1200, 330
    defs, bg = card_bg(p, W, H, ("85%", "40%"))
    ms = [
        ("2024 → 2026", "Apprenti peintre", ["en alternance,", "sur les chantiers"]),
        ("2026", "CAP Peinture", ["obtenu", "avec mention"]),
        ("JUILLET 2026", "Bâtipro en ligne", ["seul, du 1er fichier", "au paiement Stripe"]),
        ("SEPT. 2026", "MyWattUp en ligne", ["sommeil, sport,", "nutrition"]),
    ]
    ly = 128
    xs = [150 + i * 280 for i in range(4)]
    defs += f'<linearGradient id="tl" gradientUnits="userSpaceOnUse" x1="{xs[0]}" x2="{xs[-1]}" y1="0" y2="0"><stop offset="0" stop-color="{p["blue"]}"/><stop offset="1" stop-color="{p["orange"]}"/></linearGradient>'
    body = [f"""
<path class="draw" pathLength="100" d="M{xs[0]} {ly}H{xs[-1]}" stroke="url(#tl)" stroke-width="5" stroke-linecap="round"/>
<path d="M{xs[-1] + 26} {ly}H{W - 28}" stroke="{p['orange']}" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round" opacity=".6"/>
{t(W - 28, ly - 16, "la suite…", 17, p['faint'], 400, MONO, "end")}"""]
    for i, (date, title, sub) in enumerate(ms):
        x = xs[i]
        last = i == len(ms) - 1
        c = p['orange'] if last else p['blue']
        dw = len(date) * 11.5 + 30
        d0 = .3 + i * .45
        body.append(f"""
<g class="up" style="animation-delay:{d0:.2f}s">
  <rect x="{x - dw / 2:.0f}" y="{ly - 72}" width="{dw:.0f}" height="34" rx="17" fill="{c}" fill-opacity=".14"/>
  {t(x, ly - 49, date, 17, c, 700, MONO, "middle", ' letter-spacing="1"')}
</g>
<g class="pop" style="animation-delay:{d0 + .2:.2f}s">
  <circle cx="{x}" cy="{ly}" r="15" fill="{p['bg']}" stroke="{c}" stroke-width="4"/>
  <circle cx="{x}" cy="{ly}" r="6" fill="{c}"/>
</g>
{f'<circle class="ring rm" cx="{x}" cy="{ly}" r="15" fill="none" stroke="{c}" stroke-width="2"/>' if last else ''}
<g class="up" style="animation-delay:{d0 + .3:.2f}s">
  {t(x, ly + 64, title, 27, p['text'], 800, SANS, "middle")}
  {t(x, ly + 100, sub[0], 21, p['muted'], 400, SANS, "middle")}
  {t(x, ly + 128, sub[1], 21, p['muted'], 400, SANS, "middle")}
</g>""")
    style = BASE_CSS + """
.draw{stroke-dasharray:100 100;animation:draw 10s .2s infinite both}
@keyframes draw{0%{stroke-dashoffset:100;animation-timing-function:cubic-bezier(.6,0,.3,1)}22%,88%{stroke-dashoffset:0}97%,100%{stroke-dashoffset:-100}}
.pop{transform-box:fill-box;transform-origin:center;animation:pop 10s infinite}
@keyframes pop{0%{transform:scale(0)}4%{transform:scale(1.3)}6%,88%{transform:scale(1)}95%,100%{transform:scale(0)}}
.ring{transform-box:fill-box;transform-origin:center;animation:ring 2s 2.4s ease-out infinite}
@keyframes ring{from{transform:scale(1);opacity:.8}to{transform:scale(2.4);opacity:0}}
"""
    return svg(W, H, "Parcours : apprenti peintre en alternance de 2024 à 2026, CAP Peinture obtenu avec mention en 2026, "
                     "Bâtipro en ligne en juillet 2026, MyWattUp en ligne en septembre 2026.",
               bg + "".join(body), style, defs)


# ─────────────────────────────────────────────────────────────────── pied ──
def pied(mode):
    p = PAL[mode]
    W, H = 1200, 250
    # coulure de peinture le long du bord haut
    drips = [(140, 38), (310, 22), (520, 56), (700, 30), (905, 46), (1060, 26)]
    seg = f"M0 0H{W}V10"
    for x, h in sorted(drips, key=lambda d: -d[0]):
        seg += f"H{x + 13}C{x + 13} {10 + h * .5:.0f} {x + 9} {10 + h} {x} {10 + h}S{x - 13} {10 + h * .5:.0f} {x - 13} 10"
    seg += "H0z"
    drops = "".join(f'<ellipse class="drop rm" style="animation-delay:{1 + i * .9:.1f}s" cx="{x}" cy="{14 + h}" rx="6" ry="8" fill="{p["orange"]}"/>'
                    for i, (x, h) in enumerate(drips))
    body = f"""
<path class="flow" d="{seg}" fill="{p['orange']}"/>
{drops}
<g class="up" style="animation-delay:.6s">
  {t(W / 2, 170, "Préparer le support, soigner la finition.", 40, p['text'], 800, SANS, "middle", ' letter-spacing="-.6"')}
  {t(W / 2, 214, "— au chantier comme dans le code", 21, p['faint'], 400, MONO, "middle")}
</g>"""
    style = BASE_CSS + """
.flow{transform-origin:top;animation:flow 1.6s cubic-bezier(.3,0,.2,1) both}
@keyframes flow{from{transform:scaleY(.15)}to{transform:scaleY(1)}}
.drop{opacity:0;animation:drop 5.4s ease-in infinite}
@keyframes drop{0%{opacity:0;transform:translateY(0)}12%{opacity:1}75%{opacity:1}100%{opacity:0;transform:translateY(34px)}}
"""
    return svg(W, H, "Préparer le support, soigner la finition — au chantier comme dans le code.", body, style)


# ──────────────────────────────────────────────────────── avatar animé ──
def avatar(mode):
    """Avatar rond : un « O » peint au rouleau, en boucle, anneau qui tourne."""
    p = PAL[mode]
    S, c, R = 400, 200, 118
    circ = 2 * 3.14159 * R
    drips = [(-38, 34), (-6, 52), (30, 26)]
    coul = "".join(
        f'<path class="drip" style="animation-delay:{1.2 + i * 0.25:.2f}s" d="M{c + dx - 7} {c + R - 8}h14v{h - 7}a7 7 0 0 1-14 0z" fill="{p["orange"]}"/>'
        for i, (dx, h) in enumerate(drips))
    defs = f"""
  <clipPath id="rond"><circle cx="{c}" cy="{c}" r="196"/></clipPath>
  <pattern id="g" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="{p['grid']}"/></pattern>
  <radialGradient id="gl" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="{p['orange']}" stop-opacity="{p['glow']}"/><stop offset="1" stop-color="{p['orange']}" stop-opacity="0"/></radialGradient>
  <linearGradient id="an" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="{p['orange']}"/><stop offset=".5" stop-color="{p['blue']}"/><stop offset="1" stop-color="{p['orange']}" stop-opacity="0"/></linearGradient>"""
    body = f"""
<g clip-path="url(#rond)"><rect width="{S}" height="{S}" fill="{p['bg']}"/><rect width="{S}" height="{S}" fill="url(#g)"/><rect width="{S}" height="{S}" fill="url(#gl)"/>
  <g class="rm">{coul}</g>
  <circle cx="{c}" cy="{c}" r="{R}" fill="none" stroke="{p['panel2']}" stroke-width="54"/>
  <circle class="peint" cx="{c}" cy="{c}" r="{R}" fill="none" stroke="{p['orange']}" stroke-width="54" stroke-linecap="round"
    stroke-dasharray="{circ:.1f}" transform="rotate(-90 {c} {c})"/>
  <g class="roul rm"><g transform="translate({c} {c - R})">
    <path d="M0 -36V-58H34V-74" fill="none" stroke="{p['muted']}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="26" y="-96" width="16" height="26" rx="6" fill="{p['faint']}"/>
    <rect x="-16" y="-36" width="32" height="72" rx="11" fill="{p['text']}"/><rect x="-16" y="-36" width="32" height="72" rx="11" fill="{p['orange']}" fill-opacity=".45"/>
    <path d="M-8 -28V28M0 -28V28M8 -28V28" stroke="{p['orange']}" stroke-opacity=".5" stroke-width="2"/></g></g>
  {t(c, c + 12, "</>", 40, p['text'], 800, MONO, "middle")}
</g>
<circle class="anneau" cx="{c}" cy="{c}" r="193" fill="none" stroke="url(#an)" stroke-width="6"/>
<circle cx="{c}" cy="{c}" r="196" fill="none" stroke="{p['line']}" stroke-width="2"/>"""
    style = f"""
.peint{{animation:peint 8s cubic-bezier(.6,0,.3,1) infinite}}
@keyframes peint{{0%,6%{{stroke-dashoffset:{circ:.1f}}}55%,90%{{stroke-dashoffset:0;opacity:1}}97%{{opacity:0;stroke-dashoffset:0}}100%{{opacity:0;stroke-dashoffset:{circ:.1f}}}}}
.roul{{transform-origin:{c}px {c}px;animation:roul 8s cubic-bezier(.6,0,.3,1) infinite}}
@keyframes roul{{0%,6%{{transform:rotate(0);opacity:1}}55%{{transform:rotate(360deg);opacity:1}}62%,100%{{transform:rotate(360deg);opacity:0}}}}
.anneau{{transform-origin:{c}px {c}px;animation:tour 6s linear infinite}}@keyframes tour{{to{{transform:rotate(360deg)}}}}
.drip{{transform-box:fill-box;transform-origin:top;animation:drip 8s infinite}}
@keyframes drip{{0%,55%{{transform:scaleY(0)}}75%,90%{{transform:scaleY(1);opacity:1}}97%,100%{{transform:scaleY(1);opacity:0}}}}"""
    return svg(S, S, "Avatar animé d'Osman : un O peint au rouleau autour du symbole du code.", body, style, defs)


# ─────────────────────────────────────────────────── pastilles de thème ──
def pastille(tid, info):
    """Bouton de thème pour le README : aperçu des couleurs + nom."""
    p = PAL["dark"]
    W, H = 260, 92
    dots = "".join(f'<circle cx="{30 + i * 26}" cy="62" r="9" fill="{p[k]}"/>' for i, k in enumerate(["orange", "blue", "green", "text"]))
    body = f"""<rect x="1" y="1" width="{W - 2}" height="{H - 2}" rx="18" fill="{p['bg']}" stroke="{p['line']}" stroke-width="2"/>
<rect x="1" y="1" width="{W - 2}" height="{H - 2}" rx="18" fill="url(#gl)"/>
{t(22, 38, info['nom'], 22, p['text'], 800)}{dots}
<g class="pulse">{t(W - 22, 68, "choisir →", 15, p['orange'], 700, MONO, "end")}</g>"""
    defs = f'<radialGradient id="gl" cx="85%" cy="20%" r="70%"><stop offset="0" stop-color="{p["orange"]}" stop-opacity=".3"/><stop offset="1" stop-color="{p["orange"]}" stop-opacity="0"/></radialGradient>'
    return svg(W, H, f"Thème {info['nom']}", body, BASE_CSS, defs)


REACTIONS = [("feu", "🔥", "Ça claque"), ("bravo", "👏", "Bravo"), ("wow", "🤯", "Impressionnant"),
             ("idee", "💡", "Inspirant"), ("peinture", "🎨", "Beau boulot")]


def bouton_reaction(rid, emoji, nom, mode="dark"):
    """Bouton cliquable du README : un emoji qui sautille, comme un pot de peinture."""
    p = PAL[mode]
    W, H = 132, 132
    body = f"""<rect x="1" y="1" width="{W - 2}" height="{H - 2}" rx="30" fill="{p['panel']}" stroke="{p['line']}" stroke-width="2"/>
<rect x="1" y="1" width="{W - 2}" height="{H - 2}" rx="30" fill="url(#gl)"/>
<g transform="translate(66 74)"><g class="hop"><text font-family="'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif" font-size="52" text-anchor="middle">{emoji}</text></g></g>
{t(66, 112, nom, 14, p['muted'], 700, SANS, "middle")}"""
    defs = f'<radialGradient id="gl" cx="50%" cy="30%" r="70%"><stop offset="0" stop-color="{p["orange"]}" stop-opacity=".22"/><stop offset="1" stop-color="{p["orange"]}" stop-opacity="0"/></radialGradient>'
    style = BASE_CSS + """.hop{animation:hop 3s cubic-bezier(.3,1.6,.5,1) infinite}
@keyframes hop{0%,75%,100%{transform:none}82%{transform:translateY(-8px) rotate(-8deg) scale(1.12)}90%{transform:rotate(5deg)}}"""
    return svg(W, H, f"Réagir : {nom}", body, style, defs)


# ───────────────────────────────── variantes par thème (servies par serveur/) ──
THEMES_JSON = os.path.join(ROOT, "serveur", "lib", "themes.json")
THEMES_OUT = os.path.join(ROOT, "serveur", "themes")


def ecrit_themes(titres):
    """Toutes les images, pour chaque thème : le serveur redirige vers le thème choisi."""
    import copy
    import json
    with open(THEMES_JSON, encoding="utf-8") as f:
        cfg = json.load(f)
    base = copy.deepcopy(PAL)
    n = 0
    for tid in cfg["ordre"]:
        info = cfg["themes"][tid]
        for mode in base:
            PAL[mode] = {**base[mode], **{k: v for k, v in info[mode].items() if k in base[mode]}}
        dossier = os.path.join(THEMES_OUT, tid)
        os.makedirs(dossier, exist_ok=True)
        files = {}
        for mode in base:
            files[f"hero-{mode}.svg"] = hero(mode)
            for num, title, com in titres:
                files[f"titre-{num}-{mode}.svg"] = titre(mode, num, title, com)
            files[f"projet-batipro-{mode}.svg"] = projet(mode, "batipro")
            files[f"projet-mywattup-{mode}.svg"] = projet(mode, "mywattup", flip=True)
            files[f"archi-{mode}.svg"] = archi(mode)
            files[f"parcours-{mode}.svg"] = parcours(mode)
            files[f"pied-{mode}.svg"] = pied(mode)
            files[f"avatar-{mode}.svg"] = avatar(mode)
            for rid, emoji, nom in REACTIONS:
                files[f"reaction-{rid}-{mode}.svg"] = bouton_reaction(rid, emoji, nom, mode)
        with open(os.path.join(OUT, f"theme-{tid}.svg"), "w", encoding="utf-8") as f:
            f.write(pastille(tid, info))
        for name, content in files.items():
            with open(os.path.join(dossier, name), "w", encoding="utf-8") as f:
                f.write(content)
        n += len(files)
    for mode in base:
        PAL[mode] = base[mode]
    print(f"{n} images de thème écrites dans {THEMES_OUT}")


def main():
    os.makedirs(OUT, exist_ok=True)
    titres = [("01", "Ce que j'ai mis en ligne", "// en production"),
              ("02", "Comment je construis", "// sous le capot"),
              ("03", "D'où je viens", "// du chantier au code"),
              ("04", "Activité", "// données réelles"),
              ("05", "Laisse ta trace", "// mur interactif"),
              ("06", "On en parle ?", "// réponse rapide")]
    files = {}
    for mode in PAL:
        files[f"hero-{mode}.svg"] = hero(mode)
        for num, title, com in titres:
            files[f"titre-{num}-{mode}.svg"] = titre(mode, num, title, com)
        files[f"projet-batipro-{mode}.svg"] = projet(mode, "batipro")
        files[f"projet-mywattup-{mode}.svg"] = projet(mode, "mywattup", flip=True)
        files[f"archi-{mode}.svg"] = archi(mode)
        files[f"parcours-{mode}.svg"] = parcours(mode)
        files[f"pied-{mode}.svg"] = pied(mode)
        files[f"avatar-{mode}.svg"] = avatar(mode)
    for rid, emoji, nom in REACTIONS:
        files[f"reaction-{rid}.svg"] = bouton_reaction(rid, emoji, nom)
    for name, content in files.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            f.write(content)
    ecrit_themes(titres)
    from mur import ecrit_pots
    ecrit_pots(OUT)
    print(f"{len(files)} fichiers écrits dans {OUT} (+ pots de peinture)")


if __name__ == "__main__":
    main()
