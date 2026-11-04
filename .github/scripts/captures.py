"""Prend de vraies captures de Bâtipro et MyWattUp avec un navigateur sans écran.

Pour chaque site :
  assets/captures/<id>-scroll.jpg  page d'accueil (bureau 1280 px), haute, pour l'animation de défilement
  assets/captures/<id>-mobile.jpg  même page sur un téléphone, en thème sombre

Si un site ne répond pas, l'ancienne capture est gardée telle quelle.
Usage : python3 captures.py   (nécessite `pip install playwright pillow` et `playwright install chromium`)
"""
import io
import os
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "assets", "captures")

SITES = {
    "batipro": "https://batipro-ten.vercel.app/",
    "mywattup": "https://my-watt-up.vercel.app/",
}

BUREAU = dict(viewport={"width": 1280, "height": 800}, device_scale_factor=1, color_scheme="light")
MOBILE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
              color_scheme="dark",
              user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
                         "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")

HAUT_BUREAU = 2400   # px CSS gardés en haut de page pour le défilement
HAUT_MOBILE = 1700


def charge(page, url):
    page.goto(url, wait_until="networkidle", timeout=45000)
    page.wait_for_timeout(1500)
    # descend doucement pour déclencher les contenus chargés au défilement, puis remonte
    for y in range(0, 4000, 400):
        page.evaluate(f"window.scrollTo(0, {y})")
        page.wait_for_timeout(120)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(900)
    # coupe les animations pour une image nette
    page.add_style_tag(content="*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}")


def prise(page, haut):
    total = page.evaluate("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)")
    h = min(haut, total)
    png = page.screenshot(full_page=True, clip={"x": 0, "y": 0, "width": page.viewport_size["width"], "height": h})
    return Image.open(io.BytesIO(png)).convert("RGB")


def enregistre(im, nom, largeur, qualite):
    if im.width != largeur:
        im = im.resize((largeur, round(im.height * largeur / im.width)), Image.LANCZOS)
    chemin = os.path.join(OUT, nom)
    im.save(chemin, "JPEG", quality=qualite, optimize=True, progressive=True)
    print(f"  {nom} {im.width}×{im.height} {os.path.getsize(chemin) // 1024} Ko")


def main():
    os.makedirs(OUT, exist_ok=True)
    erreurs = 0
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        for cle, url in SITES.items():
            print(cle, url)
            for nom, opts, haut, largeur, q in (
                (f"{cle}-scroll.jpg", BUREAU, HAUT_BUREAU, 960, 74),
                (f"{cle}-mobile.jpg", MOBILE, HAUT_MOBILE, 360, 76),
            ):
                ctx = nav.new_context(locale="fr-FR", **opts)
                page = ctx.new_page()
                try:
                    charge(page, url)
                    enregistre(prise(page, haut), nom, largeur, q)
                except Exception as e:  # site en panne : on garde l'ancienne image
                    erreurs += 1
                    print(f"  ! {nom} non mis à jour : {e}", file=sys.stderr)
                finally:
                    ctx.close()
        nav.close()
    return 1 if erreurs == 2 * len(SITES) else 0


if __name__ == "__main__":
    sys.exit(main())
