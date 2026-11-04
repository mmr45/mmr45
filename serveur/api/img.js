// GET /img/<nom>.svg?mode=dark|light : renvoie (302) vers l'image du thème choisi par les visiteurs.
// La redirection n'est jamais mise en cache ; l'image cible, elle, est figée et versionnée.
import { themeActuel } from '../lib/theme.js';

const NOMS = new Set(['hero', 'avatar', 'archi', 'parcours', 'pied', 'projet-batipro', 'projet-mywattup',
  'titre-01', 'titre-02', 'titre-03', 'titre-04', 'titre-05', 'titre-06']);
const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'local').slice(0, 10);

export default async function handler(req, res) {
  const nom = String(req.query.n || '').replace(/\.svg$/, '');
  const mode = req.query.mode === 'light' ? 'light' : 'dark';
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  if (!NOMS.has(nom)) return res.status(404).send('image inconnue');
  const theme = await themeActuel().catch(() => 'chantier');
  res.redirect(302, `/themes/${theme}/${nom}-${mode}.svg?v=${VERSION}`);
}
