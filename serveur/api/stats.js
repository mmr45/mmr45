// GET /api/stats : données publiques du tableau de bord (visites + mur). Ne compte rien.
import { stats, paris } from '../lib/vues.js';
import { charge } from '../lib/etat.js';

export default async function handler(req, res) {
  const [v, mur] = await Promise.all([stats(), charge().catch(() => null)]);
  const pays = {};
  for (const c of mur?.cases || []) if (c.pays) pays[c.pays] = (pays[c.pays] || 0) + 1;
  for (const [k, n] of Object.entries(mur?.pays || {})) pays[k] = Math.max(pays[k] || 0, n);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    maintenant: new Date().toISOString(),
    aujourdhui: paris().jour,
    visites: { total: v.total, base: v.base, depuis: v.depuis, jours: v.jours, grille: v.grille, theme: v.theme, dernieres: v.dernieres, record: v.record },
    mur: mur ? { couche: mur.couche, total: mur.total, cases: mur.cases.map((c) => ({ k: c.case, couleur: c.couleur, le: c.le })), pays } : null,
  });
}
