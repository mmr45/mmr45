// Historique de disponibilité des deux SaaS, tenu par Vercel lui-même (Blob `stats/live.json`).
// Chaque affichage de /live.svg mesure les sites en direct ; une mesure est gardée au plus
// toutes les 15 min (96 points = 24 h). Repart de l'ancien historique tenu par GitHub Actions.
import { readFile, writeFile } from 'node:fs/promises';
import { REDIS, rget, rset } from './store.js';

export const SITES = { batipro: 'https://batipro-ten.vercel.app', mywattup: 'https://my-watt-up.vercel.app' };
const CHEMIN = 'stats/live.json';
const SEED = 'https://raw.githubusercontent.com/mmr45/mmr45/live/historique.json';
const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN;
const FICHIER_LOCAL = '/tmp/mmr45-live.json';
const PAS_MS = 15 * 60000;
const GARDE = 96;

function url() {
  const m = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(process.env.BLOB_READ_WRITE_TOKEN || '');
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/${CHEMIN}` : null;
}

export async function ping(u) {
  const t0 = performance.now();
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'mmr45-profil-monitor' } });
    await r.arrayBuffer();
    return { ok: r.status >= 200 && r.status < 400, code: r.status, ms: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, code: 0, ms: Math.round(performance.now() - t0) };
  }
}

async function lit() {
  if (REDIS) {
    const h = await rget('live');
    if (h) return h;
  } else if (LOCAL) {
    try { return JSON.parse(await readFile(FICHIER_LOCAL, 'utf8')); } catch { /* seed */ }
  } else {
    const u = url();
    if (u) {
      const r = await fetch(`${u}?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) return r.json();
      if (r.status !== 404) throw new Error(`lecture live ${r.status}`);
    }
  }
  try {
    const r = await fetch(SEED, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (r.ok) return r.json();
  } catch { /* rien */ }
  return {};
}

async function ecrit(h) {
  if (REDIS) return rset('live', h);
  const json = JSON.stringify(h);
  if (LOCAL) return writeFile(FICHIER_LOCAL, json);
  const { put } = await import('@vercel/blob');
  await put(CHEMIN, json, { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
}

async function dernierCommit() {
  try {
    const r = await fetch('https://api.github.com/users/mmr45/events/public?per_page=50', {
      signal: AbortSignal.timeout(4000), headers: { 'User-Agent': 'mmr45-profil', Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) return null;
    for (const ev of await r.json()) {
      if (ev.type !== 'PushEvent') continue;
      const msg = (ev.payload?.commits?.at(-1)?.message || '').split('\n')[0];
      if (msg) return { repo: ev.repo.name, msg, le: ev.created_at };
    }
  } catch { /* rien */ }
  return null;
}

let memo = null, memoAt = 0, enCours = null;

// Renvoie l'historique avec, en dernier point, la mesure faite à l'instant.
export async function mesure(now = new Date()) {
  if (!memo || Date.now() - memoAt > 60000) {
    try { memo = await lit(); memoAt = Date.now(); } catch (e) { console.error('[live]', e); memo = memo || {}; }
  }
  const pings = await Promise.all(Object.entries(SITES).map(async ([k, u]) => [k, { ...(await ping(u)), t: now.toISOString() }]));
  const h = structuredClone(memo);
  const dernier = Math.max(0, ...Object.keys(SITES).map((k) => Date.parse(h[k]?.at(-1)?.t || 0) || 0));
  const garder = now - dernier >= PAS_MS;
  for (const [k, m] of pings) h[k] = [...(h[k] || []), m].slice(-GARDE);
  if (garder && !enCours) {
    h._commit = (await dernierCommit()) || h._commit || null;
    memo = h; memoAt = Date.now();
    enCours = ecrit(h).catch((e) => console.error('[live] écriture', e)).finally(() => { enCours = null; });
    await enCours;
  }
  return h;
}
