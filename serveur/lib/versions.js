// État JSON versionné dans Blob : chaque écriture crée un nouveau fichier (horodatage inversé,
// le plus récent sort en premier dans list()). Un fichier réécrit au même chemin peut rester
// jusqu'à 60 s dans le cache du CDN de Blob, et une relecture renvoyait alors l'ancien état :
// c'est ce qui faisait « sauter » le thème. Ici on ne relit jamais un fichier réécrit.
import { readFile, writeFile } from 'node:fs/promises';
import { REDIS, rget, rset } from './store.js';

const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN;
const fichierLocal = (prefixe) => `/tmp/mmr45-${prefixe.replace(/\W+/g, '-')}.json`;

function urlFixe(chemin) {
  const m = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(process.env.BLOB_READ_WRITE_TOKEN || '');
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/${chemin}` : null;
}

// Lit la dernière version ; `ancien` = ancien chemin fixe, relu une seule fois pour reprendre l'état.
export async function litVersion(prefixe, ancien) {
  if (REDIS) return rget(prefixe);
  if (LOCAL) {
    try { return JSON.parse(await readFile(fichierLocal(prefixe), 'utf8')); } catch { return null; }
  }
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: prefixe, limit: 1 });
  if (blobs.length) {
    const r = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`lecture ${prefixe} ${r.status}`);
    return r.json();
  }
  const u = ancien && urlFixe(ancien);
  if (!u) return null;
  const r = await fetch(`${u}?t=${Date.now()}`, { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`lecture ${ancien} ${r.status}`);
  return r.json();
}

export async function ecritVersion(prefixe, obj, garder = 4) {
  if (REDIS) return rset(prefixe, obj);
  const json = JSON.stringify(obj);
  if (LOCAL) return writeFile(fichierLocal(prefixe), json);
  const { put, list, del } = await import('@vercel/blob');
  const cle = String(9999999999999 - Date.now()).padStart(13, '0');
  await put(`${prefixe}${cle}.json`, json, { access: 'public', contentType: 'application/json', addRandomSuffix: true });
  if (Math.random() < 0.3) {
    const { blobs } = await list({ prefix: prefixe, limit: 40 });
    const vieux = blobs.slice(garder).map((b) => b.url);
    if (vieux.length) await del(vieux).catch(() => {});
  }
}
