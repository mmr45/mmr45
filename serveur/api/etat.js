// GET /api/etat : état public du mur (sans les empreintes anti-abus), pour la page « merci ».
import { charge } from '../lib/etat.js';

export default async function handler(req, res) {
  const { couche, total, cases } = await charge();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ couche, total, cases });
}
