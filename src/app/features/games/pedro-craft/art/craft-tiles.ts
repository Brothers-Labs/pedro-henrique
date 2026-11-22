import { darken, lighten, mix, textureNoise } from '../../pedro-maker/art/canvas';
import { crack, fill, frame, planks, type SetPixel, speckle, VOXEL_TILE_SIZE } from '../../pedro-maker/art/voxel-tiles';
import type { TextureDetail, TextureSpec } from '../models/content.model';

/**
 * Faces dos blocos do PedroCraft, pintadas a partir do JSON.
 *
 * Cada bloco traz um padrão e cores; aqui mora o "como pintar" de cada
 * padrão, com os mesmos pincéis de pixel do Pedro Maker. A posição de cada
 * cor na lista tem significado fixo por padrão — está escrito ao lado de cada
 * pintor e no README dos dados.
 *
 * Pixel transparente (`null`) só existe nos blocos vazados: folhas, vidro,
 * plantas, tocha, alavanca, trilho, linha e porta aberta.
 */

export const TILE_SIZE = VOXEL_TILE_SIZE;

/** Pinta um pixel; `null` deixa o pixel transparente. */
export type TilePixel = (x: number, y: number, color: string | null) => void;

interface PainterContext {
  readonly set: TilePixel;
  /** O mesmo `set`, sem a opção de transparência: é o que os pincéis do Pedro Maker esperam. */
  readonly solid: SetPixel;
  readonly random: () => number;
  readonly colors: readonly string[];
  readonly detail: TextureDetail | null;
  /** Crescimento de 0 a 1, usado só pelas plantações. */
  readonly growth: number;
}

const LAST = TILE_SIZE - 1;

const PAINTERS: Readonly<Record<TextureSpec['pattern'], (context: PainterContext) => void>> = {
  /** [fundo, pontinhos...] */
  speckle: ({ solid, random, colors }) => speckle(solid, random, colors[0], accentsOf(colors), 0.35),

  /** [pedra, junta escura, brilho] */
  cobble: ({ solid, random, colors }) => {
    const [base, dark, light] = [colors[0], at(colors, 1, darken(colors[0], 0.3)), at(colors, 2, lighten(colors[0], 0.2))];

    speckle(solid, random, base, [darken(base, 0.08), lighten(base, 0.06)], 0.3);

    for (let row = 0; row < 4; row += 1) {
      const offset = row % 2 === 0 ? 0 : 3;

      for (let x = 0; x < TILE_SIZE; x += 1) {
        solid(x, row * 4 + 3, dark);

        if ((x + offset) % 6 === 5) {
          for (let y = row * 4; y < row * 4 + 3; y += 1) {
            solid(x, y, dark);
          }
        } else if ((x + offset) % 6 === 0) {
          solid(x, row * 4, light);
        }
      }
    }
  },

  /** [terra, terra escura, grama] */
  'grass-side': ({ solid, random, colors }) => {
    const grass = at(colors, 2, '#5bbf3e');

    speckle(solid, random, colors[0], [at(colors, 1, darken(colors[0], 0.2)), lighten(colors[0], 0.1)], 0.3);

    for (let x = 0; x < TILE_SIZE; x += 1) {
      const depth = 3 + Math.floor(random() * 3);

      for (let y = 0; y < depth; y += 1) {
        solid(x, y, random() < 0.25 ? lighten(grass, 0.15) : grass);
      }

      solid(x, depth, darken(grass, 0.18));
    }
  },

  /** [madeira] */
  planks: ({ solid, random, colors }) => planks(solid, random, colors[0]),

  /** [casca, casca escura] */
  'log-side': ({ solid, random, colors }) => {
    const dark = at(colors, 1, darken(colors[0], 0.25));

    for (let x = 0; x < TILE_SIZE; x += 1) {
      const stripe = x % 4 === 0 || (x % 4 === 2 && random() < 0.5);

      for (let y = 0; y < TILE_SIZE; y += 1) {
        solid(x, y, stripe && random() < 0.85 ? dark : random() < 0.12 ? lighten(colors[0], 0.08) : colors[0]);
      }
    }
  },

  /** [miolo, anel, casca] */
  'log-top': ({ solid, colors }) => {
    const ring = at(colors, 1, darken(colors[0], 0.2));
    const bark = at(colors, 2, darken(colors[0], 0.45));

    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const fromEdge = Math.min(x, y, LAST - x, LAST - y);

        solid(x, y, fromEdge === 0 ? bark : fromEdge === 3 || fromEdge === 6 ? ring : colors[0]);
      }
    }
  },

  /** [folha, folha escura] — com furinhos transparentes. */
  leaves: ({ set, random, colors }) => {
    const dark = at(colors, 1, darken(colors[0], 0.2));

    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const roll = random();

        set(x, y, roll < 0.18 ? null : roll < 0.45 ? dark : roll < 0.55 ? lighten(colors[0], 0.15) : colors[0]);
      }
    }
  },

  /** [pedra, minério, brilho do minério] */
  ore: ({ solid, random, colors }) => {
    const ore = at(colors, 1, '#2b2b2b');
    const shine = at(colors, 2, lighten(ore, 0.3));

    speckle(solid, random, colors[0], [darken(colors[0], 0.12), lighten(colors[0], 0.1)], 0.35);

    for (let cluster = 0; cluster < 5; cluster += 1) {
      const x = 1 + Math.floor(random() * (TILE_SIZE - 3));
      const y = 1 + Math.floor(random() * (TILE_SIZE - 3));

      solid(x, y, ore);
      solid(x + 1, y, ore);
      solid(x, y + 1, ore);
      solid(x + 1, y + 1, darken(ore, 0.15));
      solid(x, y, shine);
    }
  },

  /** [tijolo, rejunte] */
  bricks: ({ solid, random, colors }) => {
    const mortar = at(colors, 1, darken(colors[0], 0.3));

    fill(solid, mortar);

    for (let row = 0; row < 4; row += 1) {
      const offset = row % 2 === 0 ? 0 : 4;

      for (let y = row * 4; y < row * 4 + 3; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
          if ((x + offset) % 8 !== 7) {
            solid(x, y, random() < 0.15 ? darken(colors[0], 0.08) : colors[0]);
          }
        }
      }
    }
  },

  /** [moldura] — miolo transparente com dois riscos de brilho. */
  glass: ({ set, colors }) => {
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        set(x, y, null);
      }
    }

    frame((x, y) => set(x, y, colors[0]), colors[0], 0);

    for (let step = 3; step < 7; step += 1) {
      set(step, 9 - step, '#ffffff');
      set(step + 5, 13 - step, '#ffffff');
    }
  },

  /** [terra, sulco] */
  farmland: ({ solid, random, colors }) => {
    const furrow = at(colors, 1, darken(colors[0], 0.25));

    speckle(solid, random, colors[0], [darken(colors[0], 0.1), lighten(colors[0], 0.08)], 0.3);

    for (const row of [1, 5, 9, 13]) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        solid(x, row, furrow);
        solid(x, row + 1, random() < 0.5 ? furrow : darken(colors[0], 0.1));
      }
    }
  },

  /** [água, onda] */
  /** [roxo, brilho, roxo escuro] — redemoinho com furinhos, para ver o outro lado. */
  portal: ({ set, random, colors }) => {
    const glow = at(colors, 1, lighten(colors[0], 0.3));
    const deep = at(colors, 2, darken(colors[0], 0.3));
    const center = LAST / 2;

    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const swirl = Math.sin(Math.hypot(x - center, y - center) * 1.3 + Math.atan2(y - center, x - center) * 2);

        set(x, y, random() < 0.2 ? null : swirl > 0.45 ? glow : swirl < -0.45 ? deep : colors[0]);
      }
    }
  },

  water: ({ solid, random, colors }) => {
    const wave = at(colors, 1, lighten(colors[0], 0.35));

    speckle(solid, random, colors[0], [lighten(colors[0], 0.08), darken(colors[0], 0.08)], 0.35);

    for (const row of [3, 9]) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        if (x % 6 < 3) {
          solid(x, row + (x % 6 === 1 ? -1 : 0), wave);
        }
      }
    }
  },

  /** [caule, destaque] — muda, flor ou capim. */
  plant: ({ set, random, colors, detail }) => {
    clear(set);

    const stem = colors[0];
    const accent = at(colors, 1, lighten(stem, 0.2));

    if (detail === 'grass') {
      for (let blade = 0; blade < 7; blade += 1) {
        const x = 1 + blade * 2 + Math.floor(random() * 2);
        const height = 6 + Math.floor(random() * 8);

        for (let y = LAST; y > LAST - height; y -= 1) {
          set(Math.min(LAST, x + (y < LAST - height / 2 && blade % 2 === 0 ? 1 : 0)), y, y < LAST - height + 2 ? accent : stem);
        }
      }

      return;
    }

    if (detail === 'flower') {
      verticalLine(set, 7, 8, LAST, stem);
      set(6, 11, stem);
      set(8, 12, stem);

      for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        set(7 + dx, 6 + dy, accent);
      }

      set(7, 6, '#ffe066');
      return;
    }

    verticalLine(set, 7, 9, LAST, stem);
    verticalLine(set, 8, 10, LAST, stem);

    for (let y = 2; y < 10; y += 1) {
      for (let x = 3; x < 13; x += 1) {
        if (Math.hypot(x - 7.5, y - 5.5) < 4.6 && random() < 0.85) {
          set(x, y, random() < 0.3 ? darken(accent, 0.2) : accent);
        }
      }
    }
  },

  /** [caule, espiga] — a altura acompanha o crescimento. */
  crop: ({ set, random, colors, growth }) => {
    clear(set);

    const height = Math.max(3, Math.round(TILE_SIZE * (0.25 + growth * 0.7)));
    const head = at(colors, 1, '#e5c44a');

    for (const x of [2, 5, 8, 11, 14]) {
      const stalk = height - Math.floor(random() * 3);

      for (let y = LAST; y > LAST - stalk; y -= 1) {
        const isHead = growth >= 0.99 && y <= LAST - stalk + 3;

        set(x, y, isHead ? head : colors[0]);
        set(x - 1, y, y % 3 === 0 && !isHead ? darken(colors[0], 0.15) : null);
      }
    }
  },

  /**
   * [cabo, chama] — desenhada no meio, que é a parte usada pela tocha fina.
   * Com o detalhe `lever` é a alavanca: [cabo, bolinha], a bolinha da cor do jeito dela.
   */
  torch: ({ set, colors, detail }) => {
    clear(set);

    const flame = at(colors, 1, '#ffcc33');

    for (let y = 6; y < TILE_SIZE; y += 1) {
      set(7, y, colors[0]);
      set(8, y, darken(colors[0], 0.15));
    }

    if (detail === 'lever') {
      for (let y = 2; y < 6; y += 1) {
        set(7, y, y === 2 ? lighten(flame, 0.35) : flame);
        set(8, y, darken(flame, 0.2));
      }
      return;
    }

    for (const [x, y, color] of [
      [7, 3, '#fff3b0'],
      [8, 3, flame],
      [7, 4, flame],
      [8, 4, flame],
      [7, 5, mix(flame, '#ff7a1a', 0.5)],
      [8, 5, '#ff7a1a'],
    ] as const) {
      set(x, y, color);
    }
  },

  /**
   * [trilho, dormente] — dois trilhos de cima a baixo sobre dormentes de
   * madeira, com o fundo vazado. Simétrico em cima e embaixo: meio trilho
   * (da curva) mostra a mesma coisa venha de que lado vier.
   */
  rail: ({ set, random, colors }) => {
    clear(set);

    const metal = colors[0];
    const wood = at(colors, 1, '#8a5a32');

    for (const top of [1, 5, 9, 13]) {
      for (let x = 1; x < LAST; x += 1) {
        set(x, top, random() < 0.2 ? darken(wood, 0.12) : wood);
        set(x, top + 1, darken(wood, 0.2));
      }
    }

    for (const left of [3, 11]) {
      verticalLine(set, left, 0, LAST, lighten(metal, 0.25));
      verticalLine(set, left + 1, 0, LAST, darken(metal, 0.2));
    }
  },

  /**
   * [fio, sombra do fio] — um fio de cima a baixo no meio, com o fundo vazado.
   * Simétrico como o trilho: meia linha mostra a mesma coisa venha de que lado vier.
   */
  wire: ({ set, colors }) => {
    clear(set);

    const shadow = at(colors, 1, darken(colors[0], 0.3));

    verticalLine(set, 6, 0, LAST, shadow);
    verticalLine(set, 7, 0, LAST, lighten(colors[0], 0.2));
    verticalLine(set, 8, 0, LAST, colors[0]);
    verticalLine(set, 9, 0, LAST, shadow);
  },

  /** [fundo, moldura, detalhe] — mesa, fornalha, baú, cama e porta. */
  panel: ({ set, solid, random, colors, detail }) => {
    const [base, border] = [colors[0], at(colors, 1, darken(colors[0], 0.35))];
    const accent = at(colors, 2, border);

    if (detail === 'door-open') {
      clear(set);
      frame(solid, border, 0);
      frame(solid, base, 1);
      return;
    }

    speckle(solid, random, base, [darken(base, 0.06), lighten(base, 0.05)], 0.25);
    frame(solid, border, 0);
    paintPanelDetail(solid, random, detail, base, border, accent);
  },
};

function paintPanelDetail(
  solid: SetPixel,
  random: () => number,
  detail: TextureDetail | null,
  base: string,
  border: string,
  accent: string,
): void {
  switch (detail) {
    case 'grid':
      for (const line of [5, 10]) {
        for (let step = 1; step < LAST; step += 1) {
          solid(line, step, accent);
          solid(step, line, accent);
        }
      }
      return;
    case 'oven':
      for (let y = 8; y < 14; y += 1) {
        for (let x = 4; x < 12; x += 1) {
          solid(x, y, y >= 12 && random() < 0.6 ? '#ff8c1a' : accent);
        }
      }
      crack(solid, random, darken(base, 0.2), 2);
      return;
    case 'latch':
      for (let x = 1; x < LAST; x += 1) {
        solid(x, 5, border);
      }
      for (const [x, y] of [[7, 4], [8, 4], [7, 5], [8, 5], [7, 6], [8, 6]] as const) {
        solid(x, y, accent);
      }
      return;
    case 'pillow':
      for (let y = 1; y < 6; y += 1) {
        for (let x = 1; x < LAST; x += 1) {
          solid(x, y, border);
        }
      }
      for (let x = 1; x < LAST; x += 2) {
        solid(x, 9, lighten(base, 0.2));
      }
      return;
    case 'door':
      for (const top of [2, 9]) {
        for (let y = top; y < top + 5; y += 1) {
          for (let x = 3; x < 13; x += 1) {
            solid(x, y, x === 3 || x === 12 || y === top || y === top + 4 ? border : darken(base, 0.08));
          }
        }
      }
      solid(11, 8, accent);
      solid(11, 7, accent);
      return;
    case 'band':
      // A faixa clara no meio, com três marquinhas escuras: a cara de TNT, sem precisar escrever.
      for (let y = 6; y < 10; y += 1) {
        for (let x = 1; x < LAST; x += 1) {
          solid(x, y, accent);
        }
      }
      for (const left of [3, 7, 11]) {
        for (let y = 7; y < 9; y += 1) {
          solid(left, y, border);
          solid(left + 1, y, border);
        }
      }
      return;
    case 'plain':
    case null:
    case 'sapling':
    case 'flower':
    case 'grass':
    case 'door-open':
    case 'lever':
      return;
  }
}

/**
 * Pinta uma face na posição (x, y) de um canvas.
 *
 * A semente do ruído vem das cores: duas faces com as mesmas cores saem
 * iguais em todo carregamento, e faces diferentes não ficam com as mesmas
 * manchas.
 */
export function paintTile(
  context: CanvasRenderingContext2D,
  spec: TextureSpec,
  originX = 0,
  originY = 0,
  growth = 1,
): void {
  const random = textureNoise(seedOf(spec));
  const set: TilePixel = (x, y, color) => {
    if (color === null) {
      context.clearRect(originX + x, originY + y, 1, 1);
      return;
    }

    context.fillStyle = color;
    context.fillRect(originX + x, originY + y, 1, 1);
  };

  PAINTERS[spec.pattern]({ set, solid: set, random, colors: spec.colors, detail: spec.detail, growth });
}

function seedOf(spec: TextureSpec): number {
  const text = `${spec.pattern}|${spec.colors.join()}|${spec.detail ?? ''}`;
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }

  return hash >>> 0;
}

function accentsOf(colors: readonly string[]): readonly string[] {
  return colors.length > 1 ? colors.slice(1) : [darken(colors[0], 0.12), lighten(colors[0], 0.1)];
}

function at(colors: readonly string[], index: number, fallback: string): string {
  return colors[index] ?? fallback;
}

function clear(set: TilePixel): void {
  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      set(x, y, null);
    }
  }
}

function verticalLine(set: TilePixel, x: number, fromY: number, toY: number, color: string): void {
  for (let y = fromY; y <= toY; y += 1) {
    set(x, y, color);
  }
}
