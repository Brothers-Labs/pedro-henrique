import type { ThemeColor } from '../models/profile.model';
import { THEME_COLOR_HEX } from '../theme/theme-colors';

const ILLUSTRATION_WIDTH = 640;
const ILLUSTRATION_HEIGHT = 480;

/**
 * Gera uma ilustração colorida em SVG (data URI) para a galeria.
 *
 * O site não tem backend nem fotos reais versionadas, então as artes são
 * desenhadas em runtime — assim a galeria fica visualmente rica sem adicionar
 * binários ao repositório.
 */
export function createIllustration(emoji: string, color: ThemeColor, seed: number): string {
  const { base, soft } = THEME_COLOR_HEX[color];
  const rotation = (seed % 7) * 5 - 15;
  const bubbles = buildBubbles(seed, base);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ILLUSTRATION_WIDTH} ${ILLUSTRATION_HEIGHT}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${soft}"/><stop offset="100%" stop-color="${base}"/>
</linearGradient></defs>
<rect width="${ILLUSTRATION_WIDTH}" height="${ILLUSTRATION_HEIGHT}" fill="url(#g)"/>
${bubbles}
<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-size="190"
 transform="rotate(${rotation} ${ILLUSTRATION_WIDTH / 2} ${ILLUSTRATION_HEIGHT / 2})">${emoji}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}`;
}

function buildBubbles(seed: number, color: string): string {
  return Array.from({ length: 6 }, (_, index) => {
    const step = seed * 37 + index * 61;
    const cx = (step * 13) % ILLUSTRATION_WIDTH;
    const cy = (step * 29) % ILLUSTRATION_HEIGHT;
    const radius = 24 + ((step * 7) % 46);
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" opacity="0.18"/>`;
  }).join('');
}
