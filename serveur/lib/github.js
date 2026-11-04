// Vraies données GitHub (contributions, langages, séries), calculées chaque nuit par
// .github/scripts/activite.py et publiées sur la branche « stats ». Pas de jeton côté Vercel.
const URL_DONNEES = 'https://raw.githubusercontent.com/mmr45/mmr45/stats/donnees.json';
const MEMO_MS = 10 * 60 * 1000;
let memo = null, memoAt = 0;

export async function donneesGitHub() {
  if (memo && Date.now() - memoAt < MEMO_MS) return memo;
  try {
    const r = await fetch(`${URL_DONNEES}?t=${Math.floor(Date.now() / MEMO_MS)}`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`donnees ${r.status}`);
    memo = await r.json();
    memoAt = Date.now();
  } catch (e) {
    if (!memo) throw e;
    console.error('[github]', e);
  }
  return memo;
}
