// Cartes dynamiques supplémentaires : réactions des visiteurs et « En direct ».
import { MONO, SANS, cardBg, esc, palette, relatif, svg, t } from './rendu.js';
import { ORDRE_REACTIONS, REACTIONS } from './reactions.js';

const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
const fr = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ─────────────────────────────────────────────────────────── réactions ──
export function renderReactions(e, mode, now = new Date(), theme) {
  const p = palette(mode, theme);
  const W = 1200, H = 330;
  const [defs, bg] = cardBg(p, W, H, '20%', '20%');
  const compte = e.compte || {};
  const max = Math.max(1, ...ORDRE_REACTIONS.map((k) => compte[k] || 0));
  const top = ORDRE_REACTIONS.reduce((a, k) => ((compte[k] || 0) > (compte[a] || 0) ? k : a), ORDRE_REACTIONS[0]);
  const derniere = (e.dernieres || [])[0];
  const tw = 212, gap = 12, x0 = (W - (5 * tw + 4 * gap)) / 2, y0 = 86, th = 176;
  const tuiles = ORDRE_REACTIONS.map((k, i) => {
    const r = REACTIONS[k];
    const n = compte[k] || 0;
    const x = x0 + i * (tw + gap);
    const lead = n > 0 && k === top;
    const bw = Math.max(n ? ((tw - 48) * n) / max : 0, n ? 8 : 0);
    const recent = derniere && derniere.r === k && now - new Date(derniere.le) < 15 * 60000;
    return `<g class="up" style="animation-delay:${(0.1 + i * 0.08).toFixed(2)}s">
  <rect x="${x}" y="${y0}" width="${tw}" height="${th}" rx="18" fill="${p.panel}" stroke="${lead ? p.orange : p.line}" stroke-width="${lead ? 2 : 1}"/>
  ${lead ? `<rect class="halo" x="${x}" y="${y0}" width="${tw}" height="${th}" rx="18" fill="none" stroke="${p.orange}" stroke-width="2"/>` : ''}
  <g transform="translate(${x + 24} ${y0 + 62})"><g class="hop" style="animation-delay:${(i * 0.35).toFixed(2)}s"><text font-family="${EMOJI}" font-size="46">${r.e}</text></g></g>
  ${lead ? t(x + tw - 18, y0 + 30, 'N°1', 14, p.orange, 800, MONO, 'end', ' letter-spacing="1"') : ''}
  ${recent ? `<circle class="pulse" cx="${x + tw - 22}" cy="${y0 + (lead ? 48 : 24)}" r="5" fill="${p.green}"/>` : ''}
  ${t(x + 24, y0 + 112, fr(n), 38, p.text, 800, SANS, 'start', ' letter-spacing="-1"')}
  ${t(x + 24, y0 + 138, r.nom, 16, p.muted, 600)}
  <rect x="${x + 24}" y="${y0 + 152}" width="${tw - 48}" height="6" rx="3" fill="${p.grid}"/>
  <rect class="bar" style="animation-delay:${(0.4 + i * 0.1).toFixed(2)}s" x="${x + 24}" y="${y0 + 152}" width="${bw.toFixed(1)}" height="6" rx="3" fill="${lead ? p.orange : p.blue}"/>
</g>`;
  }).join('\n');
  const flux = (e.dernieres || []).slice(0, 6).map((d) => `${REACTIONS[d.r]?.e || '·'} ${relatif(d.le, now)}${d.pays ? ` · ${d.pays}` : ''}`);
  const bas = flux.length
    ? `<tspan fill="${p.faint}">dernières : </tspan><tspan fill="${p.muted}">${esc(flux.join('   '))}</tspan>`
    : `<tspan fill="${p.faint}">aucune réaction pour l'instant : sois le premier, clique un emoji juste en dessous</tspan>`;
  const body = `${bg}
<g class="up">
  <rect x="32" y="30" width="148" height="30" rx="15" fill="${p.orange}" fill-opacity=".14"/>
  <circle class="pulse" cx="50" cy="45" r="6" fill="${p.orange}"/>
  ${t(62, 51, 'RÉACTIONS', 15, p.orange, 800, MONO, 'start', ' letter-spacing="1.5"')}
  ${t(196, 51, 'un clic sur un emoji juste en dessous, pas de compte', 17, p.muted, 400, MONO)}
  ${t(W - 32, 51, `${fr(e.total || 0)} au total${derniere ? ` · dernière ${relatif(derniere.le, now)}` : ''}`, 15, p.faint, 400, MONO, 'end')}
</g>
${tuiles}
<g class="up" style="animation-delay:.6s"><text x="32" y="${H - 32}" font-family="${MONO}" font-size="16" xml:space="preserve">${bas}</text></g>`;
  const style = `.hop{animation:hop 4s cubic-bezier(.3,1.6,.5,1) infinite}
@keyframes hop{0%,78%,100%{transform:none}84%{transform:translateY(-10px) rotate(-8deg) scale(1.12)}90%{transform:translateY(0) rotate(5deg)}}
.bar{transform-box:fill-box;transform-origin:left;animation:bar 1.1s cubic-bezier(.6,0,.2,1) both}
@keyframes bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.halo{animation:halo 2.4s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes halo{from{opacity:.8;transform:scale(1)}to{opacity:0;transform:scale(1.06)}}`;
  const label = `Réactions au profil : ${ORDRE_REACTIONS.map((k) => `${REACTIONS[k].nom} ${compte[k] || 0}`).join(', ')}.`;
  return svg(W, H, label, body, style, defs);
}

// ───────────────────────────────────────────────────────────── en direct ──
const SITES = [['batipro', 'Bâtipro'], ['mywattup', 'MyWattUp']];
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', weekday: 'short', hourCycle: 'h23' });
const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
function paris(d) {
  const o = Object.fromEntries(FMT.formatToParts(d).map((x) => [x.type, x.value]));
  return { h: Number(o.hour), hm: `${o.hour}:${o.minute}`, dm: `${o.day}/${o.month}`, wd: WD[o.weekday] };
}

function graine(s) {
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

function ciel(p, heure, x, y, w, h) {
  let moment, haut, jour;
  if (heure >= 7 && heure < 18) [moment, haut, jour] = ['jour', ['#4A92FF', '#BFDBFF'], true];
  else if ([6, 18, 19, 20].includes(heure)) [moment, haut, jour] = [heure === 6 ? 'aube' : 'soir', ['#3B2A5C', '#FF8A4C'], true];
  else [moment, haut, jour] = ['nuit', ['#070C18', '#1A2742'], false];
  const defs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${haut[0]}"/><stop offset="1" stop-color="${haut[1]}"/></linearGradient>
<clipPath id="skyc"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/></clipPath>`;
  const k = (((heure - 6) % 12) + 12) % 12;
  const ax = x + w * (0.2 + (0.68 * k) / 12), ay = y + 150 + (34 * Math.abs(k - 6)) / 6;
  const parts = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky)"/>`];
  if (!jour) {
    const rnd = graine(heure + 1);
    for (let i = 0; i < 26; i++) {
      const sx = x + rnd() * w, sy = y + (rnd() < 0.4 ? 12 : 120) + rnd() * 60;
      parts.push(`<circle class="star" style="animation-delay:${(rnd() * 3).toFixed(2)}s" cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${[1, 1.3, 1.8][Math.floor(rnd() * 3)]}" fill="#fff"/>`);
    }
    parts.push(`<circle cx="${ax.toFixed(0)}" cy="${ay.toFixed(0)}" r="20" fill="#F2EAD3"/><circle cx="${(ax + 9).toFixed(0)}" cy="${(ay - 6).toFixed(0)}" r="18" fill="${haut[0]}"/>`);
  } else {
    const rays = Array.from({ length: 12 }, (_, i) => `<rect x="-2" y="-40" width="4" height="12" rx="2" fill="#FFD36B" transform="rotate(${i * 30})"/>`).join('');
    parts.push(`<g transform="translate(${ax.toFixed(0)} ${ay.toFixed(0)})"><g class="spin">${rays}</g><circle r="20" fill="#FFD36B"/></g>`);
    parts.push(`<g class="cloud"><ellipse cx="${x + 60}" cy="${y + 50}" rx="30" ry="10" fill="#fff" fill-opacity=".7"/><ellipse cx="${x + 80}" cy="${y + 44}" rx="20" ry="11" fill="#fff" fill-opacity=".7"/></g>`);
  }
  const by = y + h - 120, bat = jour ? '#22304D' : '#0B1220';
  parts.push(`<rect x="${x + 40}" y="${by}" width="110" height="120" fill="${bat}"/><rect x="${x + 170}" y="${by + 36}" width="90" height="84" fill="${bat}"/>
<path d="M${x + 150} ${by - 6}V${y + h}M${x + 170} ${by - 6}V${y + h}M${x + 150} ${by + 30}H${x + 170}M${x + 150} ${by + 70}H${x + 170}" stroke="${p.orange}" stroke-width="3"/>`);
  const rnd = graine(7);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const on = !jour && rnd() < 0.45;
      const fill = on ? '#FFD36B' : jour ? '#3A4A6A' : '#2B3A57';
      parts.push(`<rect${on ? ' class="win"' : ''} style="animation-delay:${(rnd() * 4).toFixed(1)}s" x="${x + 56 + c * 30}" y="${by + 14 + r * 26}" width="16" height="14" rx="2" fill="${fill}"/>`);
    }
  }
  const body = `<g clip-path="url(#skyc)">${parts.join('')}</g><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="16" fill="none" stroke="${p.line}"/>`;
  return [defs, body, moment];
}

function sparkline(pts, x, y, w, h, color, gid, red) {
  if (!pts.length) return ['', ''];
  const vals = pts.map((q) => (q.ok ? q.ms : null));
  const oks = vals.filter((v) => v !== null);
  const hi = Math.max(Math.max(...(oks.length ? oks : [1])) * 1.15, 200);
  const n = Math.max(pts.length, 2);
  const co = vals.map((v, i) => [x + (w * i) / (n - 1), y + h - (v !== null ? (h * v) / hi : 0)]);
  const line = 'M' + co.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(' L');
  const area = `${line} L${co[co.length - 1][0].toFixed(1)} ${y + h} L${co[0][0].toFixed(1)} ${y + h}Z`;
  const down = vals.map((v, i) => (v === null ? `<rect x="${(co[i][0] - 2).toFixed(1)}" y="${y}" width="4" height="${h}" fill="${red}" fill-opacity=".5"/>` : '')).join('');
  const [ex, ey] = co[co.length - 1];
  const defs = `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`;
  const body = `<path d="${area}" fill="url(#${gid})"/>${down}
<path class="trace" pathLength="100" d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
<circle class="ping rm" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="none" stroke="${color}" stroke-width="2"/>
<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="4.5" fill="${color}"/>`;
  return [defs, body];
}

export function renderLive(hist, mode, now = new Date(), theme) {
  const p = palette(mode, theme);
  const W = 1200, H = 480;
  let [defs, bg] = cardBg(p, W, H, '70%', '30%');
  const pa = paris(now);
  const [cd, cb, moment] = ciel(p, pa.h, 32, 84, 330, 300);
  defs += cd;
  const clock = `<g class="up">
  <text x="56" y="152" font-family="${SANS}" font-size="64" font-weight="800" fill="#fff" letter-spacing="-2">${pa.hm}</text>
  ${t(58, 182, `Paris · ${JOURS[pa.wd]} · ${moment}`, 19, '#fff', 600, MONO, 'start', ' fill-opacity=".85"')}
</g>`;
  const rx = 394, rw = W - 394 - 32;
  const rows = SITES.map(([key, nom], i) => {
    const pts = hist[key] || [];
    const last = pts[pts.length - 1] || { ok: false, code: 0, ms: 0 };
    const up = pts.length ? (pts.filter((q) => q.ok).length / pts.length) * 100 : 0;
    const oks = pts.filter((q) => q.ok).map((q) => q.ms);
    const moy = oks.length ? Math.round(oks.reduce((a, b) => a + b, 0) / oks.length) : 0;
    let col = last.ok ? p.green : p.red;
    let etat = last.ok ? 'opérationnel' : last.code === 0 ? 'hors ligne' : `erreur ${last.code}`;
    if (!pts.length) [etat, col] = ['première mesure à venir', p.faint];
    const y = 84 + i * 156;
    const [sd, sb] = sparkline(pts, rx + 330, y + 30, rw - 360, 96, i === 0 ? p.orange : p.blue, `sp${i}`, p.red);
    defs += sd;
    return `<g class="up" style="animation-delay:${(0.2 + i * 0.2).toFixed(1)}s">
  <rect x="${rx}" y="${y}" width="${rw}" height="142" rx="16" fill="${p.panel}" stroke="${p.line}"/>
  ${t(rx + 24, y + 46, nom, 30, p.text, 800, SANS, 'start', ' letter-spacing="-.5"')}
  <circle class="pulse" cx="${rx + 32}" cy="${y + 74}" r="6" fill="${col}"/>
  ${t(rx + 46, y + 80, etat, 17, col, 700, MONO)}
  <text x="${rx + 24}" y="${y + 122}" font-family="${SANS}" font-size="34" font-weight="800" fill="${p.text}">${last.ok ? last.ms : '—'}<tspan font-size="18" fill="${p.muted}" font-weight="400"> ms</tspan></text>
  ${t(rx + rw - 22, y + 24, `dispo ${up.toFixed(1)} % · moy. ${moy} ms · 24 h`.replace('.', ','), 15, p.faint, 400, MONO, 'end')}
  ${sb}
</g>`;
  }).join('\n');
  const c = hist._commit;
  let bas;
  if (c) {
    const msg = c.msg.length <= 58 ? c.msg : `${c.msg.slice(0, 56)}…`;
    bas = `<tspan fill="${p.faint}">dernier commit public · </tspan><tspan fill="${p.blue}">${esc(c.repo)}</tspan><tspan fill="${p.text}"> « ${esc(msg)} »</tspan><tspan fill="${p.faint}"> · ${relatif(c.le, now)}</tspan>`;
  } else bas = `<tspan fill="${p.faint}">dernier commit public : aucun récemment</tspan>`;
  const mesure = 'mesuré à l’instant · historique 24 h';
  const body = `${bg}
<g class="up">
  <rect x="32" y="30" width="134" height="30" rx="15" fill="${p.red}" fill-opacity=".14"/>
  <circle class="pulse" cx="50" cy="45" r="6" fill="${p.red}"/>
  ${t(62, 51, 'EN DIRECT', 15, p.red, 800, MONO, 'start', ' letter-spacing="1.5"')}
  ${t(182, 51, 'salle des machines', 17, p.muted, 400, MONO)}
  ${t(W - 32, 51, mesure, 15, p.faint, 400, MONO, 'end')}
</g>
${cb}
${clock}
${rows}
<g class="up" style="animation-delay:.7s"><text x="32" y="${H - 34}" font-family="${MONO}" font-size="17">${bas}</text></g>`;
  const style = `.star{animation:tw 3s ease-in-out infinite}@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
.spin{animation:spin 24s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.cloud{animation:cloud 30s linear infinite}@keyframes cloud{from{transform:translateX(-120px)}to{transform:translateX(380px)}}
.win{animation:win 6s steps(1) infinite}@keyframes win{0%,70%{opacity:1}85%{opacity:.35}}
.trace{stroke-dasharray:100 100;animation:trace 10s infinite}
@keyframes trace{0%{stroke-dashoffset:100;animation-timing-function:cubic-bezier(.6,0,.3,1)}25%,100%{stroke-dashoffset:0}}
.ping{transform-box:fill-box;transform-origin:center;animation:ping 2s ease-out infinite}
@keyframes ping{from{transform:scale(1);opacity:.9}to{transform:scale(3.2);opacity:0}}`;
  const label = `En direct : il est ${pa.hm} à Paris. ` + SITES.map(([k, nom]) => {
    const l = (hist[k] || []).slice(-1)[0];
    return `${nom} ${l?.ok ? `en ligne, ${l.ms} ms` : 'hors ligne'}`;
  }).join(' ; ') + '.';
  return svg(W, H, label, body, style, defs);
}

// ──────────────────────────────────────────── bouton du menu des thèmes ──
export function renderThemeActuel(th, themes, ordre, now = new Date(), lang = 'fr') {
  const en = lang === 'en';
  const id = themes[th.theme] ? th.theme : 'chantier';
  const p = palette('dark', id);
  const W = 1200, H = 112;
  const [defs, bg] = cardBg(p, W, H, '12%', '50%');
  const nomTheme = (k) => (en ? ({ neon: 'Neon', ocean: 'Ocean', sunset: 'Sunset', nord: 'Nord', or: 'Gold & black', foret: 'Forest', lavande: 'Lavender' })[k] || themes[k].nom : themes[k].nom);
  const MOMENTS_EN = { nuit: 'night', soir: 'evening', hiver: 'winter', printemps: 'spring', 'été': 'summer', automne: 'autumn' };
  const nom = th.auto ? `Auto · ${nomTheme(id)}` : nomTheme(id);
  const dots = ['orange', 'blue', 'green', 'text'].map((k, i) => `<circle cx="${(th.auto ? 400 : 318) + i * 26}" cy="56" r="9" fill="${p[k]}"/>`).join('');
  const mini = ordre.map((k, i) => {
    const q = palette('dark', k);
    return `<circle cx="${W - 330 + i * 18}" cy="78" r="6" fill="${q.orange}"${k === id ? ` stroke="${p.text}" stroke-width="2"` : ''}/>`;
  }).join('');
  const n = th.changements || 0;
  let info;
  if (th.auto) info = en ? `follows the time and season (${MOMENTS_EN[th.auto.moment] || th.auto.moment})` : `suit l’heure et la saison (${th.auto.moment})`;
  else if (en) info = th.le ? `picked ${relatifEn(th.le, now)} · ${n} change${n > 1 ? 's' : ''}` : 'applies to the whole profile';
  else info = th.le ? `choisi ${relatif(th.le, now)} · ${n} changement${n > 1 ? 's' : ''}` : 'il s’applique à tout le profil';
  const body = `${bg}
<g class="up">
  ${t(36, 44, en ? '🎨 PROFILE THEME' : '🎨 THÈME DU PROFIL', 14, p.orange, 800, MONO, 'start', ' letter-spacing="1.5"')}
  ${t(36, 84, nom, 34, p.text, 800, SANS, 'start', ' letter-spacing="-.5"')}
  ${dots}
  ${t(th.auto ? 522 : 440, 62, info, 15, p.faint, 400, MONO)}
</g>
<g class="up" style="animation-delay:.2s">
  <rect x="${W - 344}" y="22" width="312" height="36" rx="18" fill="${p.orange}" fill-opacity=".14" stroke="${p.orange}" stroke-opacity=".5"/>
  <g class="nudge">${t(W - 188, 46, en ? `${ordre.length + 1} themes · menu below ▾` : `${ordre.length + 1} thèmes · menu en dessous ▾`, 15, p.orange, 800, MONO, 'middle')}</g>
  ${mini}
</g>`;
  const style = `.nudge{animation:nudge 2.4s ease-in-out infinite}@keyframes nudge{0%,60%,100%{transform:none}75%{transform:translateY(3px)}}`;
  return svg(W, H, en ? `Current profile theme: ${nom}. The menu just below lets you pick another one.` : `Thème actuel du profil : ${nom}. Le menu juste en dessous permet d’en choisir un autre.`, body, style, defs);
}

function relatifEn(iso, now) {
  const m = Math.floor((now - new Date(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const j = Math.floor(h / 24);
  return `${j} day${j > 1 ? 's' : ''} ago`;
}
