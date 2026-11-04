export function urlTraduction(code, origine) {
  if (!/^[a-z]{2,3}(?:-[a-zA-Z]{2,4})?$/.test(code)) throw new Error('Code de langue invalide');
  const lecture = new URL('/lecture', origine);
  if (lecture.protocol !== 'https:' && lecture.hostname !== '127.0.0.1' && lecture.hostname !== 'localhost') throw new Error('Origine invalide');
  const lien = new URL('https://translate.google.com/translate');
  lien.search = new URLSearchParams({sl:'fr',tl:code,u:lecture.href}).toString();
  return lien.href;
}

export const normaliseRecherche = (texte) => texte.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
