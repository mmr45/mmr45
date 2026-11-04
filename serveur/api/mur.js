// GET /mur.svg?theme=dark|light : le mur, redessiné à chaque affichage.
import { themeActuel } from '../lib/theme.js';
import { renderMur } from '../lib/rendu.js';
import { charge } from '../lib/etat.js';

export default async function handler(req, res) {
  const etat = await charge().catch(() => ({ couche: 1, total: 0, cases: [] }));
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  // court cache CDN : le mur reste « en direct » sans relire le stockage à chaque vue
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0'); // camo de GitHub garde sinon une vieille couleur
  res.setHeader('Vercel-CDN-Cache-Control', 'max-age=15');
  res.status(200).send(renderMur(etat, req.query.theme === 'light' ? 'light' : 'dark', new Date(), await themeActuel().catch(() => 'chantier')));
}
