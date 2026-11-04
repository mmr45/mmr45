// Thème du profil choisi par les visiteurs : un seul pour tout le monde, stocké dans Blob.
import cfg from './themes.json' with { type: 'json' };
import { empreinte } from './etat.js';
import { ecritVersion, litVersion } from './versions.js';

export const THEMES = cfg.themes;
export const ORDRE = cfg.ordre;
export const AUTO = 'auto';

// Thème automatique : la saison le jour, coucher de soleil le soir, néon la nuit (heure de Paris).
const SAISONS = ['nord', 'nord', 'sakura', 'sakura', 'sakura', 'ocean', 'ocean', 'ocean', 'foret', 'foret', 'foret', 'nord'];
const PARIS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', month: 'numeric', hour: 'numeric', hourCycle: 'h23' });
export function themeAuto(now = new Date()) {
  const o = Object.fromEntries(PARIS.formatToParts(now).map((x) => [x.type, x.value]));
  const h = Number(o.hour), m = Number(o.month) - 1;
  if (h >= 22 || h < 6) return { id: 'neon', moment: 'nuit' };
  if (h >= 18) return { id: 'sunset', moment: 'soir' };
  return { id: SAISONS[m], moment: ['hiver', 'hiver', 'printemps', 'printemps', 'printemps', 'été', 'été', 'été', 'automne', 'automne', 'automne', 'hiver'][m] };
}
const CHEMIN = 'stats/theme.json'; // ancien emplacement, relu une fois
const PREFIXE = 'stats/theme/v-';
const MAX_PAR_JOUR = 20;
const MEMO_MS = 10000;

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
  if (!THEMES[memo.theme] && memo.theme !== AUTO) memo.theme = 'chantier';
  memoAt = Date.now();
  return memo;
}

// thème réellement affiché (le mode auto est résolu à chaque affichage)
export async function themeActuel(now = new Date()) {
  const t = (await etatTheme()).theme;
  return t === AUTO ? themeAuto(now).id : t;
}

export async function choisir(id, ip, now = new Date()) {
  if (!THEMES[id] && id !== AUTO) return { ok: false, raison: 'theme' };
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
