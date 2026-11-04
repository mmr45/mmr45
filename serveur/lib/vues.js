// Compteur de visites du profil, stocké dans Vercel Blob (un seul fichier, réécrit).
// Chaque affichage de /vues.svg = une visite. GitHub fait passer les images par son
// proxy (camo) : on ne voit ni l'IP ni le compte du visiteur, seulement l'heure
// et le thème (clair/sombre) choisi par son navigateur. Tout est donc anonyme.
import { readFile, writeFile } from 'node:fs/promises';

const CHEMIN = 'stats/vues.json';
const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN;
const FICHIER_LOCAL = '/tmp/mmr45-vues.json';
// le compteur repart du badge de visites utilisé jusqu'ici
const SEED = 'https://komarev.com/ghpvc/?username=mmr45&label=Visites&color=1D5FA3&style=flat-square&base=4999';
const SEED_SECOURS = 5135; // valeur du badge au moment du passage au compteur maison
const ECRITURE_MIN_MS = 8000; // au plus une écriture toutes les 8 s par instance
const GARDE_JOURS = 120;
const GARDE_DERNIERES = 40;

export const JOURS_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const PARIS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', hourCycle: 'h23', weekday: 'short',
});
const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export function paris(d = new Date()) {
  const o = Object.fromEntries(PARIS.formatToParts(d).map((x) => [x.type, x.value]));
  return { jour: `${o.year}-${o.month}-${o.day}`, heure: Number(o.hour), wd: WD[o.weekday] };
}

const vide = () => ({
  v: 1, total: 0, base: 0, depuis: new Date().toISOString(),
  jours: {}, grille: Array.from({ length: 7 }, () => Array(24).fill(0)),
  theme: { dark: 0, light: 0 }, dernieres: [], record: { jour: '', n: 0 },
});

// URL publique du fichier, déduite du jeton (vercel_blob_rw_<store>_<secret>)
function urlPublique() {
  const m = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(process.env.BLOB_READ_WRITE_TOKEN || '');
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/${CHEMIN}` : null;
}

async function seedKomarev() {
  try {
    const r = await fetch(SEED, { signal: AbortSignal.timeout(4000) });
    const s = await r.text();
    const nums = [...s.matchAll(/>\s*([\d,.\s ]+)\s*</g)].map((m) => Number(m[1].replace(/[^\d]/g, ''))).filter((n) => n > 0);
    return nums.length ? Math.max(...nums) : SEED_SECOURS;
  } catch { return SEED_SECOURS; }
}

async function lit() {
  if (LOCAL) {
    try { return JSON.parse(await readFile(FICHIER_LOCAL, 'utf8')); } catch { return null; }
  }
  let url = urlPublique();
  if (!url) {
    const { head } = await import('@vercel/blob');
    try { url = (await head(CHEMIN)).url; } catch { return null; }
  }
  const r = await fetch(`${url}?cache=0&t=${Date.now()}`, { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`lecture vues ${r.status}`);
  return r.json();
}

async function ecrit(e) {
  const json = JSON.stringify(e);
  if (LOCAL) return writeFile(FICHIER_LOCAL, json);
  const { put } = await import('@vercel/blob');
  await put(CHEMIN, json, {
    access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
  });
}

function applique(e, ev) {
  const d = new Date(ev.le);
  const { jour, heure, wd } = paris(d);
  e.total += 1;
  e.jours[jour] = (e.jours[jour] || 0) + 1;
  e.grille[wd][heure] += 1;
  e.theme[ev.th] = (e.theme[ev.th] || 0) + 1;
  e.dernieres.unshift({ n: e.total, le: ev.le, th: ev.th });
  e.dernieres.length = Math.min(e.dernieres.length, GARDE_DERNIERES);
  if (e.jours[jour] > e.record.n) e.record = { jour, n: e.jours[jour] };
  const cles = Object.keys(e.jours).sort();
  for (const k of cles.slice(0, Math.max(cles.length - GARDE_JOURS, 0))) delete e.jours[k];
}

// état partagé de l'instance
let memo = null;       // dernier état connu (avec les visites en attente déjà appliquées)
let attente = [];      // visites pas encore écrites
let derniereEcriture = 0;
let verrou = Promise.resolve();

async function charge() {
  const e = await lit().catch((err) => { console.error('[vues] lecture', err); return memo; });
  if (e) return e;
  const n = vide();
  n.base = await seedKomarev();
  n.total = n.base;
  return n;
}

// Compte une visite et renvoie { etat, numero, precedente }.
export function compte(th) {
  const run = verrou.then(async () => {
    const ev = { le: new Date().toISOString(), th: th === 'light' ? 'light' : 'dark' };
    const ecrire = Date.now() - derniereEcriture >= ECRITURE_MIN_MS;
    if (ecrire || !memo) {
      // relecture fraîche puis on rejoue les visites en attente et la nouvelle
      const e = await charge();
      for (const a of attente) applique(e, a);
      const precedente = e.dernieres[0]?.le || null;
      applique(e, ev);
      attente = [];
      memo = e;
      derniereEcriture = Date.now();
      try { await ecrit(e); } catch (err) { console.error('[vues] écriture', err); attente = [ev]; }
      return { etat: e, numero: e.total, precedente };
    }
    const precedente = memo.dernieres[0]?.le || null;
    applique(memo, ev);
    attente.push(ev);
    return { etat: memo, numero: memo.total, precedente };
  });
  verrou = run.catch(() => {});
  return run;
}

// Lecture seule pour le dashboard (fraîche, avec les visites en attente de l'instance).
export async function stats() {
  const e = await charge();
  for (const a of attente) applique(e, a);
  return e;
}
