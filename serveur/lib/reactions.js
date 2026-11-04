// Réactions des visiteurs (un clic sur un emoji dans le README), stockées dans Blob.
// Chaque visiteur peut donner chaque réaction une fois par jour (IP hachée, jamais stockée en clair).
import { ecritVersion, litVersion } from './versions.js';
import { empreinte } from './etat.js';

export const REACTIONS = {
  feu: { e: '🔥', nom: 'Ça claque' },
  bravo: { e: '👏', nom: 'Bravo' },
  wow: { e: '🤯', nom: 'Impressionnant' },
  idee: { e: '💡', nom: 'Inspirant' },
  peinture: { e: '🎨', nom: 'Beau boulot' },
};
export const ORDRE_REACTIONS = Object.keys(REACTIONS);

const CHEMIN = 'stats/reactions.json'; // ancien emplacement
const PREFIXE = 'stats/reactions/v-';
const GARDE = 12;

const vide = () => ({ total: 0, compte: {}, dernieres: [], limites: { jour: '', ips: {} } });

export async function litReactions() {
  return { ...vide(), ...((await litVersion(PREFIXE, CHEMIN)) || {}) };
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
  await ecritVersion(PREFIXE, e);
  return { ok: true, n: e.compte[id], total: e.total };
}

// version publique (sans les limites)
export const publique = (e) => ({ total: e.total || 0, compte: e.compte || {}, dernieres: e.dernieres || [] });
