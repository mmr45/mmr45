// GET /theme-actuel.svg : en-tête du menu déroulant des thèmes (thème en cours, couleurs, nombre de changements).
import { etatTheme, THEMES, ORDRE } from '../lib/theme.js';
import { renderThemeActuel } from '../lib/cartes.js';

export default async function handler(req, res) {
  const th = await etatTheme().catch(() => ({ theme: 'chantier' }));
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.status(200).send(renderThemeActuel(th, THEMES, ORDRE));
}
