// GET /theme/<id> : change le thème du profil pour tout le monde, puis page de confirmation.
// GET /theme-actuel.svg (?svg=1) : en-tête du menu déroulant des thèmes.
// (une seule fonction pour les deux : le plan Hobby de Vercel limite à 12 fonctions)
import { choisir, etatTheme, THEMES, ORDRE } from '../lib/theme.js';
import { renderThemeActuel } from '../lib/cartes.js';

const ROBOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|camo/i;

export default async function handler(req, res) {
  if (req.query.svg) {
    const th = await etatTheme().catch(() => ({ theme: 'chantier' }));
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    return res.status(200).send(renderThemeActuel(th, THEMES, ORDRE));
  }
  const id = String(req.query.t || '').toLowerCase();
  const go = (q) => { res.setHeader('Cache-Control', 'no-store'); res.redirect(302, `/merci?${new URLSearchParams(q)}`); };
  if (!THEMES[id]) return go({ theme: 'chantier', erreur: 'theme' });
  if (ROBOT.test(req.headers['user-agent'] || '')) return go({ theme: id, erreur: 'robot' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  try {
    const r = await choisir(id, ip);
    return go(r.ok ? { theme: id } : { theme: id, erreur: r.raison });
  } catch (e) {
    console.error('[theme]', e);
    return go({ theme: id, erreur: 'serveur' });
  }
}
