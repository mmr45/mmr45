import { urlTraduction, normaliseRecherche } from './traduction.js';
const $=(id)=>document.getElementById(id);
let langues=[];
const noms=new Intl.DisplayNames(['fr'],{type:'language'});
function nomNatif(code, secours){try{return new Intl.DisplayNames([code],{type:'language'}).of(code)||secours;}catch{return secours;}}
function selection(){
  const langue=langues.find(l=>l.code===$('langue').value);
  if(!langue)return;
  $('selection').textContent=`${langue.label} · ${langue.natif}`;
  $('ouvrir').href=langue.code==='fr'?'/lecture':urlTraduction(langue.code,location.origin);
  $('ouvrir').rel=langue.code==='fr'?'':'external noreferrer';
  $('type').textContent=langue.code==='fr'?'Texte français original, sans service de traduction.':'Traduction automatique du texte HTML via Google. Le profil GitHub d’origine reste inchangé.';
}
function filtre(){
  const ancien=$('langue').value,q=normaliseRecherche($('recherche').value);
  const liste=langues.filter(l=>normaliseRecherche(`${l.code} ${l.nom} ${l.label} ${l.natif}`).includes(q));
  $('langue').replaceChildren();
  for(const l of liste){const o=document.createElement('option');o.value=l.code;o.textContent=`${l.label} — ${l.natif} (${l.code})`;$('langue').append(o);}
  $('ouvrir').hidden=!liste.length;
  if(liste.length)$('langue').value=liste.some(l=>l.code===ancien)?ancien:liste[0].code;
  $('compte').textContent=`${liste.length} / ${langues.length} langues et variantes · languages`;
  if(liste.length)selection();else $('selection').textContent='Aucun résultat / No match';
}
try{
  const r=await fetch('/langues.json');if(!r.ok)throw Error(r.status);
  langues=(await r.json()).map(l=>({...l,label:noms.of(l.code)===l.code?l.nom:noms.of(l.code),natif:nomNatif(l.code,l.nom)})).sort((a,b)=>a.label.localeCompare(b.label,'fr'));
  filtre();
  const navigateur=(navigator.language||'fr').split('-')[0];if(langues.some(l=>l.code===navigateur))$('langue').value=navigateur;
  selection();$('recherche').oninput=filtre;$('langue').onchange=selection;
}catch{$('etat').textContent='Le menu ne répond pas. Les liens français, English et Google restent disponibles.';}
