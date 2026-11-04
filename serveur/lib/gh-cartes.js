// Cartes dessinées à partir des vraies données GitHub, aux couleurs du thème choisi :
//   renderStats : contributions, commits, PR, série de jours, langages
//   renderVille : la grille des contributions en ville 3D animée
import { palette, t, svg, cardBg, MONO, SANS, milliers } from './rendu.js';

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export function mix(a, b, k) {
  const x = hex(a), y = hex(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

const TXT = {
  fr: {
    titreStats: '📊 STATS GITHUB · 12 DERNIERS MOIS', contributions: 'contributions', commits: 'commits', prs: 'pull requests',
    actifs: 'jours actifs', serie: 'jours de suite', serie1: 'jour de suite', record: (n) => `record : ${n} jour${n > 1 ? 's' : ''}`,
    langages: 'LANGAGES', semaines: 'contributions par semaine', attente: 'Les données arrivent : elles sont recalculées chaque nuit.',
    titreVille: '🏙️ MA VILLE DE CODE', sousVille: 'une tour = un jour · sa hauteur = mes contributions ce jour-là',
    plusHaute: (j, n) => `plus haute tour : ${j} · ${n}`, aujourdhui: "aujourd'hui",
    mois: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
    maj: (m) => (m < 60 ? `mis à jour il y a ${m} min` : m < 1440 ? `mis à jour il y a ${Math.floor(m / 60)} h` : `mis à jour il y a ${Math.floor(m / 1440)} j`),
    autres: 'Autres',
    titreRouleau: '🎨 MON MUR DE CODE', sousRouleau: 'un coup de rouleau sur mes 12 derniers mois · une case = un jour',
    moins: 'moins', plus: 'plus',
  },
  en: {
    titreStats: '📊 GITHUB STATS · LAST 12 MONTHS', contributions: 'contributions', commits: 'commits', prs: 'pull requests',
    actifs: 'active days', serie: 'day streak', serie1: 'day streak', record: (n) => `best: ${n} day${n > 1 ? 's' : ''}`,
    langages: 'LANGUAGES', semaines: 'contributions per week', attente: 'Data is on its way: it is recomputed every night.',
    titreVille: '🏙️ MY CODE CITY', sousVille: 'one tower = one day · its height = my contributions that day',
    plusHaute: (j, n) => `tallest tower: ${j} · ${n}`, aujourdhui: 'today',
    mois: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    maj: (m) => (m < 60 ? `updated ${m} min ago` : m < 1440 ? `updated ${Math.floor(m / 60)} h ago` : `updated ${Math.floor(m / 1440)} d ago`),
    autres: 'Other',
    titreRouleau: '🎨 MY CODE WALL', sousRouleau: 'one roller stroke over my last 12 months · one square = one day',
    moins: 'less', plus: 'more',
  },
};

const dateCourte = (iso, L) => { const [, m, d] = iso.split('-').map(Number); return L === TXT.en ? `${L.mois[m - 1]} ${d}` : `${d} ${L.mois[m - 1]}`; };

function vide(p, W, H, L, titre) {
  const [defs, bg] = cardBg(p, W, H);
  return svg(W, H, titre, `${bg}${t(40, 58, titre, 15, p.orange, 800, MONO, 'start', ' letter-spacing="1.5"')}
${t(W / 2, H / 2 + 8, L.attente, 22, p.muted, 400, SANS, 'middle')}`, '', defs);
}

// ───────────────────────────────────────────────────────────── stats ──
export function renderStats(d, mode, theme, lang = 'fr', now = new Date()) {
  const p = palette(mode, theme);
  const L = TXT[lang] || TXT.fr;
  const W = 1200, H = 420;
  if (!d) return vide(p, W, H, L, L.titreStats);
  const [defs0, bg] = cardBg(p, W, H, '20%', '35%');
  const maj = d.le ? L.maj(Math.max(1, Math.round((now - new Date(d.le)) / 60000))) : '';

  // chiffres
  const tuiles = [[d.commits, L.commits], [d.prs, L.prs], [d.actifs, L.actifs]].map(([n, lab], i) => {
    const x = 40 + i * 172;
    return `<g class="up" style="animation-delay:${0.35 + i * 0.12}s">
  <rect x="${x}" y="236" width="160" height="88" rx="16" fill="${p.panel}" stroke="${p.line}"/>
  ${t(x + 20, 282, milliers(n ?? 0), 34, p.text, 800)}
  ${t(x + 20, 308, lab, 15, p.muted, 400, MONO)}
</g>`;
  }).join('');

  // série : anneau qui se remplit
  const cx = 700, cy = 196, r = 84, circ = 2 * Math.PI * r;
  const part = d.record ? Math.min(d.serie / d.record, 1) : 0;
  const anneau = `<g class="up" style="animation-delay:.5s">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.panel}" stroke="${p.line}" stroke-width="14"/>
  <circle class="arc" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#arc)" stroke-width="14" stroke-linecap="round"
    stroke-dasharray="${(circ * Math.max(part, 0.02)).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
  <g class="flamme"><text x="${cx}" y="${cy - 24}" font-size="30" text-anchor="middle" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">🔥</text></g>
  ${t(cx, cy + 24, String(d.serie ?? 0), 50, p.text, 800, SANS, 'middle')}
  ${t(cx, cy + 50, d.serie === 1 ? L.serie1 : L.serie, 14, p.muted, 400, MONO, 'middle')}
  ${t(cx, cy + r + 44, L.record(d.record ?? 0), 16, p.orange, 700, MONO, 'middle')}
</g>`;

  // langages aux couleurs du thème
  const langs = (d.langages || []).slice(0, 6);
  const lx = 860, lw = 300;
  const barres = langs.map((l, i) => {
    const c = mix(p.orange, p.blue, langs.length > 1 ? i / (langs.length - 1) : 0);
    const y = 120 + i * 40;
    const nom = l.nom === 'Autres' ? L.autres : l.nom;
    return `<g class="up" style="animation-delay:${0.6 + i * 0.1}s">
  ${t(lx, y, nom, 17, p.text, 600)}
  ${t(lx + lw, y, `${(l.part * 100).toFixed(1)} %`, 15, p.muted, 400, MONO, 'end')}
  <rect x="${lx}" y="${y + 9}" width="${lw}" height="8" rx="4" fill="${p.panel2}"/>
  <rect class="bar" style="animation-delay:${0.8 + i * 0.1}s" x="${lx}" y="${y + 9}" width="${Math.max(lw * l.part, 8).toFixed(1)}" height="8" rx="4" fill="${c}"/>
</g>`;
  }).join('');

  // contributions par semaine (courbe)
  const jours = d.jours || [];
  const sem = [];
  for (let i = 0; i < jours.length; i += 7) sem.push(jours.slice(i, i + 7).reduce((s, j) => s + j[1], 0));
  const sx = 40, sw = 760, sy = 346, sh = 44, mx = Math.max(...sem, 1);
  const pts = sem.map((v, i) => [sx + (i / Math.max(sem.length - 1, 1)) * sw, sy + sh - (v / mx) * sh]);
  const ligne = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const courbe = pts.length > 1 ? `<path d="${ligne}L${sx + sw} ${sy + sh}L${sx} ${sy + sh}z" fill="url(#aire)"/>
<path class="trace" pathLength="100" d="${ligne}" fill="none" stroke="${p.orange}" stroke-width="2.5" stroke-linejoin="round"/>
${t(sx + sw + 16, sy + sh - 4, L.semaines, 14, p.faint, 400, MONO)}` : '';

  const defs = defs0 + `<linearGradient id="arc" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${p.orange}"/><stop offset="1" stop-color="${p.blue}"/></linearGradient>
<linearGradient id="aire" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${p.orange}" stop-opacity=".35"/><stop offset="1" stop-color="${p.orange}" stop-opacity="0"/></linearGradient>`;
  const body = `${bg}
<g class="up">
  ${t(40, 58, L.titreStats, 15, p.orange, 800, MONO, 'start', ' letter-spacing="1.5"')}
  ${t(W - 40, 58, maj, 14, p.faint, 400, MONO, 'end')}
</g>
<g class="up" style="animation-delay:.15s">
  ${t(36, 178, milliers(d.total ?? 0), 104, p.text, 800, SANS, 'start', ' letter-spacing="-3"')}
  ${t(42, 212, L.contributions, 20, p.muted, 400, MONO)}
</g>
${tuiles}
${anneau}
${t(lx, 86, L.langages, 14, p.faint, 800, MONO, 'start', ' letter-spacing="1.5"')}
${barres}
${courbe}`;
  const style = `.arc{animation:arc 10s cubic-bezier(.6,0,.2,1) infinite}
@keyframes arc{0%{stroke-dashoffset:${circ.toFixed(1)}}20%,85%{stroke-dashoffset:0}100%{stroke-dashoffset:${circ.toFixed(1)}}}
.flamme{transform-box:fill-box;transform-origin:center bottom;animation:fl 1.6s ease-in-out infinite alternate}
@keyframes fl{from{transform:scale(1) rotate(-4deg)}to{transform:scale(1.12) rotate(4deg)}}
.bar{transform-box:fill-box;transform-origin:left;animation:bar 10s cubic-bezier(.6,0,.2,1) infinite both}
@keyframes bar{0%{transform:scaleX(0)}18%,88%{transform:scaleX(1)}100%{transform:scaleX(0)}}
.trace{stroke-dasharray:100 100;animation:tr 10s ease-in-out infinite}
@keyframes tr{0%{stroke-dashoffset:100}30%,88%{stroke-dashoffset:0}100%{stroke-dashoffset:-100}}`;
  const label = lang === 'en'
    ? `GitHub stats over the last 12 months: ${d.total} contributions, ${d.commits} commits, ${d.prs} pull requests, ${d.actifs} active days, current streak ${d.serie} days (best ${d.record}).`
    : `Stats GitHub sur 12 mois : ${d.total} contributions, ${d.commits} commits, ${d.prs} pull requests, ${d.actifs} jours actifs, série en cours ${d.serie} jours (record ${d.record}).`;
  return svg(W, H, label, body, style, defs);
}

// ───────────────────────────────────────────────────────────── ville ──
export function renderVille(d, mode, theme, lang = 'fr', now = new Date()) {
  const p = palette(mode, theme);
  const L = TXT[lang] || TXT.fr;
  const W = 1200, H = 540;
  if (!d || !d.jours?.length) return vide(p, W, H, L, L.titreVille);
  const [defs0, bg] = cardBg(p, W, H, '50%', '70%');
  const jours = d.jours;
  // semaines dimanche → samedi ; la première peut être incomplète
  const premier = new Date(`${jours[0][0]}T12:00:00Z`).getUTCDay();
  const cases = jours.map(([date, n], i) => ({ date, n, w: Math.floor((i + premier) / 7), r: (i + premier) % 7 }));
  const nbSem = cases[cases.length - 1].w + 1;
  const max = Math.max(...cases.map((c) => c.n), 1);
  const ax = 19.4, ay = 3.6, bx = -12, by = 7;              // axes : semaines vers la droite, jours vers l'avant
  const ox = (W - (nbSem * ax - 7 * bx)) / 2 - 7 * bx, oy = H - 44 - (nbSem * ay + 7 * by);
  const HMAX = 150;
  const vide0 = mix(p.panel2, p.line, 0.5);
  const couleur = (n) => {
    if (!n) return vide0;
    const k = Math.sqrt(n / max);
    return k > 0.82 ? p.orange : mix(mix(p.panel2, p.blue, 0.35), p.blue, k / 0.82);
  };
  const P = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  cases.sort((u, v) => (u.w * ay + u.r * by) - (v.w * ay + v.r * by));
  const tours = cases.map((c) => {
    const x = ox + c.w * ax + c.r * bx, y = oy + c.w * ay + c.r * by;
    const h = c.n ? 6 + Math.sqrt(c.n / max) * HMAX : 2;
    const col = couleur(c.n);
    const top = [[x, y - h], [x + ax, y + ay - h], [x + ax + bx, y + ay + by - h], [x + bx, y + by - h]];
    const front = [[x + bx, y + by - h], [x + ax + bx, y + ay + by - h], [x + ax + bx, y + ay + by], [x + bx, y + by]];
    const cote = [[x + ax, y + ay - h], [x + ax + bx, y + ay + by - h], [x + ax + bx, y + ay + by], [x + ax, y + ay]];
    const poly = (pts, f, extra = '') => `<polygon points="${pts.map(([a, b]) => P(a, b)).join(' ')}" fill="${f}"${extra}/>`;
    const delai = (c.w * 0.035 + c.r * 0.02).toFixed(2);
    const vague = c.n ? poly(top, '#fff', ` class="vague" style="animation-delay:${(c.w * 0.09).toFixed(2)}s"`) : '';
    return `<g class="tour" style="animation-delay:${delai}s">${poly(cote, mix(col, '#000', 0.42))}${poly(front, mix(col, '#000', 0.24))}${poly(top, col)}${vague}</g>`;
  }).join('');

  // repères des mois, le long du bord avant
  let moisPrec = -1;
  const reperes = [];
  for (let w = 0; w < nbSem; w++) {
    const c = jours[Math.max(0, w * 7 - premier)];
    if (!c) continue;
    const m = Number(c[0].slice(5, 7)) - 1;
    if (m !== moisPrec && w > 0) {
      const x = ox + w * ax + 7 * bx, y = oy + w * ay + 7 * by + 22;
      reperes.push(t(x, y, L.mois[m], 13, p.faint, 400, MONO));
    }
    moisPrec = m;
  }

  // balise sur aujourd'hui
  const der = jours.length - 1, cw = Math.floor((der + premier) / 7), cr = (der + premier) % 7;
  const hx = ox + cw * ax + cr * bx + (ax + bx) / 2, hy = oy + cw * ay + cr * by + (ay + by) / 2;
  const hd = jours[der][1] ? 6 + Math.sqrt(jours[der][1] / max) * HMAX : 2;
  const balise = `<g class="rm">
  <line x1="${hx}" y1="${hy - hd}" x2="${hx}" y2="${hy - hd - 46}" stroke="${p.orange}" stroke-width="2" stroke-dasharray="3 4"/>
  <circle class="ping" cx="${hx}" cy="${hy - hd - 52}" r="6" fill="${p.orange}"/>
  ${t(hx - 12, hy - hd - 47, L.aujourdhui, 13, p.orange, 700, MONO, 'end')}
</g>`;

  const meilleur = d.meilleur;
  const body = `${bg}
<g class="up">
  ${t(40, 58, L.titreVille, 15, p.orange, 800, MONO, 'start', ' letter-spacing="1.5"')}
  ${t(40, 86, L.sousVille, 16, p.muted, 400, SANS)}
  ${t(W - 40, 58, `${milliers(d.total ?? 0)} contributions`, 22, p.text, 800, SANS, 'end')}
  ${meilleur ? t(W - 40, 86, L.plusHaute(dateCourte(meilleur.date, L), meilleur.n), 15, p.faint, 400, MONO, 'end') : ''}
</g>
<g>${tours}</g>
${reperes.join('')}
${balise}`;
  const style = `.tour{transform-box:fill-box;transform-origin:50% 100%;animation:pousse 16s cubic-bezier(.3,1.3,.5,1) infinite both}
@keyframes pousse{0%{transform:scaleY(0);opacity:0}8%,90%{transform:scaleY(1);opacity:1}97%,100%{transform:scaleY(0);opacity:0}}
.vague{opacity:0;animation:vague 5.3s ease-in-out infinite}
@keyframes vague{0%,70%,100%{opacity:0}80%{opacity:.45}}
.ping{animation:ping 1.6s ease-out infinite}@keyframes ping{0%{opacity:1}70%,100%{opacity:.2}}`;
  const label = lang === 'en'
    ? `My contributions over 12 months as an animated 3D city: one tower per day, ${d.total} contributions in total.`
    : `Mes contributions sur 12 mois en ville 3D animée : une tour par jour, ${d.total} contributions au total.`;
  return svg(W, H, label, body, style, defs0);
}

// ─────────────────────────────────────────────────────────── rouleau ──
// La grille des contributions, repeinte d'un coup de rouleau aux couleurs du thème.
export function renderRouleau(d, mode, theme, lang = 'fr') {
  const p = palette(mode, theme);
  const L = TXT[lang] || TXT.fr;
  const W = 1200, H = 360;
  if (!d || !d.jours?.length) return vide(p, W, H, L, L.titreRouleau);
  const [defs0, bg] = cardBg(p, W, H, '30%', '60%');
  const jours = d.jours;
  const premier = new Date(`${jours[0][0]}T12:00:00Z`).getUTCDay();
  const nbSem = Math.floor((jours.length - 1 + premier) / 7) + 1;
  const max = Math.max(...jours.map((j) => j[1]), 1);
  const C = 17, G = 4, S = C + G;
  const gw = nbSem * S - G, gh = 7 * S - G;
  const ox = Math.round((W - gw) / 2), oy = 118;
  const sous = mix(p.panel2, p.blue, 0.2);              // jour sans contribution : simple sous-couche
  const niveaux = [sous, ...[0.25, 0.5, 0.75].map((k) => mix(mix(p.panel2, p.blue, 0.35), p.blue, k)), p.orange];
  const niveau = (n) => (n ? Math.min(4, 1 + Math.floor(Math.sqrt(n / max) * 4)) : 0);
  let brut = '', peint = '';
  jours.forEach(([, n], i) => {
    const x = ox + Math.floor((i + premier) / 7) * S, y = oy + ((i + premier) % 7) * S;
    brut += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${C - 1}" height="${C - 1}" rx="4" fill="none" stroke="${p.line}" stroke-dasharray="3 2"/>`;
    peint += `<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="4" fill="${niveaux[niveau(n)]}"/>`;
  });

  // mois sous la grille
  let moisPrec = -1, reperes = '';
  for (let w = 1; w < nbSem; w++) {
    const c = jours[w * 7 - premier];
    if (!c) continue;
    const m = Number(c[0].slice(5, 7)) - 1;
    if (m !== moisPrec && moisPrec !== -1) reperes += t(ox + w * S, oy + gh + 26, L.mois[m], 13, p.faint, 400, MONO);
    moisPrec = m;
  }
  const legende = niveaux.map((c, i) => `<rect x="${W - 40 - 44 - (5 - i) * S}" y="${H - 44}" width="${C}" height="${C}" rx="4" fill="${c}"/>`).join('');

  // le rouleau : manchon vertical sur toute la hauteur, monture et manche en dessous
  const rh = gh + 16, rx0 = ox - 26;
  const rouleau = `<g class="rouleau rm">
  <path d="M${rx0 + 11} ${oy - 8 + rh / 2}h20v${rh / 2 + 34}" fill="none" stroke="${p.muted}" stroke-width="4" stroke-linejoin="round"/>
  <rect x="${rx0 + 24}" y="${oy + gh + 42}" width="14" height="44" rx="7" fill="${p.text}"/>
  <rect x="${rx0}" y="${oy - 8}" width="22" height="${rh}" rx="10" fill="${p.orange}"/>
  <rect x="${rx0 + 4}" y="${oy - 2}" width="5" height="${rh - 12}" rx="2.5" fill="#fff" opacity=".35"/>
</g>`;

  const defs = defs0 + `<clipPath id="frais"><rect class="frais" x="${ox - 6}" y="${oy - 6}" width="${gw + 12}" height="${gh + 12}"/></clipPath>`;
  const body = `${bg}
<g class="up">
  ${t(40, 58, L.titreRouleau, 15, p.orange, 800, MONO, 'start', ' letter-spacing="1.5"')}
  ${t(40, 86, L.sousRouleau, 16, p.muted, 400, SANS)}
  ${t(W - 40, 58, `${milliers(d.total ?? 0)} contributions`, 22, p.text, 800, SANS, 'end')}
</g>
<g>${brut}</g>
<g class="peint" clip-path="url(#frais)">${peint}</g>
${reperes}
${t(W - 40 - 44 - 5 * S - 8, H - 31, L.moins, 13, p.faint, 400, MONO, 'end')}${legende}${t(W - 40 - 44 + 4, H - 31, L.plus, 13, p.faint, 400, MONO)}
${rouleau}`;
  // même durée et même courbe pour le masque et le rouleau : le bord peint suit le manchon
  const style = `.frais{transform-box:fill-box;transform-origin:left;animation:frais 12s linear infinite}
@keyframes frais{0%{transform:scaleX(0)}55%,100%{transform:scaleX(1)}}
.peint{animation:seche 12s linear infinite}
@keyframes seche{0%,88%{opacity:1}97%,100%{opacity:0}}
.rouleau{animation:roule 12s linear infinite}
@keyframes roule{0%{transform:translateX(0);opacity:1}55%{transform:translateX(${gw + 12}px);opacity:1}62%,100%{transform:translateX(${gw + 60}px);opacity:0}}
@media (prefers-reduced-motion: reduce){.frais{transform:none}}`;
  const label = lang === 'en'
    ? `My contributions over 12 months as a wall repainted by a paint roller: one square per day, ${d.total} contributions in total.`
    : `Mes contributions sur 12 mois en mur repeint au rouleau : une case par jour, ${d.total} contributions au total.`;
  return svg(W, H, label, body, style, defs);
}
