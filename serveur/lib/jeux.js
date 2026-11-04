// Morpion « visiteurs contre Osman » et sondage de la semaine, stockés dans Blob (états versionnés).
// Un clic dans le README = un coup ou un vote ; l'IA d'Osman répond aussitôt.
import { ecritVersion, litVersion } from './versions.js';
import { empreinte } from './etat.js';

// ─────────────────────────────────────────────────────────── morpion ──
const LIGNES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const PREFIXE_M = 'jeux/morpion/v-';
const COUPS_PAR_JOUR = 30;

export function gagnant(g) {
  for (const [a, b, c] of LIGNES) if (g[a] && g[a] === g[b] && g[a] === g[c]) return { qui: g[a], ligne: [a, b, c] };
  return g.every(Boolean) ? { qui: 'nul', ligne: [] } : null;
}

// IA d'Osman (O) : gagne si possible, bloque, sinon centre, coin, bord. Une chance sur cinq de jouer au hasard,
// pour que les visiteurs puissent gagner.
export function coupOsman(g, hasard = Math.random) {
  const libres = g.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  if (!libres.length) return null;
  const essai = (qui) => libres.find((i) => { const h = [...g]; h[i] = qui; return gagnant(h)?.qui === qui; });
  const gagne = essai('O');
  if (gagne !== undefined) return gagne;
  const bloque = essai('X');
  if (bloque !== undefined && hasard() > 0.2) return bloque;
  if (hasard() < 0.2) return libres[Math.floor(hasard() * libres.length)];
  for (const i of [4, 0, 2, 6, 8, 1, 3, 5, 7]) if (libres.includes(i)) return i;
  return libres[0];
}

const videM = () => ({ grille: Array(9).fill(''), score: { visiteurs: 0, osman: 0, nul: 0 }, parties: 0, fin: null, dernier: null, limites: { jour: '', ips: {} } });

let memo = null, memoAt = 0; // lectures groupées : les 9 cases du README sont chargées en même temps
export async function litMorpion() {
  if (memo && Date.now() - memoAt < 3000) return memo;
  memo = { ...videM(), ...((await litVersion(PREFIXE_M)) || {}) };
  memoAt = Date.now();
  return memo;
}

export async function jouer(k, ip, now = new Date()) {
  if (!Number.isInteger(k) || k < 0 || k > 8) return { ok: false, raison: 'case' };
  memo = null;
  const e = await litMorpion();
  const jour = now.toISOString().slice(0, 10);
  if (e.limites?.jour !== jour) e.limites = { jour, ips: {} };
  const h = empreinte(`morpion|${ip || 'inconnu'}`, jour);
  if ((e.limites.ips[h] || 0) >= COUPS_PAR_JOUR) return { ok: false, raison: 'limite' };
  if (e.fin) { e.grille = Array(9).fill(''); e.fin = null; }                // partie finie : on en relance une
  if (e.grille[k]) return { ok: false, raison: 'prise' };
  e.limites.ips[h] = (e.limites.ips[h] || 0) + 1;
  e.grille[k] = 'X';
  let fin = gagnant(e.grille);
  let osman = null;
  if (!fin) {
    osman = coupOsman(e.grille);
    if (osman !== null) e.grille[osman] = 'O';
    fin = gagnant(e.grille);
  }
  if (fin) {
    e.fin = fin;
    e.parties = (e.parties || 0) + 1;
    e.score[fin.qui === 'X' ? 'visiteurs' : fin.qui === 'O' ? 'osman' : 'nul'] += 1;
  }
  e.dernier = { k, osman, le: now.toISOString() };
  await ecritVersion(PREFIXE_M, e);
  memo = e; memoAt = Date.now();
  return { ok: true, resultat: fin ? (fin.qui === 'X' ? 'gagne' : fin.qui === 'O' ? 'perdu' : 'nul') : 'continue' };
}

// ─────────────────────────────────────────────────────────── sondage ──
// Pour changer de question : modifie SONDAGE (nouvel id = compteurs remis à zéro).
export const SONDAGE = {
  id: 'pourquoi-1',
  question: ['Tu es venu pour quoi ?', 'What brought you here?'],
  choix: [
    { id: 'design', e: '🎨', fr: 'Le design du profil', en: 'The profile design' },
    { id: 'code', e: '💻', fr: 'Le code', en: 'The code' },
    { id: 'batipro', e: '🏗️', fr: 'Bâtipro', en: 'Bâtipro' },
    { id: 'mywattup', e: '⚡', fr: 'MyWattUp', en: 'MyWattUp' },
  ],
};
const PREFIXE_S = 'jeux/sondage/v-';

let memoS = null, memoSAt = 0;
export async function litSondage() {
  if (memoS && Date.now() - memoSAt < 3000) return memoS;
  const e = (await litVersion(PREFIXE_S)) || {};
  memoS = e.id === SONDAGE.id ? e : { id: SONDAGE.id, votes: {}, total: 0, dernier: null, limites: { jour: '', ips: {} } };
  memoSAt = Date.now();
  return memoS;
}

export async function voter(id, ip, now = new Date()) {
  if (!SONDAGE.choix.some((c) => c.id === id)) return { ok: false, raison: 'choix' };
  memoS = null;
  const e = await litSondage();
  // un vote par visiteur et par jour (IP hachée avec la date, jamais stockée en clair)
  const jour = now.toISOString().slice(0, 10);
  if (e.limites?.jour !== jour) e.limites = { jour, ips: {} };
  const h = empreinte(`sondage|${SONDAGE.id}|${ip || 'inconnu'}`, jour);
  if (e.limites.ips[h]) return { ok: false, raison: 'deja' };
  e.limites.ips[h] = 1;
  e.votes = { ...e.votes, [id]: (e.votes?.[id] || 0) + 1 };
  e.total = (e.total || 0) + 1;
  e.dernier = { id, le: now.toISOString() };
  await ecritVersion(PREFIXE_S, e);
  memoS = e; memoSAt = Date.now();
  return { ok: true, n: e.votes[id], total: e.total };
}
