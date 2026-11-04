// GET /reactions.svg?theme=dark|light : la carte des réactions, redessinée à chaque affichage.
import { themeActuel } from '../lib/theme.js';
import { litReactions } from '../lib/reactions.js';
import { renderReactions } from '../lib/cartes.js';

export default async function handler(req, res) {
  const e = await litReactions().catch(() => ({ total: 0, compte: {}, dernieres: [] }));
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.status(200).send(renderReactions(e, req.query.theme === 'light' ? 'light' : 'dark', new Date(), await themeActuel().catch(() => 'chantier')));
}
