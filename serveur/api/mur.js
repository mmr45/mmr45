// GET /mur.svg?theme=dark|light : le mur, redessiné à chaque affichage.
import { renderMur } from '../lib/rendu.js';
import { charge } from '../lib/etat.js';

export default async function handler(req, res) {
  const etat = await charge().catch(() => ({ couche: 1, total: 0, cases: [] }));
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  // court cache CDN : le mur reste « en direct » sans relire le stockage à chaque vue
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=30');
  res.status(200).send(renderMur(etat, req.query.theme === 'light' ? 'light' : 'dark'));
}
