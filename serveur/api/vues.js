// GET /vues.svg?theme=dark|light : compte la visite et renvoie la carte « visites en direct ».
// Jamais mis en cache, pour que chaque affichage du profil soit compté.
import { themeActuel } from '../lib/theme.js';
import { renderVues } from '../lib/rendu.js';
import { compte, paris } from '../lib/vues.js';

export default async function handler(req, res) {
  const th = req.query.theme === 'light' ? 'light' : 'dark';
  let v;
  try {
    v = await compte(th);
  } catch (e) {
    console.error('[vues]', e);
    v = { etat: { jours: {}, theme: {}, dernieres: [], record: { n: 0 } }, numero: 0, precedente: null };
  }
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Expires', '0');
  res.status(200).send(renderVues({ ...v, aujourdhui: paris().jour }, th, new Date(), await themeActuel().catch(() => 'chantier')));
}
