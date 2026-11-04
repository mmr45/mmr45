// GET /theme/<id> : change le thème du profil pour tout le monde, puis page de confirmation.
import { choisir, THEMES } from '../lib/theme.js';

const ROBOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|camo/i;

export default async function handler(req, res) {
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
