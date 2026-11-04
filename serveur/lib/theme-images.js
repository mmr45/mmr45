import cfg from './themes.json' with { type: 'json' };
import base from './palette-gabarit.json' with { type: 'json' };

export const gabaritTheme = (id) => cfg.themes[id]?.gabarit || id;

// Une seule passe : un nouvel accent peut reprendre une ancienne couleur sans être remplacé deux fois.
export function recoloreSvg(svg, id, mode) {
  const theme = cfg.themes[id];
  if (!theme?.gabarit) return svg;
  const palette = base[mode];
  const couleurs = new Map(Object.entries(palette)
    .filter(([, v]) => /^#[\da-f]{6}$/i.test(v))
    .map(([k, v]) => [v.toUpperCase(), theme[mode][k] || v]));
  return svg.replace(/#[\da-f]{6}\b/gi, (hex) => couleurs.get(hex.toUpperCase()) || hex);
}
