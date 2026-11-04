// GET /img/<nom>.svg?mode=dark|light&lang=fr|en : sert directement l'image du thème choisi par les visiteurs.
// Pas de redirection : le proxy d'images de GitHub (camo) suit les redirections puis met en cache
// la cible avec ses propres en-têtes (figée un an), ce qui bloquait le changement de thème.
// Ici la réponse elle-même n'est jamais mise en cache, comme le compteur de visites.
// « stats », « ville », « rouleau » et « feuille » sont dessinées à la volée à partir des vraies données GitHub ;
// « succes » aussi, « partage.png » est l'image de partage (og:image) du thème actif.
import { themeActuel, THEMES } from '../lib/theme.js';
import { donneesGitHub } from '../lib/github.js';
import { renderStats, renderVille, renderRouleau } from '../lib/gh-cartes.js';
import { renderSucces, renderFeuille } from '../lib/extras.js';
import { stats as statsVues } from '../lib/vues.js';
import { charge as chargeMur, chargeMemo } from '../lib/etat.js';
import { renderPixel, CASES } from '../lib/rendu.js';
import { litReactions } from '../lib/reactions.js';
import { gabaritTheme, recoloreSvg } from '../lib/theme-images.js';

const NOMS = new Set(['hero', 'archi', 'parcours', 'pied', 'projet-batipro', 'projet-mywattup',
  'titre-01', 'titre-02', 'titre-03', 'titre-04', 'titre-05', 'titre-06',
  'reaction-feu', 'reaction-bravo', 'reaction-wow', 'reaction-idee', 'reaction-peinture']);
const DYN = { stats: renderStats, ville: renderVille, rouleau: renderRouleau, feuille: renderFeuille };
const rien = (e) => { console.error('[img]', e); return null; };

// chiffres des succès : stats GitHub + compteurs du profil (visites, mur, réactions)
async function chiffresSucces() {
  const [d, v, mur, re] = await Promise.all([donneesGitHub().catch(rien), statsVues().catch(rien), chargeMur().catch(rien), litReactions().catch(rien)]);
  return { saas: 2, commits: d?.commits, total: d?.total, prs: d?.prs, record: d?.record, visites: v?.total, mur: mur?.total, reactions: re?.total };
}
const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'local').slice(0, 10);

// captures des sites, insérées dans les cartes projet (une seule copie au lieu d'une par thème)
const captures = new Map();
async function capture(host, fichier) {
  if (!captures.has(fichier)) {
    captures.set(fichier, fetch(`https://${host}/themes/captures/${fichier}?v=${VERSION}`, { signal: AbortSignal.timeout(5000) })
      .then((r) => { if (!r.ok) throw new Error(`capture ${r.status}`); return r.arrayBuffer(); })
      .then((b) => `data:image/jpeg;base64,${Buffer.from(b).toString('base64')}`)
      .catch((e) => { captures.delete(fichier); throw e; }));
  }
  return captures.get(fichier);
}

export default async function handler(req, res) {
  const nom = String(req.query.n || '').replace(/\.svg$/, '');
  const mode = req.query.mode === 'light' ? 'light' : 'dark';
  const lang = req.query.lang === 'en' ? 'en' : 'fr';
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Expires', '0');
  // les 144 cases de la fresque : sans thème, une lecture de Blob partagée, courte mise en cache CDN
  const px = /^px-(\d+)$/.exec(nom);
  if (px && Number(px[1]) < CASES) {
    const etat = await chargeMemo().catch(() => ({ cases: [] }));
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=5, stale-while-revalidate=86400'); // toujours une version prête, même après une longue pause
    return res.status(200).send(renderPixel(etat, Number(px[1])));
  }
  const apercu = String(req.query.apercu || '');
  const theme = Object.hasOwn(THEMES, apercu) ? apercu : await themeActuel().catch(() => 'chantier');
  res.setHeader('X-Theme', theme);
  if (nom === 'partage.png') {
    // image de partage (og:image) du thème actif, en PNG pour X, Discord, WhatsApp…
    const r = await fetch(`https://${req.headers.host}/themes/${gabaritTheme(theme)}/partage.png?v=${VERSION}`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!r?.ok) return res.status(503).send('image momentanément indisponible');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=300');
    return res.status(200).send(Buffer.from(await r.arrayBuffer()));
  }
  if (nom === 'succes') {
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    return res.status(200).send(renderSucces(await chiffresSucces(), mode, theme, lang));
  }
  if (DYN[nom]) {
    const d = await donneesGitHub().catch((e) => { console.error('[img] github', e); return null; });
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    return res.status(200).send(DYN[nom](d, mode, theme, lang, new Date()));
  }
  if (!NOMS.has(nom)) return res.status(404).send('image inconnue');
  const chemin = `/themes/${gabaritTheme(theme)}/${lang === 'en' ? 'en/' : ''}${nom}-${mode}.svg?v=${VERSION}`;
  try {
    // le fichier statique est servi (et mis en cache) par le CDN de Vercel
    const r = await fetch(`https://${req.headers.host}${chemin}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`image ${r.status}`);
    let svg = recoloreSvg(await r.text(), theme, mode);
    const trous = [...new Set([...svg.matchAll(/__CAPTURE:([\w.-]+)__/g)].map((m) => m[1]))];
    for (const f of trous) svg = svg.split(`__CAPTURE:${f}__`).join(await capture(req.headers.host, f));
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    return res.status(200).send(svg);
  } catch (err) {
    // jamais de redirection ici : camo garderait la cible (cache d'un an) et l'image resterait
    // bloquée sur l'ancien thème. On renvoie une erreur non mise en cache, camo réessaiera.
    console.error('[img]', err);
    return res.status(503).send('image momentanément indisponible');
  }
}

