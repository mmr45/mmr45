import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serie, csv } from '../dashboard-metrics.js';

test('les jours restent continus pendant les deux changements d’heure', () => {
  for (const fin of ['2026-03-30', '2026-10-26']) {
    const s = serie({}, fin, 7);
    assert.equal(s.length, 7);
    assert.equal(new Set(s.map(([j]) => j)).size, 7);
    assert.equal(s.at(-1)[0], fin);
    assert.ok(s.every(([, n]) => n === 0));
  }
});

test('avant le début du suivi, aucune fausse valeur zéro', () => {
  const s = serie({ '2026-11-04': 15 }, '2026-11-04', 3, '2026-11-03T23:30:00Z');
  assert.deepEqual(s, [['2026-11-02', null], ['2026-11-03', null], ['2026-11-04', 15]]);
  assert.equal(csv(s), '\uFEFFdate;chargements\r\n2026-11-02;\r\n2026-11-03;\r\n2026-11-04;15');
});
