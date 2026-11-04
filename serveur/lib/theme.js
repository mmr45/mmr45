// Thème du profil choisi par les visiteurs : un seul pour tout le monde, stocké dans Blob.
import cfg from './themes.json' with { type: 'json' };
import { empreinte } from './etat.js';
import { readFile, writeFile } from 'node:fs/promises';

export const THEMES = cfg.themes;
export const ORDRE = cfg.ordre;
const CHEMIN = 'stats/theme.json';
const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN;
const FICHIER_LOCAL = '/tmp/mmr45-theme.json';
const MAX_PAR_JOUR = 20;
const MEMO_MS = 5000;

const defaut = () => ({ theme: 'chantier', le: null, changements: 0, votes: {}, limites: { jour: '', ips: {} } });

function url() {
  const m = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(process.env.BLOB_READ_WRITE_TOKEN || '');
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/${CHEMIN}` : null;
}

async function lit() {
  if (LOCAL) {
    try { return JSON.parse(await readFile(FICHIER_LOCAL, 'utf8')); } catch { return null; }
  }
  const u = url();
  if (!u) return null;
  const r = await fetch(`${u}?t=${Date.now()}`, { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`lecture thème ${r.status}`);
  return r.json();
}

let memo = null, memoAt = 0;

export async function etatTheme() {
  if (memo && Date.now() - memoAt < MEMO_MS) return memo;
  try {
    memo = (await lit()) || defaut();
  } catch (e) {
    console.error('[theme]', e);
    memo = memo || defaut();
  }
  if (!THEMES[memo.theme]) memo.theme = 'chantier';
  memoAt = Date.now();
  return memo;
}

export async function themeActuel() {
  return (await etatTheme()).theme;
}

export async function choisir(id, ip, now = new Date()) {
  if (!THEMES[id]) return { ok: false, raison: 'theme' };
  memoAt = 0;
  const e = { ...defaut(), ...(await lit()) };
  const jour = now.toISOString().slice(0, 10);
  if (e.limites?.jour !== jour) e.limites = { jour, ips: {} };
  const h = empreinte(`theme|${ip || 'inconnu'}`, jour);
  if ((e.limites.ips[h] || 0) >= MAX_PAR_JOUR) return { ok: false, raison: 'limite' };
  e.limites.ips[h] = (e.limites.ips[h] || 0) + 1;
  const avant = e.theme;
  e.theme = id;
  e.le = now.toISOString();
  e.changements = (e.changements || 0) + 1;
  e.votes = { ...e.votes, [id]: (e.votes?.[id] || 0) + 1 };
  const json = JSON.stringify(e);
  if (LOCAL) await writeFile(FICHIER_LOCAL, json);
  else {
    const { put } = await import('@vercel/blob');
    await put(CHEMIN, json, { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
  }
  memo = e; memoAt = Date.now();
  return { ok: true, avant };
}
