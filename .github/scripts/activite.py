"""Génère la carte « Activité » du profil à partir des vraies données GitHub.

Lancé chaque nuit par .github/workflows/activite.yml.
Variables d'environnement :
  GH_TOKEN   token GitHub (STATS_TOKEN si défini, sinon GITHUB_TOKEN)
  GH_LOGIN   identifiant GitHub (par défaut : mmr45)
Usage : python activite.py <dossier_de_sortie>
        python activite.py <dossier_de_sortie> --donnees fichier.json   (rendu hors ligne)
"""
import datetime as dt
import json
import os
import sys
import urllib.request

LOGIN = os.environ.get("GH_LOGIN", "mmr45")
SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Inter, Arial, sans-serif"
MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', 'DejaVu Sans Mono', Menlo, monospace"

PAL = {
    "dark": dict(bg="#0B1220", line="#22304D", grid="#1A2742", text="#EEF3FA", muted="#8A9BB8",
                 faint="#5C6E8F", orange="#FF6A13", blue="#4A92FF", track="#17223A",
                 levels=["#161F33", "#163A66", "#1D5FA3", "#4A92FF", "#FF6A13"]),
    "light": dict(bg="#F7F4EE", line="#E3DCCF", grid="#E9E3D8", text="#14213D", muted="#5B6B85",
                  faint="#97A3B6", orange="#F0600F", blue="#1D5FA3", track="#ECE6DA",
                  levels=["#ECE6DA", "#C6D8F0", "#7FA8DA", "#1D5FA3", "#F0600F"]),
}

QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      nodes {
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges { size node { name color } }
        }
      }
    }
  }
}
"""


def fetch():
    token = os.environ["GH_TOKEN"]
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps({"query": QUERY, "variables": {"login": LOGIN}}).encode(),
        headers={"Authorization": f"bearer {token}", "Content-Type": "application/json",
                 "User-Agent": "mmr45-profil"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        payload = json.load(r)
    if payload.get("errors"):
        raise SystemExit(f"Erreur GraphQL : {payload['errors']}")
    return payload["data"]["user"]


def analyse(user):
    cc = user["contributionsCollection"]
    days = [d for w in cc["contributionCalendar"]["weeks"] for d in w["contributionDays"]]
    days.sort(key=lambda d: d["date"])
    counts = [d["contributionCount"] for d in days]

    longest = run = 0
    for c in counts:
        run = run + 1 if c > 0 else 0
        longest = max(longest, run)
    current = 0
    i = len(counts) - 1
    if i >= 0 and counts[i] == 0:      # la journée en cours n'est pas encore finie
        i -= 1
    while i >= 0 and counts[i] > 0:
        current += 1
        i -= 1

    langs = {}
    for repo in user["repositories"]["nodes"]:
        for e in repo["languages"]["edges"]:
            n = e["node"]
            cur = langs.setdefault(n["name"], {"size": 0, "color": n["color"] or "#8A9BB8"})
            cur["size"] += e["size"]
    total = sum(v["size"] for v in langs.values()) or 1
    ranked = sorted(langs.items(), key=lambda kv: -kv[1]["size"])
    top = [(k, v["color"], v["size"] / total) for k, v in ranked[:5]]
    rest = 1 - sum(t[2] for t in top)
    if rest > 0.005:
        top.append(("Autres", None, rest))

    return dict(
        total=cc["contributionCalendar"]["totalContributions"],
        commits=cc["totalCommitContributions"] + cc["restrictedContributionsCount"],
        prs=cc["totalPullRequestContributions"],
        current=current, longest=longest,
        days=last_weeks(days, 30),
        langs=top if langs else [],
    )


def last_weeks(days, n):
    """Garde les n dernières semaines complètes (dimanche → samedi), semaine en cours comprise."""
    if not days:
        return []
    idx = dt.date.fromisoformat(days[-1]["date"]).isoweekday() % 7   # dimanche = 0
    return days[-(7 * (n - 1) + idx + 1):]


def level(c, mx):
    if c == 0:
        return 0
    r = c / mx
    return 1 if r <= .25 else 2 if r <= .5 else 3 if r <= .8 else 4


def fmt(n):
    return f"{n:,}".replace(",", " ")


def render(stats, mode, today):
    p = PAL[mode]
    days = stats["days"]
    mx = max([d["contributionCount"] for d in days] or [1]) or 1
    # grille : colonnes = semaines (dimanche → samedi), comme sur GitHub
    cells, months = [], []
    x0, y0, step, size = 640, 92, 17, 13
    first = dt.date.fromisoformat(days[0]["date"]) if days else today
    offset = first.isoweekday() % 7
    last_month = None
    for k, d in enumerate(days):
        idx = k + offset
        col, row = idx // 7, idx % 7
        date = dt.date.fromisoformat(d["date"])
        if date.month != last_month and row <= 1 and col < 29:
            months.append((x0 + col * step, ["janv", "févr", "mars", "avr", "mai", "juin", "juil",
                                             "août", "sept", "oct", "nov", "déc"][date.month - 1]))
            last_month = date.month
        lv = level(d["contributionCount"], mx)
        cells.append(f'<rect class="c" style="animation-delay:{0.4 + col * 0.035 + row * 0.02:.2f}s" '
                     f'x="{x0 + col * step}" y="{y0 + row * step}" width="{size}" height="{size}" rx="3" fill="{p["levels"][lv]}">'
                     f'<title>{d["date"]} : {d["contributionCount"]} contribution(s)</title></rect>')
    month_svg = "".join(
        f'<text x="{x}" y="{y0 - 12}" font-family="{MONO}" font-size="12" fill="{p["faint"]}">{m}</text>'
        for x, m in months)
    legend = "".join(f'<rect x="{1030 + i * 17}" y="230" width="13" height="13" rx="3" fill="{c}"/>'
                     for i, c in enumerate(p["levels"]))

    # barre des langages
    langs_svg = ""
    if stats["langs"]:
        x, segs, leg = 48, [], []
        W = 1104
        lx = 48
        for i, (name, color, share) in enumerate(stats["langs"]):
            w = W * share
            col = color or p["faint"]
            segs.append(f'<rect x="{x:.1f}" y="292" width="{max(w - 3, 2):.1f}" height="12" fill="{col}"/>')
            label = f"{name} {share * 100:.0f} %"
            leg.append(f'<circle cx="{lx + 5}" cy="333" r="5" fill="{col}"/>'
                       f'<text x="{lx + 16}" y="338" font-family="{SANS}" font-size="15" fill="{p["muted"]}">{label}</text>')
            lx += 30 + len(label) * 8.2
            x += w
        langs_svg = f"""
  <text x="48" y="276" font-family="{MONO}" font-size="12.5" fill="{p['faint']}" letter-spacing="1">LANGAGES</text>
  <clipPath id="bar"><rect x="48" y="292" width="1104" height="12" rx="6"/></clipPath>
  <rect x="48" y="292" width="1104" height="12" rx="6" fill="{p['track']}"/>
  <g clip-path="url(#bar)"><g class="grow">{''.join(segs)}</g></g>
  <g class="up" style="animation-delay:1.4s">{''.join(leg)}</g>"""

    H = 370 if stats["langs"] else 290
    big = [("Série actuelle", f"{stats['current']} j"), ("Meilleure série", f"{stats['longest']} j"),
           ("Commits", fmt(stats["commits"])), ("Pull requests", fmt(stats["prs"]))]
    kpis = "".join(
        f'<g class="up" style="animation-delay:{0.35 + i * 0.1:.2f}s">'
        f'<text x="{48 + i * 140}" y="226" font-family="{SANS}" font-size="26" font-weight="800" fill="{p["text"]}">{v}</text>'
        f'<text x="{48 + i * 140}" y="248" font-family="{SANS}" font-size="13.5" fill="{p["muted"]}">{k}</text></g>'
        for i, (k, v) in enumerate(big))
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{H}" viewBox="0 0 1200 {H}" role="img" aria-label="Activité GitHub : {stats['total']} contributions sur 12 mois, série actuelle de {stats['current']} jours, meilleure série de {stats['longest']} jours.">
  <title>Activité GitHub</title>
  <defs>
    <pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="{p['grid']}"/></pattern>
    <linearGradient id="fade" x1="1" x2="0"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="m"><rect width="1200" height="{H}" fill="url(#fade)"/></mask>
    <clipPath id="card"><rect width="1200" height="{H}" rx="20"/></clipPath>
  </defs>
  <style>
    .c{{transform-box:fill-box;transform-origin:center;animation:c .45s cubic-bezier(.3,1.5,.5,1) both}}
    @keyframes c{{from{{transform:scale(0);opacity:0}}to{{transform:scale(1);opacity:1}}}}
    .up{{animation:up .7s cubic-bezier(.2,.8,.2,1) both}}
    @keyframes up{{from{{opacity:0;transform:translateY(10px)}}to{{opacity:1;transform:none}}}}
    .grow{{transform-box:view-box;transform-origin:48px 0;animation:grow 1.2s .9s cubic-bezier(.6,0,.2,1) both}}
    @keyframes grow{{from{{transform:scaleX(0)}}to{{transform:scaleX(1)}}}}
    .live{{animation:live 2s ease-in-out infinite}}
    @keyframes live{{50%{{opacity:.3}}}}
    @media (prefers-reduced-motion: reduce){{*{{animation:none!important}}}}
  </style>
  <g clip-path="url(#card)">
    <rect width="1200" height="{H}" fill="{p['bg']}"/>
    <rect width="1200" height="{H}" fill="url(#g)" mask="url(#m)"/>
  </g>
  <rect x=".5" y=".5" width="1199" height="{H - 1}" rx="19.5" fill="none" stroke="{p['line']}"/>

  <g class="up">
    <circle class="live" cx="54" cy="58" r="4" fill="{p['orange']}"/>
    <text x="66" y="63" font-family="{MONO}" font-size="13" fill="{p['faint']}" letter-spacing="1">ACTIVITÉ · 12 DERNIERS MOIS</text>
    <text x="44" y="152" font-family="{SANS}" font-size="88" font-weight="800" fill="{p['text']}" letter-spacing="-3">{fmt(stats['total'])}</text>
    <text x="48" y="182" font-family="{SANS}" font-size="17" fill="{p['muted']}">contributions, projets privés compris</text>
  </g>
  {kpis}
  {month_svg}
  {''.join(cells)}
  <text x="1024" y="241" text-anchor="end" font-family="{MONO}" font-size="11.5" fill="{p['faint']}">moins</text>
  {legend}
  <text x="1120" y="241" font-family="{MONO}" font-size="11.5" fill="{p['faint']}">plus</text>
  {langs_svg}
  <text x="1152" y="63" text-anchor="end" font-family="{MONO}" font-size="12" fill="{p['faint']}">mis à jour le {today.strftime('%d/%m/%Y')}</text>
</svg>
"""


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "out"
    if "--donnees" in sys.argv:
        user = json.load(open(sys.argv[sys.argv.index("--donnees") + 1]))
    else:
        user = fetch()
    stats = analyse(user)
    os.makedirs(out, exist_ok=True)
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=1))).date()
    for mode in PAL:
        with open(os.path.join(out, f"activite-{mode}.svg"), "w", encoding="utf-8") as f:
            f.write(render(stats, mode, today))
    print(json.dumps({k: v for k, v in stats.items() if k != "days"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
