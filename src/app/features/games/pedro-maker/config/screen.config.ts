/**
 * Telas do Pedro Maker: o mesmo jogo 3D desenhado com cara de época.
 *
 * As três retrô desenham o quadro com poucas linhas e esticam a imagem; a do
 * NES e a do SNES esticam sem suavizar (pixel quadradinho) e cortam as cores,
 * a do N64 estica suavizando, com a imagem macia dos primeiros jogos 3D. O 3D
 * usa a densidade da tela; o HD e o 4K desenham o quadro com mais pixels que
 * a tela e o navegador reduz, deixando as bordas lisas.
 */
export const SCREEN_MODES = ['nes', 'snes', 'n64', '3d', 'hd', '4k'] as const;

export type ScreenMode = (typeof SCREEN_MODES)[number];

export interface ScreenLook {
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
  /** Linhas do quadro nas telas retrô; `null` nas outras. */
  readonly lines: number | null;
  /** Tons por canal de cor (vermelho, verde, azul); `null` mantém todas as cores. */
  readonly colorLevels: number | null;
  /** Estica o quadro sem suavizar: cada pixel vira um quadradinho. */
  readonly isPixelated: boolean;
  /** Largura que o quadro tenta alcançar no HD e no 4K; `null` nas outras. */
  readonly targetWidth: number | null;
}

/** Largura de uma tela Full HD. */
export const HD_RENDER_WIDTH = 1920;

/** Largura de uma tela 4K. */
export const UHD_RENDER_WIDTH = 3840;

export const SCREEN_LOOKS: Readonly<Record<ScreenMode, ScreenLook>> = {
  nes: {
    label: 'NES',
    emoji: '👾',
    description: '8 bits: pixels grandes e poucas cores',
    lines: 192,
    colorLevels: 4,
    isPixelated: true,
    targetWidth: null,
  },
  snes: {
    label: 'SNES',
    emoji: '🕹️',
    description: '16 bits: pixels menores e cores vivas',
    lines: 288,
    colorLevels: 10,
    isPixelated: true,
    targetWidth: null,
  },
  n64: {
    label: 'Nintendo 64',
    emoji: '🎮',
    description: '64 bits: imagem macia, como os primeiros jogos 3D',
    lines: 360,
    colorLevels: 24,
    isPixelated: false,
    targetWidth: null,
  },
  '3d': {
    label: '3D',
    emoji: '🧊',
    description: 'O 3D de sempre, na densidade da tela',
    lines: null,
    colorLevels: null,
    isPixelated: false,
    targetWidth: null,
  },
  hd: {
    label: 'HD',
    emoji: '📺',
    description: 'Quadro Full HD, com 1920 pixels de largura',
    lines: null,
    colorLevels: null,
    isPixelated: false,
    targetWidth: HD_RENDER_WIDTH,
  },
  '4k': {
    label: '4K',
    emoji: '💎',
    description: 'Quadro 4K, com 3840 pixels, se o computador aguentar',
    lines: null,
    colorLevels: null,
    isPixelated: false,
    targetWidth: UHD_RENDER_WIDTH,
  },
};

/** A tela que o jogo já usava: 4K em computador forte, 3D nos outros aparelhos. */
export const DEFAULT_SCREEN: ScreenMode = '4k';

export function isScreenMode(value: unknown): value is ScreenMode {
  return SCREEN_MODES.some((mode) => mode === value);
}
