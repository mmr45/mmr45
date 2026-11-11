// Version anglaise des cartes dessinées en direct : les textes français sont traduits au moment
// du rendu (?lang=en). Les fonctions de rendu sont synchrones, donc la langue courante peut être
// posée juste avant l'appel puis remise à « fr » sans risque de mélange entre deux requêtes.
let LANG = 'fr';

export function avecLangue(lang, rendu) {
  LANG = lang === 'en' ? 'en' : 'fr';
  try { return rendu(); } finally { LANG = 'fr'; }
}

export const langue = () => LANG;

const EXACT = {
  'osman@chantier: ~ (en direct)': 'osman@site: ~ (live)',
  '# heure de Paris, calculée à ton affichage': '# Paris time, computed as you view this',
  '# ping réel, à l’instant': '# real ping, right now',
  '● en ligne': '● online', '● hors ligne': '● offline',
  'EN DIRECT · VISITES DU PROFIL': 'LIVE · PROFILE VISITS', 'tableau de bord complet →': 'full dashboard →',
  'Tu es la visite': 'You are visitor', '30 DERNIERS JOURS': 'LAST 30 DAYS',
  'DERNIÈRES VISITES (ANONYMES)': 'LATEST VISITS (ANONYMOUS)',
  'RÉACTIONS': 'REACTIONS', 'un clic sur un emoji juste en dessous, pas de compte': 'one click on an emoji just below, no account needed',
  'Ça claque': 'Fire', 'Impressionnant': 'Mind-blown', 'Inspirant': 'Inspiring', 'Beau boulot': 'Nice work',
  'dernières :': 'latest:', 'EN DIRECT': 'LIVE', 'salle des machines': 'engine room',
  'mesuré à l’instant · historique 24 h': 'measured just now · 24 h history',
  'première mesure à venir': 'first measurement coming', 'opérationnel': 'operational',
  'dernier commit public : aucun récemment': 'latest public commit: none recently',
  'dernier commit public · ': 'latest public commit · ',
  'Dernière touche :': 'Last stroke:', '· peinture fraîche': '· wet paint', 'choisis ta couleur ↓': 'pick your colour ↓',
};

const JOURS = { lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday', jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday' };
const MOIS = {
  'janv.': 'Jan', 'févr.': 'Feb', mars: 'Mar', 'avr.': 'Apr', mai: 'May', juin: 'Jun', 'juil.': 'Jul', 'août': 'Aug',
  'sept.': 'Sep', 'oct.': 'Oct', 'nov.': 'Nov', 'déc.': 'Dec',
};
const COUL = { bleu: 'blue', vert: 'green', jaune: 'yellow', rose: 'pink', violet: 'purple', blanc: 'white' };
const MOMENTS = { jour: 'day', nuit: 'night', soir: 'evening', matin: 'morning', aube: 'dawn' };
const s = (n) => (Number(n) > 1 ? 's' : '');

const REGLES = [
  [/^EN DIRECT · LE MUR · COUCHE N°(\d+)$/, (_, n) => `LIVE · THE WALL · COAT #${n}`],
  [/(\d+) coups? de pinceau/g, (_, n) => `${n} brush stroke${s(n)}`],
  [/à l['’]instant/g, () => 'just now'],
  [/il y a (\d+) min/g, (_, n) => `${n} min ago`],
  [/il y a (\d+) h/g, (_, n) => `${n} h ago`],
  [/il y a (\d+) jours?/g, (_, n) => `${n} day${s(n)} ago`],
  [/^n°(\d+)$/, (_, n) => `#${n}`],
  [/n°(\d+) · ([\d:]+) · (sombre|clair)/g, (_, n, h, m) => `#${n} · ${h} · ${m === 'sombre' ? 'dark' : 'light'}`],
  [/La visite d’avant : /, () => 'Previous visit: '],
  [/☾ (\d+) % en mode sombre/, (_, n) => `☾ ${n} % in dark mode`],
  [/(\d+) % en clair ☀/, (_, n) => `${n} % in light mode ☀`],
  [/record (\d+)\/jour/, (_, n) => `record ${n}/day`],
  [/(\d+) aujourd’hui/g, (_, n) => `${n} today`],
  [/(\d+) visites? sur 30 jours/g, (_, n) => `${n} visit${s(n)} in 30 days`],
  [/^(\d+) (\S+) : (\d+) visites?$/, (_, d, m, n) => `${MOIS[m] || m} ${d}: ${n} visit${s(n)}`],
  [/(\d+) au total/, (_, n) => `${n} in total`],
  [/ · dernière /, () => ' · latest '],
  [/^Paris · (\S+) · (\S+)$/, (_, j, m) => `Paris · ${JOURS[j] || j} · ${MOMENTS[m] || m}`],
  [/dispo ([\d,]+) % · moy\. (\d+) ms · 24 h/, (_, u, m) => `uptime ${u.replace(',', '.')} % · avg ${m} ms · 24 h`],
  [/erreur (\d+)/, (_, c) => `error ${c}`],
  [/^(bleu|vert|jaune|rose|violet|blanc)( · |$| : )/, (_, c, sep) => `${COUL[c]}${sep}`],
  // descriptions pour les lecteurs d'écran
  [/Mur de peinture collectif en direct : couche n°(\d+), (\d+) cases peintes sur (\d+)/, (_, c, n, t) => `Live shared paint wall: coat #${c}, ${n} of ${t} squares painted`],
  [/Terminal en direct : /, () => 'Live terminal: '],
  [/Visites du profil en direct : (\d+)\. Tu es la visite numéro (\d+)\./, (_, a, b) => `Live profile visits: ${a}. You are visitor #${b}.`],
  [/, (\d+) sur 30 jours/, (_, n) => `, ${n} in 30 days`],
  [/Réactions au profil : /, () => 'Profile reactions: '],
  [/En direct : il est ([\d:]+) à Paris\. /, (_, h) => `Live: it is ${h} in Paris. `],
  [/Ça claque|Impressionnant|Inspirant|Beau boulot/g, (m) => EXACT[m]],
  [/^N°(\d+)$/, (_, n) => `#${n}`],
  [/hors ligne/g, () => 'offline'],
  [/en ligne/g, () => 'online'],
];

export function tr(texte) {
  if (LANG !== 'en') return texte;
  const brut = texte.trim();
  if (EXACT[brut]) return texte.replace(brut, EXACT[brut]);
  let out = texte;
  for (const [re, f] of REGLES) out = out.replace(re, f);
  return out;
}

// traduit les textes (et la description) d'un SVG déjà rendu
export function traduitSvg(svg) {
  if (LANG !== 'en') return svg;
  return svg
    .replace(/aria-label="([^"]*)"/, (_, l) => `aria-label="${tr(l)}"`)
    .replace(/<title>([^<]*)<\/title>/, (_, l) => `<title>${tr(l)}</title>`)
    .replace(/>([^<>]+)</g, (m, x) => (x.trim() ? `>${tr(x)}<` : m));
}
