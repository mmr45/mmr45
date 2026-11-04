// GET /img/<nom>.svg?mode=dark|light : sert directement l'image du thème choisi par les visiteurs.
// Pas de redirection : le proxy d'images de GitHub (camo) suit les redirections puis met en cache
// la cible avec ses propres en-têtes (figée un an), ce qui bloquait le changement de thème.
// Ici la réponse elle-même n'est jamais mise en cache, comme le compteur de visites.
import { themeActuel } from '../lib/theme.js';

const NOMS = new Set(['hero', 'avatar', 'archi', 'parcours', 'pied', 'projet-batipro', 'projet-mywattup',
  'titre-01', 'titre-02', 'titre-03', 'titre-04', 'titre-05', 'titre-06']);
const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'local').slice(0, 10);

export default async function handler(req, res) {
  const nom = String(req.query.n || '').replace(/\.svg$/, '');
  const mode = req.query.mode === 'light' ? 'light' : 'dark';
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Expires', '0');
  if (!NOMS.has(nom)) return res.status(404).send('image inconnue');
  const theme = await themeActuel().catch(() => 'chantier');
  const chemin = `/themes/${theme}/${nom}-${mode}.svg?v=${VERSION}`;
  try {
    // le fichier statique est servi (et mis en cache) par le CDN de Vercel
    const r = await fetch(`https://${req.headers.host}${chemin}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`image ${r.status}`);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('X-Theme', theme);
    return res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    console.error('[img]', err);
    return res.redirect(302, chemin);
  }
}
