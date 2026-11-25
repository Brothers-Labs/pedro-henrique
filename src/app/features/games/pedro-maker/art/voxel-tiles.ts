import { context2d, createCanvas, darken, lighten, mix, textureNoise } from './canvas';
import type { ThemePalette } from './palettes';

/**
 * Faces dos blocos do mundo 3D, em pixels grandes como os de um jogo de cubos.
 *
 * Cada face é um quadrado de 16 × 16 pintado ponto a ponto com as cores do
 * tema. O motor junta todas numa textura só (o atlas) e o editor usa as mesmas
 * faces como ícone da peça — o bloco que o Pedro coloca é o bloco que aparece.
 */

export const VOXEL_TILE_SIZE = 16;

export type VoxelTile =
  | 'grass-top'
  | 'grass-side'
  | 'dirt'
  | 'stone'
  | 'ice'
  | 'sand'
  | 'wood'
  | 'pipe-side'
  | 'pipe-top'
  | 'brick'
  | 'surprise'
  | 'surprise-used'
  | 'crumble'
  | 'cloud'
  | 'platform'
  | 'spring'
  | 'lava'
  | 'water'
  | 'lucky'
  | 'note'
  | 'bone'
  | 'mesa-top'
  | 'mesa-side'
  | 'switch-on'
  | 'switch-off'
  | 'red-block'
  | 'blue-block'
  | 'rainbow-block'
  | 'rainbow-bridge';

export const VOXEL_TILES: readonly VoxelTile[] = [
  'grass-top',
  'grass-side',
  'dirt',
  'stone',
  'ice',
  'sand',
  'wood',
  'pipe-side',
  'pipe-top',
  'brick',
  'surprise',
  'surprise-used',
  'crumble',
  'cloud',
  'platform',
  'spring',
  'lava',
  'water',
  'lucky',
  'note',
  'bone',
  'mesa-top',
  'mesa-side',
  'switch-on',
  'switch-off',
  'red-block',
  'blue-block',
  'rainbow-block',
  'rainbow-bridge',
];

/** Blocos por linha no atlas. */
export const VOXEL_ATLAS_COLUMNS = 8;

/**
 * Borda repetida em volta de cada face no atlas.
 *
 * Sem ela, a placa de vídeo às vezes pega um pixel da face vizinha na
 * emenda entre dois blocos e aparece uma linha fina de outra cor.
 */
export const VOXEL_ATLAS_PADDING = 1;

const SLOT = VOXEL_TILE_SIZE + VOXEL_ATLAS_PADDING * 2;

export type SetPixel = (x: number, y: number, color: string) => void;

interface TilePainterContext {
  readonly set: SetPixel;
  readonly random: () => number;
  readonly palette: ThemePalette;
}

const QUESTION_MARK = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'] as const;

/** Listras do arenito da montanha do deserto, de cima para baixo: cada uma com a sua altura em pixels. */
const MESA_STRATA = [
  { color: '#e8a25a', height: 3 },
  { color: '#c4572e', height: 3 },
  { color: '#f0b872', height: 2 },
  { color: '#d9773f', height: 4 },
  { color: '#b9502b', height: 4 },
] as const;

/** Colcheia: a nota musical do bloco musical. */
const MUSIC_NOTE = ['...###', '...#.#', '...#.#', '...#..', '...#..', '.###..', '####..', '.##...'] as const;

/** As palavras do bloco ON/OFF, em letras de cinco pixels de altura. */
const ON_LABEL = ['###.#..#', '#.#.##.#', '#.#.#.##', '#.#.#..#', '###.#..#'] as const;
const OFF_LABEL = ['###.###.###', '#.#.#...#..', '#.#.##..##.', '#.#.#...#..', '###.#...#..'] as const;

/**
 * Vermelho e azul em tons fortes e bem diferentes entre si: a criança liga cada
 * cor do interruptor aos blocos que ela acende.
 */
const SWITCH_COLORS = {
  red: { base: '#e5484d', light: '#ff8a8f', dark: '#8f1d22' },
  blue: { base: '#3e7bfa', light: '#8fb4ff', dark: '#173f9a' },
} as const;

type SwitchColor = (typeof SWITCH_COLORS)[keyof typeof SWITCH_COLORS];

/** As sete cores do arco-íris, de cima para baixo, como aparecem no céu. */
const RAINBOW_STRIPES = ['#ff4d4d', '#ff9a2e', '#ffd93b', '#4cc94a', '#3fa3f5', '#5b5fd6', '#a45be0'] as const;

const PAINTERS: Readonly<Record<VoxelTile, (context: TilePainterContext) => void>> = {
  'grass-top': ({ set, random, palette }) =>
    speckle(set, random, palette.surface, [lighten(palette.surface, 0.18), darken(palette.surface, 0.12)], 0.35),
  'grass-side': ({ set, random, palette }) => {
    speckle(set, random, palette.soil, [palette.soilDark, lighten(palette.soil, 0.12)], 0.3);

    // A grama escorre por cima da terra em alturas diferentes, como tufos.
    for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
      const depth = 3 + Math.floor(random() * 3);

      for (let y = 0; y < depth; y += 1) {
        set(x, y, random() < 0.25 ? lighten(palette.surface, 0.15) : palette.surface);
      }

      set(x, depth, darken(palette.surface, 0.18));
    }
  },
  dirt: ({ set, random, palette }) =>
    speckle(set, random, palette.soil, [palette.soilDark, lighten(palette.soil, 0.12)], 0.32),
  stone: ({ set, random, palette }) => {
    speckle(set, random, palette.stone, [darken(palette.stone, 0.14), lighten(palette.stone, 0.12)], 0.4);
    crack(set, random, darken(palette.stone, 0.3), 3);
  },
  ice: ({ set, random }) => {
    speckle(set, random, '#bfe9ff', ['#d9f3ff', '#a6ddfb'], 0.25);

    // Reflexos na diagonal: é o que faz o gelo parecer liso e escorregadio.
    for (let step = 0; step < VOXEL_TILE_SIZE; step += 1) {
      set(step, VOXEL_TILE_SIZE - 1 - step, '#ffffff');
      set(Math.min(VOXEL_TILE_SIZE - 1, step + 5), VOXEL_TILE_SIZE - 1 - step, '#eefaff');
    }
  },
  sand: ({ set, random }) => speckle(set, random, '#f2d79a', ['#e6c47c', '#fbe7b8', '#d9b46a'], 0.4),
  wood: ({ set, random }) => planks(set, random, '#b9824e'),
  'pipe-side': ({ set }) => {
    const shades = ['#1f7a2e', '#2f9e3f', '#4cc25a', '#7fe08a', '#4cc25a', '#3fb24d', '#2f9e3f', '#1f7a2e'];

    for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
      const color = shades[Math.floor((x / VOXEL_TILE_SIZE) * shades.length)] ?? '#2f9e3f';

      for (let y = 0; y < VOXEL_TILE_SIZE; y += 1) {
        set(x, y, color);
      }
    }
  },
  'pipe-top': ({ set }) => {
    fill(set, '#3fb24d');
    frame(set, '#1f7a2e', 0);
    frame(set, '#7fe08a', 1);

    for (let y = 4; y < 12; y += 1) {
      for (let x = 4; x < 12; x += 1) {
        set(x, y, '#12331a');
      }
    }
  },
  brick: ({ set, random }) => {
    fill(set, '#e3c9a3');

    for (let row = 0; row < 4; row += 1) {
      const offset = row % 2 === 0 ? 0 : 4;

      for (let y = row * 4; y < row * 4 + 3; y += 1) {
        for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
          if ((x + offset) % 8 !== 7) {
            set(x, y, random() < 0.15 ? '#b8532f' : '#c8643c');
          }
        }
      }
    }
  },
  surprise: ({ set }) => {
    fill(set, '#ffc629');
    frame(set, '#b8741a', 0);
    rivets(set, '#b8741a');
    questionMark(set, '#7a4210', 0);
  },
  'surprise-used': ({ set, random }) => {
    speckle(set, random, '#a8835a', ['#96724c', '#b89468'], 0.25);
    frame(set, '#6d4f30', 0);
    rivets(set, '#6d4f30');
  },
  crumble: ({ set, random }) => {
    speckle(set, random, '#d8b88e', ['#c9a27a', '#e6cba6'], 0.35);
    crack(set, random, '#8a6a47', 4);
  },
  cloud: ({ set, random }) => {
    fill(set, '#ffffff');

    for (let y = 11; y < VOXEL_TILE_SIZE; y += 1) {
      for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
        set(x, y, random() < 0.5 ? '#e3f1ff' : '#d3e8fb');
      }
    }
  },
  platform: ({ set, random }) => planks(set, random, '#d9a066'),
  spring: ({ set }) => {
    fill(set, '#c9d2e3');
    frame(set, '#7d8aa3', 0);

    for (let y = 2; y < VOXEL_TILE_SIZE - 2; y += 3) {
      for (let x = 2; x < VOXEL_TILE_SIZE - 2; x += 1) {
        set(x, y, '#e14b4b');
      }
    }
  },
  /** Osso branquinho com as costelas marcadas: a plataforma de esqueleto. */
  bone: ({ set, random }) => {
    speckle(set, random, '#efe6d2', ['#f8f3e6', '#dcd0b6'], 0.3);

    for (let x = 2; x < VOXEL_TILE_SIZE - 1; x += 4) {
      for (let y = 3; y < VOXEL_TILE_SIZE - 3; y += 1) {
        set(x, y, '#b9ab8e');
      }
    }

    frame(set, '#8c7e64', 0);
  },
  /** Areia por cima do arenito, com pedrinhas vermelhas soltas. */
  'mesa-top': ({ set, random }) => speckle(set, random, '#efc27a', ['#e3ad62', '#f7d79c', '#c4572e'], 0.35),
  /** Listras de arenito, como os paredões dos cânions: empilhadas, as listras continuam de um bloco para o outro. */
  'mesa-side': ({ set, random }) => {
    let y = 0;

    for (const { color, height } of MESA_STRATA) {
      for (let row = y; row < y + height; row += 1) {
        for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
          const roll = random();

          set(x, row, roll < 0.12 ? darken(color, 0.12) : roll < 0.2 ? lighten(color, 0.1) : color);
        }
      }

      y += height;
    }
  },
  lava: ({ set, random }) => {
    speckle(set, random, '#ff6a00', ['#ffd23f', '#ff9a1f', '#c2330a'], 0.45);
  },
  water: ({ set, random }) => {
    speckle(set, random, '#2f9be8', ['#3fa9f5', '#258bd6'], 0.35);

    // Riscos claros em ondinha: é o que faz o bloco parecer água, e não vidro azul.
    for (const row of [3, 9]) {
      for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
        if (x % 6 < 3) {
          set(x, row + (x % 6 === 1 ? -1 : 0), '#8fd6ff');
        }
      }
    }
  },
  lucky: ({ set }) => {
    // Dourado com borda dupla e o "?" branco: o Lucky Block não se confunde com a surpresa comum.
    fill(set, '#ffd84a');
    frame(set, '#e8590c', 0);
    frame(set, '#fff3a8', 1);
    questionMark(set, '#d9480f', 1);
    questionMark(set, '#ffffff', 0);
  },
  note: ({ set }) => {
    fill(set, '#fff8e8');
    frame(set, '#c9a227', 0);
    rivets(set, '#c9a227');
    stamp(set, MUSIC_NOTE, 4, 4, '#2a2350');
  },
  /** O interruptor aceso em ON, vermelho como os blocos que ele deixa firmes. */
  'switch-on': ({ set }) => switchFace(set, SWITCH_COLORS.red, ON_LABEL),
  /** O interruptor em OFF, azul como os blocos que ele deixa firmes. */
  'switch-off': ({ set }) => switchFace(set, SWITCH_COLORS.blue, OFF_LABEL),
  'red-block': ({ set }) => colorBlockFace(set, SWITCH_COLORS.red),
  'blue-block': ({ set }) => colorBlockFace(set, SWITCH_COLORS.blue),
  /** Sete faixas de dois pixels com brilho em cima: empilhados, os blocos repetem o arco-íris. */
  'rainbow-block': ({ set }) => {
    rainbowStripes(set, 1, 2);
    frame(set, '#2a2350', 0);
  },
  /** O arco-íris fininho por cima de um fiapo de nuvem: parece a nuvem, mas colorida. */
  'rainbow-bridge': ({ set, random }) => {
    fill(set, '#ffffff');
    rainbowStripes(set, 0, 1);

    // A barriga da nuvem, no mesmo azulzinho da Nuvem comum, logo embaixo das cores.
    for (let y = RAINBOW_STRIPES.length + 1; y < VOXEL_TILE_SIZE; y += 1) {
      for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
        set(x, y, random() < 0.5 ? '#e3f1ff' : '#d3e8fb');
      }
    }
  },
};

/** Pinta uma face no ponto (x, y) de um canvas já existente. */
export function paintVoxelTile(
  context: CanvasRenderingContext2D,
  tile: VoxelTile,
  palette: ThemePalette,
  originX = 0,
  originY = 0,
): void {
  // Semente pelo nome: a mesma face sai igual em todo carregamento.
  const random = textureNoise(tile.length * 7919 + (tile.charCodeAt(0) << 8) + tile.charCodeAt(tile.length - 1));
  const set: SetPixel = (x, y, color) => {
    context.fillStyle = color;
    context.fillRect(originX + x, originY + y, 1, 1);
  };

  PAINTERS[tile]({ set, random, palette });
}

export interface VoxelAtlas {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
}

/** Todas as faces lado a lado, cada uma com sua borda repetida. */
export function paintVoxelAtlas(palette: ThemePalette): VoxelAtlas {
  const rows = Math.ceil(VOXEL_TILES.length / VOXEL_ATLAS_COLUMNS);
  const canvas = createCanvas(VOXEL_ATLAS_COLUMNS * SLOT, rows * SLOT);
  const context = context2d(canvas);

  VOXEL_TILES.forEach((tile, index) => {
    const left = (index % VOXEL_ATLAS_COLUMNS) * SLOT + VOXEL_ATLAS_PADDING;
    const top = Math.floor(index / VOXEL_ATLAS_COLUMNS) * SLOT + VOXEL_ATLAS_PADDING;

    paintVoxelTile(context, tile, palette, left, top);
    extrudeEdges(context, left, top);
  });

  return { canvas, width: canvas.width, height: canvas.height };
}

/** Canto superior esquerdo de uma face dentro do atlas, em pixels. */
export function voxelTileOrigin(tile: VoxelTile): { readonly x: number; readonly y: number } {
  const index = VOXEL_TILES.indexOf(tile);

  return {
    x: (index % VOXEL_ATLAS_COLUMNS) * SLOT + VOXEL_ATLAS_PADDING,
    y: Math.floor(index / VOXEL_ATLAS_COLUMNS) * SLOT + VOXEL_ATLAS_PADDING,
  };
}

/**
 * Ícone de bloco para o editor: a face ampliada sem borrar.
 *
 * Com `side`, desenha o bloco em perspectiva simples — topo e frente —, que é
 * como ele aparece no jogo.
 */
export function paintVoxelIcon(
  context: CanvasRenderingContext2D,
  size: number,
  palette: ThemePalette,
  front: VoxelTile,
  top?: VoxelTile,
): void {
  const face = createCanvas(VOXEL_TILE_SIZE, VOXEL_TILE_SIZE);
  const faceContext = context2d(face);

  context.imageSmoothingEnabled = false;

  if (!top) {
    paintVoxelTile(faceContext, front, palette);
    context.drawImage(face, 0, 0, size, size);
    return;
  }

  const topHeight = Math.round(size * 0.28);

  paintVoxelTile(faceContext, top, palette);
  context.drawImage(face, 0, 0, size, topHeight);
  context.fillStyle = 'rgba(255, 255, 255, 0.18)';
  context.fillRect(0, 0, size, topHeight);

  paintVoxelTile(faceContext, front, palette);
  context.drawImage(face, 0, topHeight, size, size - topHeight);
}

export function fill(set: SetPixel, color: string): void {
  for (let y = 0; y < VOXEL_TILE_SIZE; y += 1) {
    for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
      set(x, y, color);
    }
  }
}

/** Cor de fundo com pontinhos de outras cores: terra, pedra, areia. */
export function speckle(set: SetPixel, random: () => number, base: string, accents: readonly string[], density: number): void {
  for (let y = 0; y < VOXEL_TILE_SIZE; y += 1) {
    for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
      const accent = random() < density ? accents[Math.floor(random() * accents.length)] : undefined;

      set(x, y, accent ?? base);
    }
  }
}

export function frame(set: SetPixel, color: string, inset: number): void {
  const last = VOXEL_TILE_SIZE - 1 - inset;

  for (let step = inset; step <= last; step += 1) {
    set(step, inset, color);
    set(step, last, color);
    set(inset, step, color);
    set(last, step, color);
  }
}

/** O "?" dos blocos surpresa, em pixels dobrados; `offset` desloca para desenhar a sombra. */
function questionMark(set: SetPixel, color: string, offset: number): void {
  QUESTION_MARK.forEach((line, row) => {
    [...line].forEach((cell, column) => {
      if (cell !== '#') {
        return;
      }

      const x = 3 + column * 2 + offset;
      const y = 1 + row * 2 + offset;

      set(x, y, color);
      set(x + 1, y, color);
      set(x, y + 1, color);
      set(x + 1, y + 1, color);
    });
  });
}

/** Desenho em texto (`#` pinta, `.` pula) com o canto superior esquerdo em (left, top). */
function stamp(set: SetPixel, rows: readonly string[], left: number, top: number, color: string): void {
  rows.forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      if (pixel === '#') {
        set(left + x, top + y, color);
      }
    });
  });
}

/** Moldura em relevo e a palavra no meio, com sombra: lê-se de longe na tela pequena. */
function switchFace(set: SetPixel, color: SwitchColor, label: readonly string[]): void {
  const left = Math.floor((VOXEL_TILE_SIZE - (label[0]?.length ?? 0)) / 2);
  const top = Math.floor((VOXEL_TILE_SIZE - label.length) / 2);

  fill(set, color.base);
  frame(set, '#ffffff', 0);
  frame(set, color.dark, 1);
  stamp(set, label, left + 1, top + 1, color.dark);
  stamp(set, label, left, top, '#ffffff');
}

/** Bloco liso com brilho em cima e à esquerda e sombra embaixo e à direita, como uma peça de montar. */
function colorBlockFace(set: SetPixel, color: SwitchColor): void {
  const last = VOXEL_TILE_SIZE - 1;

  fill(set, color.base);

  for (let step = 0; step <= last; step += 1) {
    set(step, 0, color.light);
    set(0, step, color.light);
    set(step, last, color.dark);
    set(last, step, color.dark);
  }

  for (let step = 4; step < VOXEL_TILE_SIZE - 4; step += 1) {
    set(step, 4, color.dark);
    set(step, last - 4, color.light);
    set(4, step, color.dark);
    set(last - 4, step, color.light);
  }
}

/** Faixas do arco-íris, a partir da linha `top`, cada uma com `height` pixels e um risco claro em cima. */
function rainbowStripes(set: SetPixel, top: number, height: number): void {
  RAINBOW_STRIPES.forEach((color, index) => {
    const firstRow = top + index * height;

    for (let row = firstRow; row < firstRow + height; row += 1) {
      for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
        set(x, row, row === firstRow && height > 1 ? lighten(color, 0.2) : color);
      }
    }
  });
}

function rivets(set: SetPixel, color: string): void {
  for (const [x, y] of [
    [2, 2],
    [13, 2],
    [2, 13],
    [13, 13],
  ] as const) {
    set(x, y, color);
  }
}

/** Rachaduras em zigue-zague a partir de pontos sorteados. */
export function crack(set: SetPixel, random: () => number, color: string, count: number): void {
  for (let index = 0; index < count; index += 1) {
    let x = Math.floor(random() * VOXEL_TILE_SIZE);
    let y = Math.floor(random() * VOXEL_TILE_SIZE);

    for (let length = 0; length < 5; length += 1) {
      set(x, y, color);
      x = Math.min(VOXEL_TILE_SIZE - 1, Math.max(0, x + (random() < 0.5 ? -1 : 1)));
      y = Math.min(VOXEL_TILE_SIZE - 1, y + 1);
    }
  }
}

/** Tábuas horizontais com emendas desencontradas, como um piso de madeira. */
export function planks(set: SetPixel, random: () => number, base: string): void {
  const seam = darken(base, 0.35);

  for (let row = 0; row < 4; row += 1) {
    const seamX = row % 2 === 0 ? 5 : 11;

    for (let y = row * 4; y < row * 4 + 4; y += 1) {
      for (let x = 0; x < VOXEL_TILE_SIZE; x += 1) {
        const isSeam = y === row * 4 + 3 || x === seamX;
        const grain = random() < 0.18 ? darken(base, 0.1) : random() < 0.12 ? lighten(base, 0.1) : base;

        set(x, y, isSeam ? seam : grain);
      }
    }
  }

  set(2, 1, mix(base, seam, 0.6));
  set(13, 9, mix(base, seam, 0.6));
}

/** Copia a última linha e coluna de cada lado para a borda do espaço da face. */
function extrudeEdges(context: CanvasRenderingContext2D, left: number, top: number): void {
  const size = VOXEL_TILE_SIZE;
  const pad = VOXEL_ATLAS_PADDING;

  context.drawImage(context.canvas, left, top, size, 1, left, top - pad, size, pad);
  context.drawImage(context.canvas, left, top + size - 1, size, 1, left, top + size, size, pad);
  context.drawImage(context.canvas, left, top - pad, 1, size + pad * 2, left - pad, top - pad, pad, size + pad * 2);
  context.drawImage(context.canvas, left + size - 1, top - pad, 1, size + pad * 2, left + size, top - pad, pad, size + pad * 2);
}
