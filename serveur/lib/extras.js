// Cartes « succès », « feuille de route » et image de partage (og:image).
// Toutes aux couleurs du thème choisi par les visiteurs, en français ou en anglais.
import { palette, t, svg, cardBg, esc, MONO, SANS, milliers } from './rendu.js';
import { mix } from './gh-cartes.js';

const EMOJI = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
const MOIS = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const court = (s, n) => {
  const x = s.replace(/\s*\([^)]*\)/g, '').trim();
  return x.length > n ? `${x.slice(0, n - 1).trimEnd()}…` : x;
};

// ─────────────────────────────────────────────────────────── succès ──
// Chaque succès a des paliers : la carte montre le dernier palier atteint et la marche suivante.
const SUCCES = [
  { e: '🚀', cle: 'saas', paliers: [1, 2, 3], fr: (n) => `${n} SaaS en prod`, en: (n) => `${n} SaaS live` },
  { e: '💯', cle: 'commits', paliers: [250, 500, 1000, 2500, 5000], fr: (n) => `${milliers(n)} commits`, en: (n) => `${milliers(n)} commits` },
  { e: '🏆', cle: 'total', paliers: [500, 1000, 2500, 5000, 10000], fr: (n) => `${milliers(n)} contributions`, en: (n) => `${milliers(n)} contributions` },
  { e: '🔀', cle: 'prs', paliers: [50, 100, 250, 500, 1000], fr: (n) => `${n} pull requests`, en: (n) => `${n} pull requests` },
  { e: '🔥', cle: 'record', paliers: [7, 14, 30, 60, 100], fr: (n) => `Série de ${n} jours`, en: (n) => `${n}-day streak` },
  { e: '👀', cle: 'visites', paliers: [1000, 5000, 10000, 25000, 50000], fr: (n) => `${milliers(n)} visites`, en: (n) => `${milliers(n)} visits` },
  { e: '🖌️', cle: 'mur', paliers: [25, 100, 500, 1000, 5000], fr: (n) => `${milliers(n)} coups de pinceau`, en: (n) => `${milliers(n)} brush strokes` },
  { e: '🎉', cle: 'reactions', paliers: [10, 50, 100, 500, 1000], fr: (n) => `${milliers(n)} réactions`, en: (n) => `${milliers(n)} reactions` },
];
const TS = {
  fr: { titre: '🏅 SUCCÈS DÉBLOQUÉS', sous: 'ils s’allument tout seuls quand je passe un cap', ok: '✓ DÉBLOQUÉ', palier: (i, n) => `niveau ${i}/${n}`,
    max: 'niveau max !', suivant: (v, b) => `${milliers(v)} / ${milliers(b)}`,
    sources: { saas: 'Bâtipro + MyWattUp', commits: 'sur 12 mois', total: 'sur 12 mois', prs: 'sur 12 mois', record: 'jours d’affilée', visites: 'sur ce profil', mur: 'sur le mur', reactions: 'des visiteurs' } },
  en: { titre: '🏅 ACHIEVEMENTS', sous: 'they light up on their own when I reach a milestone', ok: '✓ UNLOCKED', palier: (i, n) => `level ${i}/${n}`,
    max: 'max level!', suivant: (v, b) => `${milliers(v)} / ${milliers(b)}`,
    sources: { saas: 'Bâtipro + MyWattUp', commits: 'over 12 months', total: 'over 12 months', prs: 'over 12 months', record: 'days in a row', visites: 'on this profile', mur: 'on the wall', reactions: 'from visitors' } },
};

export function renderSucces(v, mode, theme, lang = 'fr') {
  const p = palette(mode, theme);
  const L = TS[lang] || TS.fr;
  const W = 1200, H = 440;
  const [defs0, bg] = cardBg(p, W, H, '50%', '20%');
  const cw = 266, ch = 140, gx = 18, ox = (W - (4 * cw + 3 * gx)) / 2, oy = 110;
  let debloques = 0;
  const cartes = SUCCES.map((s, i) => {
    const val = Number(v[s.cle]) || 0;
    const niv = s.paliers.filter((b) => val >= b).length;            // paliers atteints
    const ok = niv > 0;
    if (ok) debloques++;
    const affiche = ok ? s.paliers[niv - 1] : s.paliers[0];
    const but = s.paliers[niv];                                       // prochaine marche
    const k = but ? Math.min(val / but, 1) : 1;
    const x = ox + (i % 4) * (cw + gx), y = oy + Math.floor(i / 4) * (ch + gx);
    const fond = ok ? mix(p.panel, p.orange, mode === 'dark' ? 0.12 : 0.07) : p.panel;
    const etat = ok ? `${L.ok} · ${L.palier(niv, s.paliers.length)}` : `🔒 ${Math.floor(k * 100)} %`;
    return `<g class="up" style="animation-delay:${(0.1 + i * 0.08).toFixed(2)}s">
  <rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="18" fill="${fond}" stroke="${ok ? p.orange : p.line}" stroke-width="${ok ? 2 : 1}"/>
  ${ok ? `<rect class="brille rm" style="animation-delay:${(i * 0.5).toFixed(1)}s" x="${x}" y="${y}" width="${cw}" height="${ch}" rx="18" fill="url(#brille)"/>` : ''}
  <text x="${x + 20}" y="${y + 50}" font-size="32" font-family="${EMOJI}"${ok ? '' : ' opacity=".35" filter="url(#gris)"'}>${s.e}</text>
  ${t(x + cw - 18, y + 36, etat, 11, ok ? p.orange : p.faint, 800, MONO, 'end', ' letter-spacing=".5"')}
  ${t(x + 20, y + 86, s[lang === 'en' ? 'en' : 'fr'](affiche), 19, ok ? p.text : p.muted, 800)}
  ${t(x + 20, y + 107, but ? `${L.sources[s.cle]} · ${L.suivant(val, but)}` : `${L.sources[s.cle]} · ${L.max}`, 12, p.faint, 400, MONO)}
  <rect x="${x + 20}" y="${y + 120}" width="${cw - 40}" height="6" rx="3" fill="${p.panel2}"/>
  <rect class="bar" style="animation-delay:${(0.4 + i * 0.08).toFixed(2)}s" x="${x + 20}" y="${y + 120}" width="${((cw - 40) * Math.max(k, 0.03)).toFixed(1)}" height="6" rx="3" fill="${ok ? p.orange : p.blue}"/>
</g>`;
  }).join('');
  const defs = defs0 + `<linearGradient id="brille" x1="0" x2="1"><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="gris"><feColorMatrix type="saturate" values="0"/></filter>`;
  const body = `${bg}
<g class="up">
  ${t(40, 58, L.titre, 15, p.orange, 800, MONO, 'start', ' letter-spacing="1.5"')}
  ${t(40, 86, L.sous, 16, p.muted)}
  ${t(W - 40, 72, `${debloques} / ${SUCCES.length}`, 32, p.text, 800, SANS, 'end')}
</g>
${cartes}`;
  const style = `.brille{opacity:0;animation:br 5s ease-in-out infinite}@keyframes br{0%,60%{opacity:0}78%{opacity:1}100%{opacity:0}}
.bar{transform-box:fill-box;transform-origin:left;animation:bar 10s cubic-bezier(.6,0,.2,1) infinite both}
@keyframes bar{0%{transform:scaleX(0)}15%,90%{transform:scaleX(1)}100%{transform:scaleX(0)}}`;
  const label = lang === 'en' ? `Achievements: ${debloques} of ${SUCCES.length} unlocked.` : `Succès : ${debloques} sur ${SUCCES.length} débloqués.`;
  return svg(W, H, label, body, style, defs);
}

// ─────────────────────────────────────────────────── feuille de route ──
const TF = {
  fr: { titre: '🗺️ FEUILLE DE ROUTE · CE QUI SORT DU CHANTIER', sous: 'mes dernières livraisons, relevées chaque nuit sur GitHub',
    livre: 'LIVRÉ', cours: 'EN COURS', rien: 'rien en cours : prochaine idée en préparation', livraisons: (n) => `${n} livraison${n > 1 ? 's' : ''}`,
    attente: 'Les données arrivent : elles sont relevées chaque nuit.' },
  en: { titre: '🗺️ ROADMAP · FRESH OFF THE JOB SITE', sous: 'my latest releases, collected every night from GitHub',
    livre: 'SHIPPED', cours: 'IN PROGRESS', rien: 'nothing in progress: next idea being prepared', livraisons: (n) => `${n} release${n > 1 ? 's' : ''}`,
    attente: 'Data is on its way: it is collected every night.' },
};

export function renderFeuille(d, mode, theme, lang = 'fr', now = new Date()) {
  const p = palette(mode, theme);
  const L = TF[lang] || TF.fr;
  const M = MOIS[lang] || MOIS.fr;
  const W = 1200, H = 470;
  const [defs, bg] = cardBg(p, W, H, '80%', '20%');
  const projets = d?.feuille || [];
  const entete = `<g class="up">${t(40, 58, L.titre, 15, p.orange, 800, MONO, 'start', ' letter-spacing="1.5"')}${t(40, 86, L.sous, 16, p.muted)}</g>`;
  if (!projets.length) return svg(W, H, L.titre, `${bg}${entete}${t(W / 2, H / 2 + 20, L.attente, 22, p.muted, 400, SANS, 'middle')}`, '', defs);

  // 6 derniers mois, pour l'histogramme de chaque projet
  const cles = [];
  for (let i = 5; i >= 0; i--) {
    const x = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    cles.push(`${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const maxMois = Math.max(1, ...projets.flatMap((pr) => cles.map((c) => pr.mois?.[c] || 0)));
  const colW = (W - 80 - 24) / 2;
  const blocs = projets.slice(0, 2).map((pr, j) => {
    const x = 40 + j * (colW + 24), y = 112;
    const coul = j ? p.blue : p.orange;
    const histo = cles.map((c, i) => {
      const n = pr.mois?.[c] || 0, h = Math.max(n ? (n / maxMois) * 46 : 2, 2);
      const bx = x + colW - 24 - (6 - i) * 26;
      return `<rect class="monte" style="animation-delay:${(0.3 + i * 0.06).toFixed(2)}s" x="${bx}" y="${y + 74 - h}" width="18" height="${h.toFixed(1)}" rx="3" fill="${coul}" fill-opacity="${n ? 1 : 0.3}"><title>${M[Number(c.slice(5)) - 1]} : ${n}</title></rect>`;
    }).join('');
    const livres = (pr.livre || []).slice(0, 4).map((l, i) => {
      const [, mm, jj] = l.le.slice(0, 10).split('-').map(Number);
      const date = lang === 'en' ? `${M[mm - 1]} ${jj}` : `${jj} ${M[mm - 1]}`;
      const ly = y + 132 + i * 36;
      return `<g class="up" style="animation-delay:${(0.4 + i * 0.1).toFixed(2)}s">
  <circle cx="${x + 30}" cy="${ly - 5}" r="9" fill="${mix(p.panel, p.green, 0.25)}"/>${t(x + 30, ly, '✓', 12, p.green, 800, SANS, 'middle')}
  ${t(x + 50, ly, court(l.titre, 46), 16, p.text, 600)}
  ${t(x + colW - 24, ly, date, 13, p.faint, 400, MONO, 'end')}
</g>`;
    }).join('');
    const cours = (pr.en_cours || []).slice(0, 1);
    const cy = y + 132 + 4 * 36 + 6;
    const enCours = cours.length
      ? `<g class="up" style="animation-delay:.9s"><circle class="pulse" cx="${x + 30}" cy="${cy - 5}" r="6" fill="${p.orange}"/>
  ${t(x + 50, cy, `${L.cours} · `, 13, p.orange, 800, MONO)}${t(x + 50 + (L.cours.length + 3) * 8, cy, court(cours[0], 40), 15, p.muted, 600)}</g>`
      : `<g class="up" style="animation-delay:.9s">${t(x + 24, cy, L.rien, 14, p.faint, 400, MONO)}</g>`;
    return `<g class="up" style="animation-delay:${(0.1 + j * 0.12).toFixed(2)}s">
  <rect x="${x}" y="${y}" width="${colW}" height="${H - y - 30}" rx="18" fill="${p.panel}" stroke="${p.line}"/>
  <rect x="${x}" y="${y + 18}" width="4" height="40" rx="2" fill="${coul}"/>
  ${t(x + 24, y + 46, pr.nom, 26, p.text, 800)}
  ${t(x + 24, y + 70, L.livraisons(pr.total || 0), 14, p.muted, 400, MONO)}
  ${histo}
  <line x1="${x + 24}" x2="${x + colW - 24}" y1="${y + 94}" y2="${y + 94}" stroke="${p.line}"/>
  ${t(x + 24, y + 112, L.livre, 12, p.faint, 800, MONO, 'start', ' letter-spacing="1.5"')}
</g>${livres}${enCours}`;
  }).join('');
  const style = `.monte{transform-box:fill-box;transform-origin:bottom;animation:monte 10s cubic-bezier(.3,1.3,.5,1) infinite both}
@keyframes monte{0%{transform:scaleY(0)}12%,90%{transform:scaleY(1)}100%{transform:scaleY(0)}}`;
  const label = (lang === 'en' ? 'Roadmap: ' : 'Feuille de route : ') + projets.map((pr) => `${pr.nom} ${L.livraisons(pr.total || 0)}`).join(', ');
  return svg(W, H, label, `${bg}${entete}${blocs}`, style, defs);
}

// ──────────────────────────────────────────── image de partage (og:image) ──
// Intemporelle (pas de chiffres qui vieillissent) : convertie en PNG par .github/scripts/partage.sh.
export function renderPartage(theme) {
  const p = palette('dark', theme);
  const W = 1280, H = 640;
  const [defs0, bg] = cardBg(p, W, H, '78%', '35%');
  // mur de cases décoratif, repeint en diagonale comme un coup de rouleau
  let cases = '';
  for (let c = 0; c < 14; c++) {
    for (let r = 0; r < 9; r++) {
      const k = (c * 7 + r * 13) % 17;
      const peinte = c + r * 0.6 < 13;
      const coul = !peinte ? 'none' : k === 0 ? p.orange : mix(mix(p.panel2, p.blue, 0.3), p.blue, (k % 5) / 5);
      cases += `<rect x="${760 + c * 32}" y="${140 + r * 32}" width="26" height="26" rx="6" fill="${coul}"${peinte ? '' : ` stroke="${p.line}" stroke-dasharray="3 2"`}/>`;
    }
  }
  const rx = 760 + 12.4 * 32 - 30;
  const body = `${bg}
${cases}
<g transform="rotate(-28 ${rx} 300)"><rect x="${rx}" y="120" width="34" height="300" rx="15" fill="${p.orange}"/><rect x="${rx + 6}" y="132" width="7" height="276" rx="3.5" fill="#fff" opacity=".35"/>
<path d="M${rx + 17} 270h40v190" fill="none" stroke="${p.muted}" stroke-width="7" stroke-linejoin="round"/><rect x="${rx + 46}" y="455" width="22" height="90" rx="11" fill="${p.text}"/></g>
${t(80, 150, 'github.com/mmr45', 28, p.orange, 800, MONO, 'start', ' letter-spacing="1"')}
${t(74, 262, 'Osman', 128, p.text, 800, SANS, 'start', ' letter-spacing="-4"')}
${t(80, 326, 'Peintre en bâtiment', 36, p.muted, 600)}
${t(80, 372, '& développeur', 36, p.muted, 600)}
<rect x="80" y="430" width="232" height="64" rx="32" fill="${p.panel}" stroke="${p.line}"/>${t(196, 471, 'Bâtipro', 26, p.text, 800, SANS, 'middle')}
<rect x="328" y="430" width="262" height="64" rx="32" fill="${p.panel}" stroke="${p.line}"/>${t(459, 471, 'MyWattUp', 26, p.text, 800, SANS, 'middle')}
${t(80, 556, 'Du chantier au code · deux SaaS en production', 22, p.faint, 400, MONO)}`;
  return svg(W, H, 'Osman, peintre en bâtiment et développeur, fondateur de Bâtipro et MyWattUp', body, '', defs0);
}

