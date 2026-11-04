// Image de partage (og:image) de chaque thème : serveur/themes/<id>/partage.png,
// plus assets/partage.png (thème chantier) à téléverser dans Settings → Social preview.
// Usage : node .github/scripts/partage.mjs   (il faut rsvg-convert : brew install librsvg)
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import themes from '../../serveur/lib/themes.json' with { type: 'json' };
import { renderPartage } from '../../serveur/lib/extras.js';

const racine = new URL('../../', import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), 'partage-'));
for (const id of Object.keys(themes.themes)) {
  const svg = join(tmp, `${id}.svg`);
  writeFileSync(svg, renderPartage(id));
  execFileSync('rsvg-convert', ['-w', '1280', '-h', '640', '-o', join(racine, 'serveur/themes', id, 'partage.png'), svg]);
  console.log(id);
}
copyFileSync(join(racine, 'serveur/themes/chantier/partage.png'), join(racine, 'assets/partage.png'));
