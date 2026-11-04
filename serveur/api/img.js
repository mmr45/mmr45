// GET /img/<nom>.svg?mode=dark|light&lang=fr|en : sert directement l'image du thème choisi par les visiteurs.
// Pas de redirection : le proxy d'images de GitHub (camo) suit les redirections puis met en cache
// la cible avec ses propres en-têtes (figée un an), ce qui bloquait le changement de thème.
// Ici la réponse elle-même n'est jamais mise en cache, comme le compteur de visites.
// « stats », « ville » et « rouleau » sont dessinées à la volée à partir des vraies données GitHub.
import { themeActuel } from '../lib/theme.js';
import { donneesGitHub } from '../lib/github.js';
import { renderStats, renderVille, renderRouleau } from '../lib/gh-cartes.js';

const NOMS = new Set(['hero', 'archi', 'parcours', 'pied', 'projet-batipro', 'projet-mywattup',
  'titre-01', 'titre-02', 'titre-03', 'titre-04', 'titre-05', 'titre-06',
  'reaction-feu', 'reaction-bravo', 'reaction-wow', 'reaction-idee', 'reaction-peinture']);
const DYN = { stats: renderStats, ville: renderVille, rouleau: renderRouleau };
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
  const theme = await themeActuel().catch(() => 'chantier');
  res.setHeader('X-Theme', theme);
  if (DYN[nom]) {
    const d = await donneesGitHub().catch((e) => { console.error('[img] github', e); return null; });
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    return res.status(200).send(DYN[nom](d, mode, theme, lang, new Date()));
  }
  if (!NOMS.has(nom)) return res.status(404).send('image inconnue');
  const chemin = `/themes/${theme}/${lang === 'en' ? 'en/' : ''}${nom}-${mode}.svg?v=${VERSION}`;
  try {
    // le fichier statique est servi (et mis en cache) par le CDN de Vercel
    const r = await fetch(`https://${req.headers.host}${chemin}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`image ${r.status}`);
    let svg = await r.text();
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
