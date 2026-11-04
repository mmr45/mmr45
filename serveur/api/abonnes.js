// GET /api/abonnes : abonnés GitHub publics du profil (mis en cache 1 h sur le CDN).
export default async function handler(req, res) {
  try {
    const r = await fetch('https://api.github.com/users/mmr45/followers?per_page=100', {
      headers: { 'User-Agent': 'mmr45-profil', Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const liste = (await r.json()).map((u) => ({ login: u.login, avatar: `${u.avatar_url}&s=96`, url: u.html_url }));
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ abonnes: liste });
  } catch (e) {
    console.error('[abonnes]', e.message);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    res.status(200).json({ abonnes: [], erreur: true });
  }
}
