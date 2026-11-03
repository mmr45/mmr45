"""Carte « En direct » du profil : vraie surveillance des deux SaaS.

Lancé toutes les 30 minutes par .github/workflows/live.yml :
    python3 live.py <dossier>             mesure, met à jour l'historique, redessine
    python3 live.py <dossier> --hors-ligne redessine depuis l'historique existant

Mesure réelle : une requête HTTP GET sur chaque site (code + temps de réponse).
Historique gardé dans <dossier>/historique.json (48 dernières mesures = 24 h).
Dernier commit public lu sur l'API GitHub (événements publics uniquement).
"""
import datetime as dt
import json
import math
import os
import sys
import time
import urllib.request
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from profil import BASE_CSS, MONO, PAL, SANS, card_bg, esc, svg, t  # noqa: E402

SITES = {
    "batipro": ("Bâtipro", "https://batipro-ten.vercel.app"),
    "mywattup": ("MyWattUp", "https://my-watt-up.vercel.app"),
}
LOGIN = os.environ.get("GH_LOGIN", "mmr45")
GARDE = 48
PARIS = ZoneInfo("Europe/Paris")
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]


# ───────────────────────────────────────────────────────────────── mesures ──
def ping(url):
    t0 = time.perf_counter()
    code = 0
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "mmr45-profil-monitor"})
        with urllib.request.urlopen(req, timeout=15) as r:
            r.read(2048)
            code = r.status
    except urllib.error.HTTPError as e:
        code = e.code
    except Exception:
        code = 0
    ms = round((time.perf_counter() - t0) * 1000)
    return {"ok": 200 <= code < 400, "code": code, "ms": ms}


def dernier_commit():
    token = os.environ.get("GH_TOKEN")
    headers = {"User-Agent": "mmr45-profil", "Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        req = urllib.request.Request(f"https://api.github.com/users/{LOGIN}/events/public?per_page=50", headers=headers)
        with urllib.request.urlopen(req, timeout=20) as r:
            events = json.load(r)
    except Exception:
        return None
    for ev in events:
        if ev.get("type") != "PushEvent":
            continue
        commits = ev.get("payload", {}).get("commits") or []
        msg = commits[-1]["message"].splitlines()[0] if commits else ""
        if not msg:
            continue
        return {"repo": ev["repo"]["name"], "msg": msg, "le": ev["created_at"]}
    return None


# ──────────────────────────────────────────────────────────────────── rendu ──
def relatif(iso, maintenant):
    d = maintenant - dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    m = int(d.total_seconds() // 60)
    if m < 60:
        return f"il y a {max(m, 1)} min"
    h = m // 60
    if h < 24:
        return f"il y a {h} h"
    j = h // 24
    return f"il y a {j} jour{'s' if j > 1 else ''}"


def ciel(p, mode, heure, x, y, w, h):
    """Panneau ciel : jour, aube/crépuscule ou nuit selon l'heure de Paris."""
    if 7 <= heure < 18:
        moment, haut, bas = "jour", ("#4A92FF", "#BFDBFF"), True
    elif heure in (6, 18, 19, 20):
        moment, haut, bas = "aube" if heure == 6 else "soir", ("#3B2A5C", "#FF8A4C"), True
    else:
        moment, haut, bas = "nuit", ("#070C18", "#1A2742"), False
    defs = f"""<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{haut[0]}"/><stop offset="1" stop-color="{haut[1]}"/></linearGradient>
  <clipPath id="skyc"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16"/></clipPath>"""
    astre_x = x + w * (0.2 + 0.68 * ((heure - 6) % 12) / 12)
    astre_y = y + 150 + 34 * abs(((heure - 6) % 12) - 6) / 6
    parts = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#sky)"/>']
    if moment == "nuit":
        import random
        rnd = random.Random(heure)
        for i in range(26):
            sx, sy = x + rnd.random() * w, y + (12 if rnd.random() < .4 else 120) + rnd.random() * 60
            parts.append(f'<circle class="star" style="animation-delay:{rnd.random() * 3:.2f}s" cx="{sx:.0f}" cy="{sy:.0f}" r="{rnd.choice([1, 1.3, 1.8])}" fill="#fff"/>')
        parts.append(f'<circle cx="{astre_x:.0f}" cy="{astre_y:.0f}" r="20" fill="#F2EAD3"/>'
                     f'<circle cx="{astre_x + 9:.0f}" cy="{astre_y - 6:.0f}" r="18" fill="{haut[0]}"/>')
    else:
        rays = "".join(f'<rect x="-2" y="-40" width="4" height="12" rx="2" fill="#FFD36B" transform="rotate({a})"/>' for a in range(0, 360, 30))
        parts.append(f'<g transform="translate({astre_x:.0f} {astre_y:.0f})"><g class="spin">{rays}</g><circle r="20" fill="#FFD36B"/></g>')
        parts.append(f'<g class="cloud"><ellipse cx="{x + 60}" cy="{y + 50}" rx="30" ry="10" fill="#fff" fill-opacity=".7"/>'
                     f'<ellipse cx="{x + 80}" cy="{y + 44}" rx="20" ry="11" fill="#fff" fill-opacity=".7"/></g>')
    # immeuble en chantier avec échafaudage ; fenêtres allumées la nuit
    by = y + h - 120
    bat = "#0B1220" if not bas else "#22304D"
    parts.append(f'<rect x="{x + 40}" y="{by}" width="110" height="120" fill="{bat}"/>'
                 f'<rect x="{x + 170}" y="{by + 36}" width="90" height="84" fill="{bat}"/>'
                 f'<path d="M{x + 150} {by - 6}V{y + h}M{x + 170} {by - 6}V{y + h}M{x + 150} {by + 30}H{x + 170}M{x + 150} {by + 70}H{x + 170}" stroke="{p["orange"]}" stroke-width="3"/>')
    import random
    rnd = random.Random(7)
    for r in range(4):
        for c in range(3):
            on = (not bas) and rnd.random() < .45
            fill = "#FFD36B" if on else ("#2B3A57" if not bas else "#3A4A6A")
            cls = ' class="win"' if on else ""
            parts.append(f'<rect{cls} style="animation-delay:{rnd.random() * 4:.1f}s" x="{x + 56 + c * 30}" y="{by + 14 + r * 26}" width="16" height="14" rx="2" fill="{fill}"/>')
    body = f'<g clip-path="url(#skyc)">{"".join(parts)}</g><rect x="{x + .5}" y="{y + .5}" width="{w - 1}" height="{h - 1}" rx="16" fill="none" stroke="{p["line"]}"/>'
    return defs, body, moment


def sparkline(p, pts, x, y, w, h, color, gid):
    if not pts:
        return "", ""
    vals = [q["ms"] if q["ok"] else None for q in pts]
    ok_vals = [v for v in vals if v is not None] or [1]
    hi = max(max(ok_vals) * 1.15, 200)
    n = max(len(pts), 2)
    coords = []
    for i, v in enumerate(vals):
        cx = x + w * i / (n - 1)
        cy = y + h - (h * (v or 0) / hi if v is not None else 0)
        coords.append((cx, cy))
    line = "M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in coords)
    area = line + f" L{coords[-1][0]:.1f} {y + h} L{coords[0][0]:.1f} {y + h}Z"
    down = "".join(f'<rect x="{coords[i][0] - 2:.1f}" y="{y}" width="4" height="{h}" fill="#F85149" fill-opacity=".5"/>'
                   for i, v in enumerate(vals) if v is None)
    defs = (f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{color}" stop-opacity=".35"/>'
            f'<stop offset="1" stop-color="{color}" stop-opacity="0"/></linearGradient>')
    ex, ey = coords[-1]
    body = f"""
<path d="{area}" fill="url(#{gid})" class="fade"/>
{down}
<path class="trace" pathLength="100" d="{line}" fill="none" stroke="{color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
<circle class="ping rm" cx="{ex:.1f}" cy="{ey:.1f}" r="5" fill="none" stroke="{color}" stroke-width="2"/>
<circle cx="{ex:.1f}" cy="{ey:.1f}" r="4.5" fill="{color}"/>"""
    return defs, body


def rendu(hist, commit, maintenant, mode):
    p = PAL[mode]
    W, H = 1200, 480
    defs, bg = card_bg(p, W, H, ("70%", "30%"))
    paris = maintenant.astimezone(PARIS)
    cd, cb, moment = ciel(p, mode, paris.hour, 32, 84, 330, 300)
    defs += cd
    clock = f"""
<g class="up">
  <text x="56" y="152" font-family="{SANS}" font-size="64" font-weight="800" fill="#fff" letter-spacing="-2">{paris:%H:%M}</text>
  {t(58, 182, f"Paris · {JOURS[paris.weekday()]} · {moment}", 19, "#fff", 600, MONO).replace('fill="#fff"', 'fill="#fff" fill-opacity=".85"')}
</g>"""
    rows = []
    rx, rw = 394, W - 394 - 32
    for i, (key, (nom, url)) in enumerate(SITES.items()):
        pts = hist.get(key, [])
        last = pts[-1] if pts else {"ok": False, "code": 0, "ms": 0}
        up = sum(1 for q in pts if q["ok"]) / len(pts) * 100 if pts else 0
        oks = [q["ms"] for q in pts if q["ok"]]
        moy = round(sum(oks) / len(oks)) if oks else 0
        ok = last["ok"]
        col = p["green"] if ok else "#F85149"
        y = 84 + i * 156
        sd, sb = sparkline(p, pts, rx + 330, y + 30, rw - 360, 96, p["orange"] if i == 0 else p["blue"], f"sp{i}")
        defs += sd
        etat = "opérationnel" if ok else ("hors ligne" if last["code"] == 0 else f"erreur {last['code']}")
        if not pts:
            etat, col = "première mesure à venir", p["faint"]
        rows.append(f"""
<g class="up" style="animation-delay:{.2 + i * .2:.1f}s">
  <rect x="{rx}" y="{y}" width="{rw}" height="142" rx="16" fill="{p['panel']}" stroke="{p['line']}"/>
  {t(rx + 24, y + 46, nom, 30, p['text'], 800, extra=' letter-spacing="-.5"')}
  <circle class="pulse" cx="{rx + 32}" cy="{y + 74}" r="6" fill="{col}"/>
  {t(rx + 46, y + 80, etat, 17, col, 700, MONO)}
  <text x="{rx + 24}" y="{y + 122}" font-family="{SANS}" font-size="34" font-weight="800" fill="{p['text']}">{last['ms'] if ok else '—'}<tspan font-size="18" fill="{p['muted']}" font-weight="400"> ms</tspan></text>
  {t(rx + rw - 22, y + 24, f"dispo {up:.1f} % · moy. {moy} ms · 24 h".replace('.', ','), 15, p['faint'], 400, MONO, "end")}
  {sb}
</g>""")
    if commit:
        msg = commit["msg"] if len(commit["msg"]) <= 58 else commit["msg"][:56] + "…"
        bas = (f'<tspan fill="{p["faint"]}">dernier commit public · </tspan><tspan fill="{p["blue"]}">{esc(commit["repo"])}</tspan>'
               f'<tspan fill="{p["text"]}"> « {esc(msg)} »</tspan><tspan fill="{p["faint"]}"> · {relatif(commit["le"], maintenant)}</tspan>')
    else:
        bas = f'<tspan fill="{p["faint"]}">dernier commit public : aucun récemment</tspan>'
    body = f"""
<g class="up">
  <rect x="32" y="30" width="134" height="30" rx="15" fill="#F85149" fill-opacity=".14"/>
  <circle class="pulse" cx="50" cy="45" r="6" fill="#F85149"/>
  {t(62, 51, "EN DIRECT", 15, "#F85149", 800, MONO, extra=' letter-spacing="1.5"')}
  {t(182, 51, "salle des machines", 17, p['muted'], 400, MONO)}
  {t(W - 32, 51, f"mesuré le {paris:%d/%m à %H:%M} · toutes les 30 min", 15, p['faint'], 400, MONO, "end")}
</g>
{cb}
{clock}
{''.join(rows)}
<g class="up" style="animation-delay:.7s"><text x="32" y="{H - 34}" font-family="{MONO}" font-size="17">{bas}</text></g>"""
    style = BASE_CSS + """
.star{animation:tw 3s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
.spin{animation:spin 24s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.cloud{animation:cloud 30s linear infinite}
@keyframes cloud{from{transform:translateX(-120px)}to{transform:translateX(380px)}}
.win{animation:win 6s steps(1) infinite}
@keyframes win{0%,70%{opacity:1}85%{opacity:.35}}
.trace{stroke-dasharray:100 100;animation:trace 10s infinite}
@keyframes trace{0%{stroke-dashoffset:100;animation-timing-function:cubic-bezier(.6,0,.3,1)}25%,100%{stroke-dashoffset:0}}
.ping{transform-box:fill-box;transform-origin:center;animation:ping 2s ease-out infinite}
@keyframes ping{from{transform:scale(1);opacity:.9}to{transform:scale(3.2);opacity:0}}
"""
    label = (f"En direct : il est {paris:%H:%M} à Paris. "
             + " ; ".join(f"{nom} {'en ligne' if hist.get(k) and hist[k][-1]['ok'] else 'hors ligne'}"
                          + (f", {hist[k][-1]['ms']} ms" if hist.get(k) and hist[k][-1]['ok'] else "")
                          for k, (nom, _) in SITES.items()) + ".")
    return svg(W, H, label, bg + body, style, defs)


def main():
    dossier = sys.argv[1]
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, "historique.json")
    try:
        hist = json.load(open(chemin, encoding="utf-8"))
    except FileNotFoundError:
        hist = {}
    maintenant = dt.datetime.now(dt.timezone.utc)
    commit = hist.get("_commit")
    if "--hors-ligne" not in sys.argv:
        for key, (_, url) in SITES.items():
            m = ping(url)
            m["t"] = maintenant.isoformat(timespec="seconds")
            hist.setdefault(key, []).append(m)
            hist[key] = hist[key][-GARDE:]
        commit = dernier_commit() or commit
        hist["_commit"] = commit
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(hist, f, ensure_ascii=False, indent=1)
    for mode in PAL:
        with open(os.path.join(dossier, f"live-{mode}.svg"), "w", encoding="utf-8") as f:
            f.write(rendu(hist, commit, maintenant, mode))
    print(json.dumps({k: v[-1] for k, v in hist.items() if k in SITES}, ensure_ascii=False))


if __name__ == "__main__":
    main()
