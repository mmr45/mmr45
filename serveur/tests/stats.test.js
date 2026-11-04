import { test } from 'node:test';
import assert from 'node:assert/strict';
import cfg from '../lib/themes.json' with { type: 'json' };

test('le tableau de bord propose Auto et ne publie aucune limite par IP', async () => {
  process.env.KV_REST_API_URL = 'https://redis.example.test';
  process.env.KV_REST_API_TOKEN = 'test-only';
  const etats = {
    'mmr45:vues': { total: 8, base: 2, depuis: '2026-11-04T00:00:00Z', jours: {}, grille: [], theme: {}, dernieres: [], record: { n: 0 } },
    'mmr45:mur': { couche: 1, total: 1, cases: [{ case: 0, couleur: 'bleu', le: '2026-11-04T00:00:00Z', par: 'visiteur', pays: 'FR' }], limites: { ips: { secret: 1 } } },
    'mmr45:stats/theme/v-': { theme: 'auto', changements: 1, limites: { ips: { secret: 1 } } },
    'mmr45:stats/reactions/v-': { total: 1, compte: { feu: 1 }, dernieres: [], limites: { ips: { secret: ['feu'] } } },
  };
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, process.env.KV_REST_API_URL);
    const [commande, cle] = JSON.parse(options.body);
    assert.equal(commande, 'GET');
    return Response.json({ result: JSON.stringify(etats[cle]) });
  };
  try {
    const { default: handler } = await import('../api/stats.js');
    let resultat;
    const res = { setHeader() {}, status(n) { assert.equal(n, 200); return this; }, json(d) { resultat = d; } };
    await handler({}, res);
    assert.equal(resultat.theme.actuel, 'auto');
    assert.equal(resultat.theme.liste.length, cfg.ordre.length + 1);
    assert.ok(resultat.theme.liste.some(t => t.id === resultat.theme.effectif));
    assert.equal(resultat.theme.liste[0].id, 'auto');
    assert.deepEqual(resultat.mur.cases[0], { k: 0, couleur: 'bleu', le: '2026-11-04T00:00:00Z' });
    assert.ok(!JSON.stringify(resultat).includes('secret'));
  } finally {
    globalThis.fetch = original;
  }
});
