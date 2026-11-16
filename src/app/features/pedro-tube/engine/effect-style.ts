import { NEUTRAL_FILTER } from '../data/tube-effects.data';
import type { TubeFilter, TubeOverlay } from '../models/tube.model';

/**
 * Transforma o filtro do efeito em um `filter` de CSS.
 *
 * Só entram as partes diferentes do normal, para o navegador não gastar
 * tempo com ajustes que não mudam nada; sem ajuste nenhum, sai `none`.
 */
export function filterToCss(filter: TubeFilter): string {
  const parts: string[] = [];

  if (filter.brightness !== NEUTRAL_FILTER.brightness) {
    parts.push(`brightness(${filter.brightness}%)`);
  }

  if (filter.contrast !== NEUTRAL_FILTER.contrast) {
    parts.push(`contrast(${filter.contrast}%)`);
  }

  if (filter.saturation !== NEUTRAL_FILTER.saturation) {
    parts.push(`saturate(${filter.saturation}%)`);
  }

  if (filter.hue % 360 !== 0) {
    parts.push(`hue-rotate(${filter.hue}deg)`);
  }

  if (filter.sepia > 0) {
    parts.push(`sepia(${filter.sepia}%)`);
  }

  if (filter.grayscale > 0) {
    parts.push(`grayscale(${filter.grayscale}%)`);
  }

  if (filter.invert > 0) {
    parts.push(`invert(${filter.invert}%)`);
  }

  if (filter.blur > 0) {
    parts.push(`blur(${filter.blur}px)`);
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

/** Para onde as partículas vão: caem do alto, sobem de baixo ou piscam no lugar. */
export type ParticleFlow = 'cai' | 'sobe' | 'pisca';

export interface TubeParticle {
  readonly glyph: string;
  /** Posição horizontal, em % da largura. */
  readonly left: number;
  /** Posição vertical inicial, em % da altura (usada só por quem pisca). */
  readonly top: number;
  /** Atraso da animação, em segundos. */
  readonly delay: number;
  /** Duração de uma passada, em segundos. */
  readonly duration: number;
  /** Tamanho, em rem. */
  readonly size: number;
}

interface OverlayRecipe {
  readonly glyphs: readonly string[];
  readonly flow: ParticleFlow;
  readonly count: number;
}

const OVERLAY_RECIPES: Readonly<Record<Exclude<TubeOverlay, 'nenhum'>, OverlayRecipe>> = {
  coracoes: { glyphs: ['❤️', '💖', '💗', '💕'], flow: 'sobe', count: 12 },
  estrelas: { glyphs: ['⭐', '✨', '🌟'], flow: 'pisca', count: 14 },
  confete: { glyphs: ['🎊', '🎉', '🟨', '🟦', '🟥', '🟩'], flow: 'cai', count: 18 },
  fogo: { glyphs: ['🔥', '💥', '✨'], flow: 'sobe', count: 14 },
  bolhas: { glyphs: ['🫧', '⚪'], flow: 'sobe', count: 12 },
  neve: { glyphs: ['❄️', '❅', '❆'], flow: 'cai', count: 18 },
  raios: { glyphs: ['⚡', '✨'], flow: 'pisca', count: 10 },
};

export function overlayFlow(overlay: TubeOverlay): ParticleFlow | null {
  return overlay === 'nenhum' ? null : OVERLAY_RECIPES[overlay].flow;
}

/**
 * Espalha as partículas do efeito pela tela.
 *
 * A distribuição é fixa (sem `Math.random`): o mesmo efeito fica igual toda
 * vez que abre, e a prévia do criador mostra exatamente o que o vídeo vai ter.
 */
export function particlesFor(overlay: TubeOverlay): readonly TubeParticle[] {
  if (overlay === 'nenhum') {
    return [];
  }

  const recipe = OVERLAY_RECIPES[overlay];

  return Array.from({ length: recipe.count }, (_, index): TubeParticle => {
    const spread = scatter(index);

    return {
      glyph: recipe.glyphs[index % recipe.glyphs.length],
      left: round(4 + ((index * 61 + 17) % 92)),
      top: round(6 + ((index * 37 + 11) % 82)),
      delay: round(spread * 4),
      duration: round(recipe.flow === 'pisca' ? 1.4 + spread * 1.6 : 3.2 + spread * 2.8),
      size: round(0.9 + scatter(index + 7) * 1.1),
    };
  });
}

/** Número entre 0 e 1 que parece sorteado, mas é sempre o mesmo para o mesmo índice. */
function scatter(index: number): number {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;

  return value - Math.floor(value);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
