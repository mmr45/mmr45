// GET /reagir/<id> : ajoute une réaction au profil, puis page de confirmation.
import { reagir, REACTIONS } from '../lib/reactions.js';

const ROBOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|camo/i;

export default async function handler(req, res) {
  const id = String(req.query.r || '').toLowerCase();
  const go = (q) => { res.setHeader('Cache-Control', 'no-store'); res.redirect(302, `/merci?${new URLSearchParams(q)}`); };
  if (!REACTIONS[id]) return go({ reaction: 'feu', erreur: 'reaction' });
  if (ROBOT.test(req.headers['user-agent'] || '')) return go({ reaction: id, erreur: 'robot' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const pays = String(req.headers['x-vercel-ip-country'] || '').toUpperCase().slice(0, 2);
  try {
    const r = await reagir(id, ip, /^[A-Z]{2}$/.test(pays) ? pays : '');
    return go(r.ok ? { reaction: id, n: r.n } : { reaction: id, erreur: r.raison });
  } catch (e) {
    console.error('[reagir]', e);
    return go({ reaction: id, erreur: 'serveur' });
  }
}
