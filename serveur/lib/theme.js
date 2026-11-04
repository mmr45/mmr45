// Thème du profil choisi par les visiteurs : un seul pour tout le monde, stocké dans Blob.
import cfg from './themes.json' with { type: 'json' };
import { empreinte } from './etat.js';
import { ecritVersion, litVersion } from './versions.js';

export const THEMES = cfg.themes;
export const ORDRE = cfg.ordre;
const CHEMIN = 'stats/theme.json'; // ancien emplacement, relu une fois
const PREFIXE = 'stats/theme/v-';
const MAX_PAR_JOUR = 20;
const MEMO_MS = 4000;

const defaut = () => ({ theme: 'chantier', le: null, changements: 0, votes: {}, limites: { jour: '', ips: {} } });

const lit = () => litVersion(PREFIXE, CHEMIN);

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
  await ecritVersion(PREFIXE, e);
  memo = e; memoAt = Date.now();
  return { ok: true, avant };
}
