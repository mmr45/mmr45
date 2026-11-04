const $ = (id) => document.getElementById(id);
let config, choix = 'chantier', mode = 'dark';
const normalise = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function apercu() {
  const info = choix === 'auto' ? {nom:'Automatique',dark:{},light:{}} : config.themes[choix];
  $('titre-apercu').textContent = `Aperçu : ${info.nom}`;
  $('apercu').src = `/img/hero.svg?apercu=${choix === 'auto' ? 'chantier' : choix}&mode=${mode}&v=6`;
  $('apercu').alt = `Aperçu animé du thème ${info.nom}, mode ${mode === 'dark' ? 'sombre' : 'clair'}`;
  $('activer').href = `/theme/${choix}`;
  $('activer').textContent = `Activer ${info.nom} pour tous`;
  $('etat-image').textContent = choix === 'auto' ? 'Auto choisit une saison ou une ambiance selon l’heure de Paris. Cet aperçu illustre Chantier.' : 'Chargement de l’aperçu…';
  document.querySelectorAll('[data-theme]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.theme === choix)));
  $('clair').setAttribute('aria-pressed',String(mode === 'light'));
  $('sombre').setAttribute('aria-pressed',String(mode === 'dark'));
}
function liste() {
  const recherche = normalise($('recherche').value), famille = $('famille').value;
  $('themes').replaceChildren();
  let n = 0;
  for (const id of ['auto', ...config.ordre]) {
    const t = id === 'auto' ? {nom:'Automatique',famille:'Automatique',dark:config.themes.neon.dark} : config.themes[id];
    const groupe = t.famille || 'Classiques';
    if (famille && groupe !== famille || !normalise(`${t.nom} ${groupe} ${id}`).includes(recherche)) continue;
    const p = t.dark, b = document.createElement('button'); b.type='button'; b.className='theme'; b.dataset.theme=id;
    b.style.background=p.bg || '#0B1220'; b.style.color=p.text || '#EEF3FA'; b.style.borderColor=p.line || '#2B3B52';
    const titre=document.createElement('b');titre.textContent=t.nom;b.append(titre);
    const pastilles=document.createElement('span');pastilles.className='pastilles';pastilles.setAttribute('aria-hidden','true');
    for(const couleur of [p.orange || '#FF6A13',p.blue || '#4A92FF',p.green || '#3FB950',p.text || '#EEF3FA']){const point=document.createElement('i');point.style.background=couleur;pastilles.append(point);}b.append(pastilles);
    const aide=document.createElement('small');aide.textContent=`${groupe} · voir l’aperçu`;b.append(aide);
    b.setAttribute('aria-pressed',String(id===choix));b.onclick=()=>{choix=id;apercu();$('titre-apercu').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
    $('themes').append(b);n++;
  }
  $('resultat').textContent = `${n} ambiance${n>1?'s':''} · ${config.ordre.length+1} choix au total`;
}
$('apercu').onload=()=>{$('etat-image').textContent=choix==='auto'?'Auto suit la saison et l’heure de Paris ; cet aperçu illustre Chantier.':'Aperçu chargé. Aucune modification du profil.';};
$('apercu').onerror=()=>{$('etat-image').textContent='L’aperçu ne répond pas. Les palettes restent consultables ci-dessous.';};
try {
  const r=await fetch('/lib/themes.json');if(!r.ok)throw Error(r.status);config=await r.json();
  for(const nom of ['Automatique',...new Set(config.ordre.map(id=>config.themes[id].famille||'Classiques'))]){const o=document.createElement('option');o.value=nom;o.textContent=nom;$('famille').append(o);}
  $('recherche').oninput=liste;$('famille').onchange=liste;
  $('sombre').onclick=()=>{mode='dark';apercu();};$('clair').onclick=()=>{mode='light';apercu();};liste();apercu();
} catch { $('resultat').textContent='Les thèmes ne répondent pas. Recharge la page pour réessayer.'; }
