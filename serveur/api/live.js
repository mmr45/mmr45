// GET /live.svg?theme=dark|light : la carte « En direct ». Les deux sites sont mesurés à chaque
// affichage ; l'historique 24 h est tenu dans Blob (une mesure gardée toutes les 15 min).
import { themeActuel } from '../lib/theme.js';
import { renderLive } from '../lib/cartes.js';
import { mesure } from '../lib/live.js';

export default async function handler(req, res) {
  const now = new Date();
  const [hist, theme] = await Promise.all([mesure(now).catch(() => ({})), themeActuel().catch(() => 'chantier')]);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0'); // camo de GitHub garde sinon une vieille couleur
  res.setHeader('Vercel-CDN-Cache-Control', 'max-age=20');
  res.status(200).send(renderLive(hist, req.query.theme === 'light' ? 'light' : 'dark', now, theme));
}
