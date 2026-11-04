import { test } from 'node:test';
import assert from 'node:assert/strict';
import cfg from '../lib/themes.json' with { type: 'json' };
import langues from '../langues.json' with { type: 'json' };
import base from '../lib/palette-gabarit.json' with { type: 'json' };
import { recoloreSvg, gabaritTheme } from '../lib/theme-images.js';
import { urlTraduction, normaliseRecherche } from '../traduction.js';
import { readFile } from 'node:fs/promises';

function luminance(hex) {
  const c = hex.slice(1).match(/../g).map(n => parseInt(n,16)/255).map(n => n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
  return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
const contraste = (a,b) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);

test('36 choix dont 24 nouvelles palettes lisibles, en clair et sombre', () => {
  assert.equal(cfg.ordre.length+1,36);
  assert.equal(new Set(cfg.ordre).size,cfg.ordre.length);
  const nouveaux=cfg.ordre.filter(id=>cfg.themes[id].gabarit);
  assert.equal(nouveaux.length,24);
  for(const id of nouveaux) for(const mode of ['dark','light']) {
    const p=cfg.themes[id][mode];
    assert.equal(gabaritTheme(id),'chantier');
    for(const k of ['text','muted','faint']) assert.ok(contraste(p[k],p.bg)>=4.5,`${id}/${mode}/${k}`);
    const source=`<svg><text fill="${base[mode].orange}">Osman</text><style>.a{animation:tour 2s infinite}</style></svg>`;
    const svg=recoloreSvg(source,id,mode);
    assert.ok(svg.includes(`fill="${p.orange}"`));
    assert.ok(svg.includes('animation:tour 2s infinite'));
    assert.ok(svg.includes('Osman'));
  }
  assert.equal(recoloreSvg('<svg/>','neon','dark'),'<svg/>');
});

test('190 langues uniques, URL encodée et recherche sans accents', () => {
  assert.equal(langues.length,190);
  assert.equal(new Set(langues.map(l=>l.code)).size,190);
  for(const {code} of langues) {
    const url=new URL(urlTraduction(code,'https://mmr45-profil.vercel.app'));
    assert.equal(url.hostname,'translate.google.com');
    assert.equal(url.searchParams.get('u'),'https://mmr45-profil.vercel.app/lecture');
    assert.equal(url.searchParams.get('tl'),code);
  }
  assert.throws(()=>urlTraduction('<script>','https://example.com'));
  assert.throws(()=>urlTraduction('en','http://example.com'));
  assert.equal(normaliseRecherche('ÉMERAUDE'),'emeraude');
});

test('les nouvelles cartes servent le gabarit FR/EN recoloré sans redirection ni écriture', async () => {
  const { default: handler } = await import('../api/img.js');
  const original = globalThis.fetch;
  try {
    for (const lang of ['fr','en']) for (const mode of ['dark','light']) {
      let appels=0, corps;
      globalThis.fetch=async (url,options) => {
        appels++;
        assert.equal(options?.method,undefined);
        const attendu=`/themes/chantier/${lang==='en'?'en/':''}hero-${mode}.svg`;
        assert.equal(new URL(url).pathname,attendu);
        return new Response(await readFile(new URL(`..${attendu}`,import.meta.url),'utf8'));
      };
      const entetes={};
      const res={setHeader(k,v){entetes[k]=v;},status(n){assert.equal(n,200);return this;},send(s){corps=s;}};
      await handler({query:{n:'hero.svg',apercu:'cosmos',mode,lang},headers:{host:'preview.example.test'}},res);
      assert.equal(appels,1);
      assert.equal(entetes['X-Theme'],'cosmos');
      assert.ok(corps.includes(cfg.themes.cosmos[mode].bg));
      assert.ok(corps.includes('@keyframes'));
      assert.ok(!entetes.Location);
    }
  } finally {globalThis.fetch=original;}
});
