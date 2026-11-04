// GET /peindre/<couleur>[?case=0..143] : pose une touche sur le mur (sur la case choisie dans la fresque,
// sinon sur la prochaine case libre) puis renvoie vers la page « merci ».
import { COULEURS, CASES } from '../lib/rendu.js';
import { charge, peindre, sauve } from '../lib/etat.js';

const ROBOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|camo/i;

export default async function handler(req, res) {
  const couleur = String(req.query.c || '').toLowerCase();
  const merci = (q) => { res.setHeader('Cache-Control', 'no-store'); res.redirect(302, `/merci?${new URLSearchParams(q)}`); };
  if (!COULEURS[couleur]) return merci({ erreur: 'couleur' });
  const k = req.query.case === undefined ? null : Number(req.query.case);
  if (k !== null && !(Number.isInteger(k) && k >= 0 && k < CASES)) return merci({ c: couleur, erreur: 'case' });
  if (ROBOT.test(req.headers['user-agent'] || '')) return merci({ c: couleur, erreur: 'robot' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  try {
    const etat = await charge();
    const pays = String(req.headers['x-vercel-ip-country'] || '').toUpperCase().slice(0, 2);
    const r = peindre(etat, couleur, ip, new Date(), /^[A-Z]{2}$/.test(pays) ? pays : '', k);
    if (!r.ok) return merci({ c: couleur, erreur: r.raison });
    await sauve(etat);
    return merci({ c: couleur, n: r.numero, ...(k !== null ? { case: k + 1 } : {}), ...(r.nouvelleCouche ? { couche: etat.couche } : {}) });
  } catch (e) {
    console.error('[peindre]', e);
    return merci({ c: couleur, erreur: 'serveur' });
  }
}
