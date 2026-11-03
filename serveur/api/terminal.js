// GET /terminal.svg?theme=dark|light : heure de Paris et ping réel des deux SaaS, à chaque affichage.
import { renderTerminal } from '../lib/rendu.js';

const SITES = ['https://batipro-ten.vercel.app', 'https://my-watt-up.vercel.app'];

async function ping(url) {
  const t0 = performance.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'mmr45-profil-terminal' } });
    await r.arrayBuffer();
    return { ok: r.status >= 200 && r.status < 400, ms: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, ms: 0 };
  }
}

function salut(h) {
  if (h < 6) return "echo \"Il est tard. Moi, je code sûrement encore.\"";
  if (h < 12) return 'echo "Bonjour ! Café, chantier, puis code."';
  if (h < 18) return 'echo "Bon après-midi, merci de passer !"';
  return 'echo "Bonsoir ! Bonne visite sur mon profil."';
}

export default async function handler(req, res) {
  const now = new Date();
  const sites = await Promise.all(SITES.map(ping));
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
  const h = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hourCycle: 'h23' }).format(now));
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=20, stale-while-revalidate=40');
  res.status(200).send(renderTerminal({ date, sites, salut: salut(h) }, req.query.theme === 'light' ? 'light' : 'dark'));
}
