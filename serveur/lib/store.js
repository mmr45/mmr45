// Stockage clé → JSON dans Redis (Upstash, offre gratuite installée depuis le Marketplace Vercel).
// Remplace Vercel Blob, dont le quota gratuit d'opérations a été dépassé (store suspendu le 2026-11-04).
// Une lecture = 1 commande, une écriture = 1 commande ; pas de cache CDN, donc jamais d'état périmé.
// Les variables sont posées automatiquement par l'intégration : KV_REST_API_URL / KV_REST_API_TOKEN
// (ou UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN selon la version).
const URL_R = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const JETON = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const REDIS = Boolean(URL_R && JETON);
const CLE = (k) => `mmr45:${k}`;

async function commande(args) {
  const r = await fetch(URL_R, {
    method: 'POST',
    headers: { Authorization: `Bearer ${JETON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(4000),
  });
  if (!r.ok) throw new Error(`redis ${args[0]} ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(`redis ${args[0]} ${j.error}`);
  return j.result;
}

export async function rget(cle) {
  const v = await commande(['GET', CLE(cle)]);
  return v == null ? null : JSON.parse(v);
}

export async function rset(cle, obj) {
  await commande(['SET', CLE(cle), JSON.stringify(obj)]);
}
