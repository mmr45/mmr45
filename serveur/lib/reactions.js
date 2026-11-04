// Réactions des visiteurs (un clic sur un emoji dans le README), stockées dans Blob.
// Chaque visiteur peut donner chaque réaction une fois par jour (IP hachée, jamais stockée en clair).
import { readFile, writeFile } from 'node:fs/promises';
import { empreinte } from './etat.js';

export const REACTIONS = {
  feu: { e: '🔥', nom: 'Ça claque' },
  bravo: { e: '👏', nom: 'Bravo' },
  wow: { e: '🤯', nom: 'Impressionnant' },
  idee: { e: '💡', nom: 'Inspirant' },
  peinture: { e: '🎨', nom: 'Beau boulot' },
};
export const ORDRE_REACTIONS = Object.keys(REACTIONS);

const CHEMIN = 'stats/reactions.json';
const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN;
const FICHIER_LOCAL = '/tmp/mmr45-reactions.json';
const GARDE = 12;

const vide = () => ({ total: 0, compte: {}, dernieres: [], limites: { jour: '', ips: {} } });

function url() {
  const m = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(process.env.BLOB_READ_WRITE_TOKEN || '');
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/${CHEMIN}` : null;
}

export async function litReactions() {
  if (LOCAL) {
    try { return { ...vide(), ...JSON.parse(await readFile(FICHIER_LOCAL, 'utf8')) }; } catch { return vide(); }
  }
  const u = url();
  if (!u) return vide();
  const r = await fetch(`${u}?t=${Date.now()}`, { cache: 'no-store' });
  if (r.status === 404) return vide();
  if (!r.ok) throw new Error(`lecture réactions ${r.status}`);
  return { ...vide(), ...(await r.json()) };
}

export async function reagir(id, ip, pays = '', now = new Date()) {
  if (!REACTIONS[id]) return { ok: false, raison: 'reaction' };
  const e = await litReactions();
  const jour = now.toISOString().slice(0, 10);
  if (e.limites?.jour !== jour) e.limites = { jour, ips: {} };
  const h = empreinte(`reaction|${ip || 'inconnu'}`, jour);
  const deja = e.limites.ips[h] || [];
  if (deja.includes(id)) return { ok: false, raison: 'deja' };
  e.limites.ips[h] = [...deja, id];
  e.total = (e.total || 0) + 1;
  e.compte = { ...e.compte, [id]: (e.compte?.[id] || 0) + 1 };
  e.dernieres = [{ r: id, le: now.toISOString(), ...(pays ? { pays } : {}) }, ...(e.dernieres || [])].slice(0, GARDE);
  const json = JSON.stringify(e);
  if (LOCAL) await writeFile(FICHIER_LOCAL, json);
  else {
    const { put } = await import('@vercel/blob');
    await put(CHEMIN, json, { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
  }
  return { ok: true, n: e.compte[id], total: e.total };
}

// version publique (sans les limites)
export const publique = (e) => ({ total: e.total || 0, compte: e.compte || {}, dernieres: e.dernieres || [] });
