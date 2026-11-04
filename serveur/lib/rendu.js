// Rendu SVG côté serveur : mêmes couleurs, polices et règles que .github/scripts/profil.py.
export const SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Inter, Arial, sans-serif";
export const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', 'DejaVu Sans Mono', Menlo, monospace";

export const PAL = {
  dark: { bg: '#0B1220', panel: '#0F1729', panel2: '#131D33', line: '#22304D', grid: '#1A2742', text: '#EEF3FA',
    muted: '#8A9BB8', faint: '#5C6E8F', orange: '#FF6A13', blue: '#4A92FF', green: '#3FB950', red: '#F85149', glow: '.18' },
  light: { bg: '#F7F4EE', panel: '#FFFFFF', panel2: '#FBF9F5', line: '#E3DCCF', grid: '#E9E3D8', text: '#14213D',
    muted: '#5B6B85', faint: '#97A3B6', orange: '#F0600F', blue: '#1D5FA3', green: '#1A7F37', red: '#CF222E', glow: '.12' },
};

export const COULEURS = {
  orange: '#FF6A13', bleu: '#2F7BEA', vert: '#3FB950', jaune: '#F2CC60', rose: '#F778BA', violet: '#A371F7', blanc: '#EFE9DD',
};
export const COLS = 24;
export const ROWS = 6;
export const CASES = COLS * ROWS;

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function t(x, y, s, size, fill, weight = 400, font = SANS, anchor = 'start', extra = '') {
  const a = anchor !== 'start' ? ` text-anchor="${anchor}"` : '';
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}"${a}${extra}>${esc(s)}</text>`;
}

const REDUCED = '@media (prefers-reduced-motion: reduce){*{animation:none!important}.rm{display:none}}';
const BASE_CSS = `.up{animation:up .8s cubic-bezier(.2,.8,.2,1) both}
@keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.pulse{animation:pulse 2s ease-in-out infinite}@keyframes pulse{50%{opacity:.25}}`;

function svg(w, h, label, body, style = '', defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title><defs>${defs}</defs><style>${BASE_CSS}${style}${REDUCED}</style>${body}</svg>`;
}

function cardBg(p, w, h, gx = '50%', gy = '50%') {
  const defs = `<pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="${p.grid}"/></pattern>
<radialGradient id="fd" cx="${gx}" cy="${gy}" r="80%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="m"><rect width="${w}" height="${h}" fill="url(#fd)"/></mask>
<radialGradient id="gl" cx="${gx}" cy="${gy}" r="50%"><stop offset="0" stop-color="${p.orange}" stop-opacity="${p.glow}"/><stop offset="1" stop-color="${p.orange}" stop-opacity="0"/></radialGradient>
<clipPath id="card"><rect width="${w}" height="${h}" rx="22"/></clipPath>`;
  const body = `<g clip-path="url(#card)"><rect width="${w}" height="${h}" fill="${p.bg}"/><rect width="${w}" height="${h}" fill="url(#g)" mask="url(#m)"/><rect width="${w}" height="${h}" fill="url(#gl)"/></g>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="21.5" fill="none" stroke="${p.line}"/>`;
  return [defs, body];
}

export function relatif(iso, now = new Date()) {
  const m = Math.floor((now - new Date(iso)) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} jour${j > 1 ? 's' : ''}`;
}

// ─────────────────────────────────────────────────────────────── le mur ──
export function renderMur(etat, mode, now = new Date()) {
  const p = PAL[mode] || PAL.dark;
  const W = 1200, H = 470, cell = 42, gap = 6;
  let [defs, bg] = cardBg(p, W, H);
  const x0 = Math.floor((W - (COLS * (cell + gap) - gap)) / 2), y0 = 92;
  const peintes = new Map(etat.cases.map((c) => [c.case, c]));
  const derniere = etat.cases[etat.cases.length - 1];
  const fresh = derniere && now - new Date(derniere.le) < 10 * 60000; // repeinte récente : rouleau visible
  const cases = [];
  for (let k = 0; k < CASES; k++) {
    const col = k % COLS, row = Math.floor(k / COLS);
    const x = x0 + col * (cell + gap), y = y0 + row * (cell + gap);
    const wave = ((col + row) * 0.06).toFixed(2);
    const c = peintes.get(k);
    if (!c) {
      cases.push(`<rect class="vide" style="animation-delay:${wave}s" x="${x + 0.75}" y="${y + 0.75}" width="${cell - 1.5}" height="${cell - 1.5}" rx="7" fill="${p.panel2}" stroke="${p.faint}" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="4 4"/>`);
      continue;
    }
    const coul = COULEURS[c.couleur];
    const bord = c.couleur === 'blanc' && mode === 'light' ? ` stroke="${p.line}"` : '';
    const titre = `<title>${esc(c.couleur)} · ${esc(relatif(c.le, now))}</title>`;
    if (c === derniere) {
      cases.push(`<g>${titre}<clipPath id="dc"><rect class="neuf" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="7"/></clipPath>
<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="7" fill="${coul}" fill-opacity=".18"/>
<rect clip-path="url(#dc)" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="7" fill="${coul}"${bord}/>
<rect class="rouleau rm" x="${x - 4}" y="${y - 3}" width="${cell + 8}" height="7" rx="3.5" fill="${p.text}"/>
<rect class="halo rm" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="7" fill="none" stroke="${coul}" stroke-width="3"/></g>`);
    } else {
      cases.push(`<rect class="pop" style="animation-delay:${(0.2 + +wave).toFixed(2)}s" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="7" fill="${coul}"${bord}>${titre}</rect>`);
    }
  }
  const n = etat.cases.length;
  const gy = y0 + ROWS * (cell + gap) - gap;
  const bas = derniere
    ? `Dernière touche : <tspan fill="${COULEURS[derniere.couleur]}" font-weight="700">${esc(derniere.couleur)}</tspan> <tspan fill="${p.text}" font-weight="700">${esc(relatif(derniere.le, now))}</tspan>${fresh ? ` <tspan fill="${p.orange}">· peinture fraîche</tspan>` : ''}`
    : `Le mur est vierge. <tspan fill="${p.text}" font-weight="700">Sois le premier à peindre</tspan>`;
  // répartition des couleurs de la couche en cours
  const parCouleur = Object.keys(COULEURS).map((k) => [k, etat.cases.filter((c) => c.couleur === k).length]);
  const totalC = Math.max(n, 1);
  let bx = W - x0 - 260;
  const barres = n
    ? parCouleur.filter(([, v]) => v).map(([k, v]) => {
      const w = Math.max((260 * v) / totalC, 4);
      const r = `<rect x="${bx.toFixed(1)}" y="${gy + 54}" width="${(w - 2).toFixed(1)}" height="14" rx="3" fill="${COULEURS[k]}"><title>${k} : ${v}</title></rect>`;
      bx += w;
      return r;
    }).join('')
    : t(W - x0, gy + 70, 'choisis ta couleur ↓', 19, p.faint, 400, MONO, 'end');
  defs += `<linearGradient id="lu" x1="0" x2="1" y1="0" y2=".3"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="zone"><rect x="${x0}" y="${y0}" width="${COLS * (cell + gap) - gap}" height="${gy - y0}"/></clipPath>`;
  const total = etat.total;
  const body = `${bg}
<g class="up"><circle class="pulse" cx="${x0 + 6}" cy="50" r="6" fill="${p.red}"/>
${t(x0 + 22, 56, `EN DIRECT · LE MUR · COUCHE N°${etat.couche}`, 17, p.faint, 400, MONO, 'start', ' letter-spacing="2"')}
${t(W - x0, 56, `${total} coup${total > 1 ? 's' : ''} de pinceau · ${n}/${CASES}`, 20, p.text, 700, MONO, 'end')}</g>
${cases.join('')}
<g clip-path="url(#zone)"><rect class="lustre rm" x="${x0 - 400}" y="${y0}" width="300" height="${gy - y0}" fill="url(#lu)"/></g>
<rect x="${x0}" y="${gy + 26}" width="${W - 2 * x0}" height="6" rx="3" fill="${p.panel2}"/>
<rect class="jauge" x="${x0}" y="${gy + 26}" width="${Math.max(((W - 2 * x0) * n) / CASES, 6).toFixed(0)}" height="6" rx="3" fill="${p.orange}"/>
<g class="up" style="animation-delay:.5s"><text x="${x0}" y="${gy + 70}" font-family="${SANS}" font-size="22" fill="${p.muted}">${bas}</text>${barres}</g>`;
  const style = `.vide{animation:vide 4s ease-in-out infinite}@keyframes vide{0%,100%{opacity:.45}50%{opacity:1}}
.pop{transform-box:fill-box;transform-origin:center;animation:pop .5s cubic-bezier(.3,1.6,.5,1) both}@keyframes pop{from{transform:scale(0)}to{transform:scale(1)}}
.neuf{transform-box:fill-box;transform-origin:top;animation:neuf 4s infinite}@keyframes neuf{0%,8%{transform:scaleY(0)}40%,100%{transform:scaleY(1)}}
.rouleau{animation:rouleau 4s infinite}@keyframes rouleau{0%,8%{transform:translateY(0);opacity:1}40%{transform:translateY(${cell}px);opacity:1}50%,100%{transform:translateY(${cell}px);opacity:0}}
.halo{transform-box:fill-box;transform-origin:center;animation:halo 4s 1.6s infinite}@keyframes halo{0%{transform:scale(1);opacity:.9}30%,100%{transform:scale(1.8);opacity:0}}
.lustre{animation:lustre 6s 1s ease-in-out infinite}@keyframes lustre{0%{transform:translateX(0)}50%,100%{transform:translateX(${W + 600}px)}}
.jauge{transform-box:fill-box;transform-origin:left;animation:jauge 1.6s .4s cubic-bezier(.6,0,.2,1) both}@keyframes jauge{from{transform:scaleX(0)}to{transform:scaleX(1)}}`;
  return svg(W, H, `Mur de peinture collectif en direct : couche n°${etat.couche}, ${n} cases peintes sur ${CASES}, ${total} coups de pinceau.`, body, style, defs);
}

// ──────────────────────────────────────────────────── terminal en direct ──
export function renderTerminal(d, mode) {
  const p = PAL[mode] || PAL.dark;
  const W = 1200, H = 300;
  const fs = 21, lh = 38, cw = 12.65, x0 = 40, ytop = 92;
  const ok = (s) => (s.ok ? p.green : p.red);
  const lines = [
    [['$ ', p.orange], ['date', p.text], ['  # heure de Paris, calculée à ton affichage', p.faint]],
    [[`  ${d.date}`, p.muted]],
    [['$ ', p.orange], ['curl -s batipro mywattup', p.text], ['  # ping réel, à l’instant', p.faint]],
    [['  Bâtipro   ', p.muted], [d.sites[0].ok ? '● en ligne' : '● hors ligne', ok(d.sites[0])], [d.sites[0].ok ? `  ${d.sites[0].ms} ms` : '', p.text],
      ['     MyWattUp  ', p.muted], [d.sites[1].ok ? '● en ligne' : '● hors ligne', ok(d.sites[1])], [d.sites[1].ok ? `  ${d.sites[1].ms} ms` : '', p.text]],
    [['$ ', p.orange], [d.salut, p.text]],
  ];
  const C = 12;
  const pc = (s) => `${Math.min(Math.max((s / C) * 100, 0), 100).toFixed(2)}%`;
  let delay = 0.4;
  const out = [], kf = [];
  lines.forEach((toks, i) => {
    const y = ytop + i * lh;
    const n = toks.reduce((a, [s]) => a + s.length, 0);
    const typed = toks[0][0] === '$ ';
    const dur = typed ? Math.max(n * 0.03, 0.2) : 0.05;
    const s0 = delay, s1 = delay + dur;
    out.push(`<text x="${x0}" y="${y}" font-family="${MONO}" font-size="${fs}" xml:space="preserve">${toks.map(([s, c]) => `<tspan fill="${c}">${esc(s)}</tspan>`).join('')}</text>`);
    out.push(`<rect class="rm" style="animation:ty${i} ${C}s linear infinite" x="${x0 - 2}" y="${y - 26}" width="${W - x0 - 20}" height="${lh}" fill="${p.panel}"/>`);
    const dist = (n * cw + 20).toFixed(0);
    kf.push(`@keyframes ty${i}{0%,${pc(s0)}{transform:translateX(0);opacity:1;animation-timing-function:steps(${Math.max(n, 1)},end)}${pc(s1)},${pc(C * 0.92)}{transform:translateX(${dist}px);opacity:1}${pc(C * 0.97)},100%{transform:translateX(0);opacity:1}}`);
    delay = s1 + (typed ? 0.35 : 0.25);
  });
  const [defs, bg] = cardBg(p, W, H, '85%', '30%');
  const body = `${bg}
<rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="16" fill="${p.panel}" stroke="${p.line}"/>
<circle cx="46" cy="46" r="6" fill="#FF5F57"/><circle cx="66" cy="46" r="6" fill="#FEBC2E"/><circle cx="86" cy="46" r="6" fill="#28C840"/>
${t(W / 2, 52, 'osman@chantier: ~ (en direct)', 16, p.faint, 400, MONO, 'middle')}
<circle class="pulse" cx="${W - 120}" cy="46" r="5" fill="${p.red}"/>${t(W - 44, 52, 'LIVE', 15, p.red, 800, MONO, 'end', ' letter-spacing="2"')}
<clipPath id="win"><rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="16"/></clipPath><g clip-path="url(#win)">${out.join('')}</g>
<g class="rm" style="animation:cur ${C}s linear infinite" opacity="0"><rect class="blink" x="${x0 + (d.salut.length + 2) * cw + 4}" y="${ytop + 4 * lh - 21}" width="11" height="24" fill="${p.orange}"/></g>`;
  kf.push(`@keyframes cur{0%,${pc(delay - 0.36)}{opacity:0}${pc(delay - 0.35)},${pc(C * 0.92)}{opacity:1}${pc(C * 0.93)},100%{opacity:0}}`);
  const style = `.blink{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}\n${kf.join('\n')}`;
  const label = `Terminal en direct : ${d.date}. Bâtipro ${d.sites[0].ok ? `en ligne, ${d.sites[0].ms} ms` : 'hors ligne'} ; MyWattUp ${d.sites[1].ok ? `en ligne, ${d.sites[1].ms} ms` : 'hors ligne'}.`;
  return svg(W, H, label, body, style, defs);
}

// ──────────────────────────────────────────────────── compteur de visites ──
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const jourCourt = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MOIS[m - 1]}`; };
export const milliers = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function joursRecents(jours, aujourdhui, n = 30) {
  const out = [];
  const base = new Date(`${aujourdhui}T12:00:00Z`);
  for (let i = n - 1; i >= 0; i--) {
    const k = new Date(base - i * 86400000).toISOString().slice(0, 10);
    out.push([k, jours[k] || 0]);
  }
  return out;
}

export function renderVues(v, mode, now = new Date()) {
  const p = PAL[mode] || PAL.dark;
  const { etat, numero, precedente, aujourdhui } = v;
  const W = 1200, H = 372;
  const [defs0, bg] = cardBg(p, W, H, '20%', '40%');
  // compteur façon odomètre : une colonne 0-9 par chiffre, qui roule jusqu'à sa valeur
  const digits = milliers(numero).split('');
  const fs = 96, L = 104, dw = 58, x0 = 40, yb = 196;
  let x = x0;
  const odo = [], kf = [];
  digits.forEach((c, i) => {
    if (c === ' ') { x += 22; return; }
    const d = Number(c);
    const col = Array.from({ length: 10 }, (_, k) => `<text x="${x}" y="${yb + k * L}" font-family="${MONO}" font-size="${fs}" font-weight="800" fill="${p.text}">${k}</text>`).join('');
    odo.push(`<g clip-path="url(#od)"><g class="od" style="animation:o${i} ${(1.2 + i * 0.18).toFixed(2)}s ${(0.2 + i * 0.05).toFixed(2)}s cubic-bezier(.2,.9,.25,1) both">${col}</g></g>`);
    kf.push(`@keyframes o${i}{from{transform:translateY(0)}to{transform:translateY(-${d * L}px)}}`);
    x += dw;
  });
  const odoW = x - x0;
  // 30 derniers jours
  const serie = joursRecents(etat.jours, aujourdhui);
  const max = Math.max(...serie.map(([, n]) => n), 1);
  const gx = 640, gw = 520, gyb = 226, gh = 118, bw = gw / 30;
  const barres = serie.map(([k, n], i) => {
    const h = Math.max((gh * n) / max, n ? 4 : 2);
    const auj = i === serie.length - 1;
    return `<rect class="${auj ? 'bar auj' : 'bar'}" style="animation-delay:${(0.3 + i * 0.03).toFixed(2)}s" x="${(gx + i * bw + 2).toFixed(1)}" y="${(gyb - h).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${auj ? p.orange : p.blue}" fill-opacity="${auj ? 1 : 0.75}"><title>${jourCourt(k)} : ${n} visite${n > 1 ? 's' : ''}</title></rect>`;
  }).join('');
  const sur30 = serie.reduce((a, [, n]) => a + n, 0);
  const auj = serie[serie.length - 1][1];
  // thème des visiteurs
  const td = etat.theme.dark || 0, tl = etat.theme.light || 0, tt = Math.max(td + tl, 1);
  const pd = Math.round((td * 100) / tt);
  const tw = 520;
  const theme = td + tl
    ? `<rect x="${x0}" y="300" width="${tw}" height="10" rx="5" fill="${p.panel2}"/>
<rect class="jauge" x="${x0}" y="300" width="${Math.max((tw * pd) / 100, 6).toFixed(0)}" height="10" rx="5" fill="${p.blue}"/>
${t(x0, 340, `☾ ${pd} % en mode sombre`, 19, p.muted, 400, SANS)}${t(x0 + tw, 340, `${100 - pd} % en clair ☀`, 19, p.muted, 400, SANS, 'end')}`
    : '';
  // bandeau défilant des dernières visites
  const items = etat.dernieres.slice(0, 12).map((d) => {
    const hh = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(d.le));
    return `n°${milliers(d.n)} · ${hh} · ${d.th === 'light' ? 'clair' : 'sombre'}`;
  });
  const ligne = items.join('     ◆     ');
  const lw = Math.max(ligne.length * 10.4 + 60, 600);
  const ticker = items.length
    ? `<clipPath id="tk"><rect x="${gx}" y="284" width="${gw}" height="70"/></clipPath><g clip-path="url(#tk)">
${t(gx, 306, 'DERNIÈRES VISITES (ANONYMES)', 14, p.faint, 400, MONO, 'start', ' letter-spacing="2"')}
<g class="tick rm">${t(gx, 338, `${ligne}     ◆     `, 17, p.muted, 400, MONO, 'start', ' xml:space="preserve"')}${t(gx + lw, 338, ligne, 17, p.muted, 400, MONO, 'start', ' xml:space="preserve"')}</g></g>`
    : '';
  const prec = precedente ? `La visite d’avant : ${relatif(precedente, now)}` : 'Tu ouvres le compteur !';
  const defs = `${defs0}<clipPath id="od"><rect x="${x0 - 4}" y="${yb - fs + 12}" width="${odoW + 8}" height="${L - 6}"/></clipPath>`;
  const body = `${bg}
<g class="up"><circle class="pulse" cx="${x0 + 6}" cy="50" r="6" fill="${p.red}"/>
${t(x0 + 22, 56, 'EN DIRECT · VISITES DU PROFIL', 17, p.faint, 400, MONO, 'start', ' letter-spacing="2"')}
${t(W - 40, 56, 'tableau de bord complet →', 18, p.orange, 700, MONO, 'end')}</g>
${odo.join('')}
<g class="up" style="animation-delay:1s">${t(x0, 246, 'Tu es la visite ', 24, p.muted, 400, SANS)}<text x="${x0 + 164}" y="246" font-family="${SANS}" font-size="24" font-weight="800" fill="${p.orange}">n°${esc(milliers(numero))}</text>
${t(x0, 280, prec, 19, p.faint, 400, SANS)}</g>
${theme}
${t(gx, 92, '30 DERNIERS JOURS', 14, p.faint, 400, MONO, 'start', ' letter-spacing="2"')}
${t(gx + gw, 92, `record ${etat.record.n}/jour`, 16, p.faint, 400, MONO, 'end')}
${t(gx, gyb + 30, `${auj} aujourd’hui`, 17, p.orange, 700, MONO)}${t(gx + gw, gyb + 30, `${sur30} visites sur 30 jours`, 17, p.muted, 400, MONO, 'end')}
<line x1="${gx}" y1="${gyb + 0.5}" x2="${gx + gw}" y2="${gyb + 0.5}" stroke="${p.line}"/>
${barres}
${ticker}`;
  const style = `.bar{transform-box:fill-box;transform-origin:bottom;animation:bar .9s cubic-bezier(.3,1.4,.5,1) both}@keyframes bar{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.auj{animation:bar .9s 1.2s cubic-bezier(.3,1.4,.5,1) both,aujp 2s 2.2s ease-in-out infinite}@keyframes aujp{50%{fill-opacity:.45}}
.jauge{transform-box:fill-box;transform-origin:left;animation:jauge 1.6s .6s cubic-bezier(.6,0,.2,1) both}@keyframes jauge{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.tick{animation:tick ${Math.max(lw / 45, 12).toFixed(1)}s linear infinite}@keyframes tick{to{transform:translateX(-${lw.toFixed(0)}px)}}
${kf.join('\n')}`;
  const label = `Visites du profil en direct : ${numero}. Tu es la visite numéro ${numero}. ${auj} aujourd’hui, ${sur30} sur 30 jours.`;
  return svg(W, H, label, body, style, defs);
}
