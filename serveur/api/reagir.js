// GET /reagir/<id> : ajoute une réaction au profil, puis page de confirmation.
// GET /jouer/<case> (?jeu=0..8) : un coup au morpion. GET /voter/<choix> (?vote=) : un vote au sondage.
// (une seule fonction pour les trois : le plan Hobby de Vercel limite à 12 fonctions)
import { reagir, REACTIONS } from '../lib/reactions.js';
import { jouer, voter } from '../lib/jeux.js';

const ROBOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|camo/i;

export default async function handler(req, res) {
  const go = (q) => { res.setHeader('Cache-Control', 'no-store'); res.redirect(302, `/merci?${new URLSearchParams(q)}`); };
  const robot = ROBOT.test(req.headers['user-agent'] || '');
  const ipJeu = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (req.query.jeu !== undefined || req.query.vote !== undefined) {
    const vote = req.query.vote !== undefined;
    const cle = vote ? String(req.query.vote).toLowerCase() : String(req.query.jeu);
    const base = vote ? { vote: cle } : { jeu: cle };
    if (robot) return go({ ...base, erreur: 'robot' });
    try {
      const r = vote ? await voter(cle, ipJeu) : await jouer(Number(cle) - 1, ipJeu);
      return go(r.ok ? { ...base, ...(r.resultat ? { resultat: r.resultat } : { n: r.n }) } : { ...base, erreur: r.raison });
    } catch (e) {
      console.error('[jeux]', e);
      return go({ ...base, erreur: 'serveur' });
    }
  }
  const id = String(req.query.r || '').toLowerCase();
  if (!REACTIONS[id]) return go({ reaction: 'feu', erreur: 'reaction' });
  if (robot) return go({ reaction: id, erreur: 'robot' });
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
