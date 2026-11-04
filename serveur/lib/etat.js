// Stockage de l'état du mur dans Vercel Blob.
// Chaque écriture crée un nouveau fichier (jamais d'écrasement), nommé avec un
// horodatage inversé : le plus récent sort en premier dans list(). Ça évite tout
// problème de cache CDN sur un fichier réécrit.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { CASES } from './rendu.js';
import { REDIS, rget, rset } from './store.js';

const PREFIXE = 'mur/etat-';
const SEED = 'https://raw.githubusercontent.com/mmr45/mmr45/mur/etat.json';
const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN; // tests en local : fichier dans /tmp
const FICHIER_LOCAL = '/tmp/mmr45-mur.json';
export const MAX_PAR_JOUR = 10;

// ordre de remplissage éparpillé, identique à .github/scripts/mur.py (mélange déterministe)
export const ORDRE = (() => {
  const a = [...Array(CASES).keys()];
  let s = 45;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
})();

const vide = () => ({ couche: 1, total: 0, cases: [], limites: { jour: '', ips: {} } });

function normalise(e) {
  e.limites ||= { jour: '', ips: {} };
  e.cases ||= [];
  return e;
}

export async function charge() {
  if (REDIS) {
    const e = await rget('mur');
    if (e) return normalise(e);
  } else if (LOCAL) {
    try { return normalise(JSON.parse(await readFile(FICHIER_LOCAL, 'utf8'))); } catch { return vide(); }
  } else {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: PREFIXE, limit: 1 });
    if (blobs.length) {
      const r = await fetch(blobs[0].url, { cache: 'no-store' });
      if (r.ok) return normalise(await r.json());
    }
  }
  // première fois : on reprend le mur peint via les issues GitHub
  try {
    const r = await fetch(SEED, { cache: 'no-store' });
    if (r.ok) {
      const old = await r.json();
      const e = normalise({ couche: old.couche || 1, total: old.total || 0, cases: old.cases || [] });
      return e;
    }
  } catch { /* rien */ }
  return vide();
}

// Lecture partagée pour les 144 cases de la fresque : une seule lecture de Blob toutes les 5 s
// par instance, même quand le README charge toutes les cases en même temps.
let memo = null, memoAt = 0, enCours = null;
export function chargeMemo() {
  if (memo && Date.now() - memoAt < 5000) return Promise.resolve(memo);
  enCours ||= charge().then((e) => { memo = e; memoAt = Date.now(); return e; }).finally(() => { enCours = null; });
  return enCours;
}

export async function sauve(etat) {
  memo = etat; memoAt = Date.now();
  if (REDIS) return rset('mur', etat);
  const json = JSON.stringify(etat);
  if (LOCAL) return writeFile(FICHIER_LOCAL, json);
  const { put, list, del } = await import('@vercel/blob');
  const cle = String(9999999999999 - Date.now()).padStart(13, '0');
  await put(`${PREFIXE}${cle}.json`, json, { access: 'public', contentType: 'application/json', addRandomSuffix: true });
  // ménage : on garde les 5 dernières versions
  if (Math.random() < 0.25) {
    const { blobs } = await list({ prefix: PREFIXE, limit: 30 });
    const vieux = blobs.slice(5).map((b) => b.url);
    if (vieux.length) await del(vieux);
  }
}

export function empreinte(ip, jour) {
  return createHash('sha256').update(`${process.env.SEL || 'mmr45-mur'}|${jour}|${ip}`).digest('hex').slice(0, 16);
}

// `k` (0 à CASES-1) : case choisie par le visiteur dans la fresque, repeinte même si elle l'était déjà.
// Sans `k` : la prochaine case libre, dans l'ordre éparpillé (pots de peinture du README).
export function peindre(etat, couleur, ip, now = new Date(), pays = '', k = null) {
  const jour = now.toISOString().slice(0, 10);
  if (etat.limites.jour !== jour) etat.limites = { jour, ips: {} };
  const h = empreinte(ip || 'inconnu', jour);
  const deja = etat.limites.ips[h] || 0;
  if (deja >= MAX_PAR_JOUR) return { ok: false, raison: 'limite' };
  etat.limites.ips[h] = deja + 1;
  let nouvelleCouche = false;
  if (k !== null) {
    etat.cases = etat.cases.filter((c) => c.case !== k);
  } else if (etat.cases.length >= CASES) {
    etat.couche += 1;
    etat.cases = [];
    nouvelleCouche = true;
  }
  const cible = k !== null ? k : ORDRE.find((i) => !etat.cases.some((c) => c.case === i));
  etat.cases.push({ case: cible, couleur, par: 'visiteur', le: now.toISOString(), ...(pays ? { pays } : {}) });
  if (pays) { etat.pays ||= {}; etat.pays[pays] = (etat.pays[pays] || 0) + 1; }
  etat.total += 1;
  return { ok: true, nouvelleCouche, numero: etat.total };
}
