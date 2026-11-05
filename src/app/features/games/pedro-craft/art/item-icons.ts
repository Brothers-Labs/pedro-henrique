import { context2d, createCanvas, darken, lighten, OUTLINE } from '../../pedro-maker/art/canvas';
import type { CraftCatalog } from '../content/craft-catalog';
import type { BlockDefinition, IconShape, ItemIcon } from '../models/content.model';
import { paintTile, TILE_SIZE } from './craft-tiles';

/**
 * Ícones dos itens: o mesmo desenho na barra, na mochila e no item caído.
 *
 * Bloco vira um cubinho em perspectiva, pintado com as próprias faces do
 * JSON. O resto (ferramentas, comida, materiais) é desenhado em 16 × 16
 * pixels com contorno escuro, para ler bem em qualquer fundo.
 */

const HANDLE = '#8a5a32';
const SPRITE_SIZE = 16;

/** Espessura do tapete no ícone: mais grosso que no mundo, para a beirada colorida aparecer na barra. */
const CARPET_ICON_HEIGHT = 3 / 16;

type Pixel = (x: number, y: number, color: string) => void;

interface SpriteBrush {
  readonly pixel: Pixel;
  line(fromX: number, fromY: number, toX: number, toY: number, color: string, thickness?: number): void;
  disc(centerX: number, centerY: number, radius: number, color: string): void;
  rect(x: number, y: number, width: number, height: number, color: string): void;
}

const SPRITES: Readonly<Record<IconShape, (brush: SpriteBrush, colors: readonly string[]) => void>> = {
  stick: (brush, [color]) => brush.line(3, 12, 12, 3, color ?? HANDLE, 2),
  pickaxe: (brush, [head]) => {
    brush.line(3, 13, 11, 5, HANDLE, 2);
    brush.line(6, 2, 13, 9, head ?? '#c08a50', 2);
    brush.pixel(5, 3, head ?? '#c08a50');
    brush.pixel(12, 10, head ?? '#c08a50');
  },
  axe: (brush, [head]) => {
    brush.line(3, 13, 11, 5, HANDLE, 2);
    brush.rect(9, 2, 4, 5, head ?? '#c08a50');
    brush.rect(8, 3, 1, 3, head ?? '#c08a50');
    brush.pixel(13, 4, lighten(head ?? '#c08a50', 0.3));
  },
  shovel: (brush, [head]) => {
    brush.line(3, 13, 10, 6, HANDLE, 2);
    brush.disc(11.5, 4.5, 2.6, head ?? '#c08a50');
  },
  hoe: (brush, [head]) => {
    brush.line(3, 13, 11, 5, HANDLE, 2);
    brush.line(9, 3, 13, 3, head ?? '#c08a50', 2);
    brush.pixel(13, 5, head ?? '#c08a50');
  },
  sword: (brush, [blade]) => {
    brush.line(6, 10, 13, 3, blade ?? '#c08a50', 2);
    brush.pixel(13, 2, lighten(blade ?? '#c08a50', 0.3));
    brush.line(3, 8, 7, 12, '#5b3b20', 1);
    brush.line(2, 13, 5, 10, HANDLE, 2);
  },
  bow: (brush, [wood, string]) => {
    for (let step = 0; step <= 10; step += 1) {
      const angle = (step / 10) * Math.PI;
      brush.pixel(Math.round(3 + Math.sin(angle) * 5), Math.round(2 + step * 1.2), wood ?? HANDLE);
      brush.pixel(Math.round(4 + Math.sin(angle) * 5), Math.round(2 + step * 1.2), wood ?? HANDLE);
    }
    brush.line(3, 2, 3, 14, string ?? '#f4f4f4', 1);
  },
  arrow: (brush, [shaft, tip, feather]) => {
    brush.line(3, 12, 11, 4, shaft ?? HANDLE, 1);
    brush.rect(11, 2, 3, 3, tip ?? '#bfc6cf');
    brush.line(2, 11, 4, 13, feather ?? '#f4f4f4', 1);
    brush.line(3, 10, 5, 12, feather ?? '#f4f4f4', 1);
  },
  bucket: (brush, [metal, content]) => {
    brush.rect(3, 6, 10, 8, metal ?? '#e6e9ee');
    brush.rect(2, 5, 12, 2, darken(metal ?? '#e6e9ee', 0.2));
    brush.line(4, 5, 8, 1, '#8f969e', 1);
    brush.line(8, 1, 12, 5, '#8f969e', 1);

    if (content) {
      brush.rect(4, 6, 8, 2, content);
    }
  },
  shears: (brush, [metal]) => {
    brush.line(4, 11, 12, 3, metal ?? '#e6e9ee', 1);
    brush.line(4, 3, 12, 11, metal ?? '#e6e9ee', 1);
    brush.disc(3.5, 12.5, 1.6, '#e24b4b');
    brush.disc(12.5, 12.5, 1.6, '#e24b4b');
  },
  apple: (brush, [skin, leaf]) => {
    brush.disc(8, 9, 5, skin ?? '#e53935');
    brush.pixel(6, 7, lighten(skin ?? '#e53935', 0.4));
    brush.line(8, 2, 8, 4, HANDLE, 1);
    brush.rect(9, 2, 3, 2, leaf ?? '#4caf50');
  },
  bread: (brush, [crust, top]) => {
    brush.rect(2, 7, 12, 6, crust ?? '#d9953f');
    brush.rect(3, 6, 10, 1, crust ?? '#d9953f');
    for (const x of [4, 7, 10]) {
      brush.line(x, 8, x + 1, 7, top ?? '#b5702a', 1);
    }
  },
  carrot: (brush, [root, leaves]) => {
    brush.line(4, 12, 10, 6, root ?? '#ff8c1a', 3);
    brush.pixel(3, 13, root ?? '#ff8c1a');
    brush.line(11, 5, 13, 2, leaves ?? '#4caf50', 1);
    brush.line(11, 5, 14, 5, leaves ?? '#4caf50', 1);
  },
  wheat: (brush, [grain, stalk]) => {
    for (const x of [5, 8, 11]) {
      brush.line(x, 14, x, 7, stalk ?? '#c9a03a', 1);
      brush.rect(x - 1, 2, 3, 5, grain ?? '#e5c44a');
    }
  },
  seeds: (brush, [first, second]) => {
    for (const [x, y, index] of [[4, 5, 0], [9, 4, 1], [6, 9, 1], [11, 10, 0], [3, 12, 1], [12, 6, 0]] as const) {
      brush.rect(x, y, 2, 2, (index === 0 ? first : second) ?? '#7cbf3a');
    }
  },
  lump: (brush, [base, shine]) => {
    brush.disc(8, 8, 5, base ?? '#2b2b2b');
    brush.rect(6, 5, 2, 2, shine ?? '#555555');
    brush.rect(10, 9, 1, 2, shine ?? '#555555');
  },
  ingot: (brush, [base, shade]) => {
    brush.rect(2, 7, 12, 5, base ?? '#e6e9ee');
    brush.rect(4, 5, 8, 2, lighten(base ?? '#e6e9ee', 0.2));
    brush.rect(2, 11, 12, 1, shade ?? darken(base ?? '#e6e9ee', 0.25));
  },
  egg: (brush, [shell]) => {
    brush.disc(8, 9, 4.5, shell ?? '#f7efe0');
    brush.disc(8, 6, 3.5, shell ?? '#f7efe0');
    brush.pixel(6, 6, '#ffffff');
  },
  'fried-egg': (brush, [white, yolk]) => {
    brush.disc(8, 8, 6, white ?? '#ffffff');
    brush.disc(8, 8, 2.5, yolk ?? '#ffc629');
  },
  feather: (brush, [vane, shaft]) => {
    brush.line(4, 13, 12, 3, shaft ?? '#d9d9d9', 1);
    for (let step = 0; step < 6; step += 1) {
      brush.line(6 + step, 10 - step, 8 + step, 11 - step, vane ?? '#ffffff', 1);
    }
  },
  string: (brush, [color]) => {
    for (let x = 2; x < 14; x += 1) {
      brush.pixel(x, Math.round(8 + Math.sin(x * 0.9) * 3), color ?? '#f4f4f4');
    }
  },
  potato: (brush, [skin, spot]) => {
    brush.disc(7, 9, 4.5, skin ?? '#c9a063');
    brush.disc(10, 7, 3.5, skin ?? '#c9a063');
    for (const [x, y] of [[5, 8], [9, 6], [8, 11], [11, 9]] as const) {
      brush.pixel(x, y, spot ?? '#a07a45');
    }
  },
  beetroot: (brush, [root, leaves]) => {
    brush.disc(8, 10, 4, root ?? '#b8344a');
    brush.line(8, 14, 8, 15, root ?? '#b8344a', 1);
    brush.pixel(6, 9, lighten(root ?? '#b8344a', 0.35));
    brush.line(8, 6, 6, 2, leaves ?? '#4caf50', 1);
    brush.line(8, 6, 10, 2, leaves ?? '#4caf50', 1);
  },
  bowl: (brush, [wood, soup]) => {
    brush.rect(2, 8, 12, 2, wood ?? '#8a5a32');
    brush.rect(3, 10, 10, 2, wood ?? '#8a5a32');
    brush.rect(5, 12, 6, 1, darken(wood ?? '#8a5a32', 0.2));

    if (soup) {
      brush.rect(3, 7, 10, 1, soup);
      brush.pixel(6, 7, lighten(soup, 0.35));
    }
  },
  pumpkin: (brush, [skin, stem]) => {
    brush.disc(8, 9, 5.5, skin ?? '#ff8c1a');
    for (const x of [5, 8, 11]) {
      brush.line(x, 5, x, 13, darken(skin ?? '#ff8c1a', 0.2), 1);
    }
    brush.rect(7, 2, 2, 3, stem ?? '#4caf50');
  },
  pie: (brush, [crust, filling]) => {
    brush.rect(2, 8, 12, 5, crust ?? '#d9953f');
    brush.rect(3, 7, 10, 1, filling ?? '#ff8c1a');
    brush.rect(4, 9, 8, 2, filling ?? '#ff8c1a');
    brush.rect(2, 12, 12, 1, darken(crust ?? '#d9953f', 0.25));
  },
  'melon-slice': (brush, [flesh, rind]) => {
    for (let row = 0; row < 7; row += 1) {
      brush.rect(8 - row, 4 + row, row * 2 + 1, 1, flesh ?? '#e53935');
    }
    brush.rect(1, 11, 15, 2, rind ?? '#4caf50');
    for (const [x, y] of [[7, 7], [5, 9], [9, 9], [11, 10]] as const) {
      brush.pixel(x, y, '#2b2b2b');
    }
  },
  cake: (brush, [sponge, frosting]) => {
    brush.rect(2, 7, 12, 7, sponge ?? '#fff5e6');
    brush.rect(2, 6, 12, 2, frosting ?? '#ff7aa8');
    brush.rect(4, 8, 1, 2, frosting ?? '#ff7aa8');
    brush.rect(9, 8, 1, 3, frosting ?? '#ff7aa8');
    brush.rect(7, 3, 2, 3, '#ffcf3f');
  },
  bone: (brush, [color]) => {
    brush.line(4, 12, 12, 4, color ?? '#f4f1e8', 2);
    for (const [x, y] of [[3, 11], [4, 13], [11, 3], [13, 4]] as const) {
      brush.disc(x, y, 1.5, color ?? '#f4f1e8');
    }
  },
  powder: (brush, [main, accent]) => {
    for (let row = 0; row < 5; row += 1) {
      brush.rect(8 - row - 1, 8 + row, (row + 1) * 2, 1, main ?? '#ffffff');
    }
    for (const [x, y] of [[6, 10], [9, 11], [7, 12], [10, 9]] as const) {
      brush.pixel(x, y, accent ?? '#d9dde3');
    }
  },
  armor: (brush, [plate, trim]) => {
    brush.rect(3, 3, 3, 3, plate ?? '#e6e9ee');
    brush.rect(10, 3, 3, 3, plate ?? '#e6e9ee');
    brush.rect(4, 5, 8, 9, plate ?? '#e6e9ee');
    brush.rect(4, 13, 8, 1, trim ?? '#b9c0c8');
    brush.rect(7, 6, 2, 6, trim ?? '#b9c0c8');
  },
  shield: (brush, [wood, rim]) => {
    brush.rect(3, 2, 10, 9, wood ?? '#c08a50');
    for (let row = 0; row < 4; row += 1) {
      brush.rect(4 + row, 11 + row, 8 - row * 2, 1, wood ?? '#c08a50');
    }
    brush.rect(3, 2, 10, 1, rim ?? '#8f969e');
    brush.rect(7, 3, 2, 10, rim ?? '#8f969e');
  },
  crown: (brush, [gold, gem]) => {
    brush.rect(2, 8, 12, 5, gold ?? '#f5c542');
    for (const x of [2, 7, 12]) {
      brush.rect(x, 4, 2, 4, gold ?? '#f5c542');
    }
    brush.rect(4, 10, 2, 2, gem ?? '#e53935');
    brush.rect(10, 10, 2, 2, gem ?? '#3fa3f5');
  },
  gem: (brush, [face, shine]) => {
    const color = face ?? '#4fe3e0';

    brush.rect(5, 3, 6, 2, lighten(color, 0.25));
    brush.rect(3, 5, 10, 2, color);
    for (let row = 0; row < 4; row += 1) {
      brush.rect(4 + row, 7 + row, 8 - row * 2, 1, darken(color, 0.15));
    }
    brush.pixel(6, 4, shine ?? '#ffffff');
    brush.pixel(5, 6, shine ?? '#ffffff');
  },
  train: (brush, [boiler, cab, wheel]) => {
    const body = boiler ?? '#e53935';

    brush.rect(2, 7, 8, 4, body);
    brush.rect(3, 4, 2, 3, '#2b2b2b');
    brush.rect(9, 4, 5, 7, cab ?? '#2f8fe0');
    brush.rect(10, 5, 3, 2, '#d6f1ff');
    brush.rect(1, 11, 14, 1, darken(body, 0.35));
    brush.pixel(1, 8, '#fff3b0');
    for (const x of [4, 8, 12]) {
      brush.disc(x, 13, 1.6, wheel ?? '#3d3d45');
    }
  },
  cane: (brush, [stalk, leaf]) => {
    for (const x of [5, 10]) {
      brush.line(x, 14, x, 2, stalk ?? '#9ccc65', 2);
      for (const y of [5, 9, 13]) {
        brush.rect(x, y, 2, 1, darken(stalk ?? '#9ccc65', 0.25));
      }
    }
    brush.line(7, 6, 9, 3, leaf ?? '#6b9b37', 1);
  },
};

/** Pinta o ícone de um item num canvas quadrado de `size` pixels. */
export function paintItemIcon(catalog: CraftCatalog, itemId: string, size: number): HTMLCanvasElement {
  const canvas = createCanvas(size, size);
  const context = context2d(canvas);
  const icon: ItemIcon = catalog.item(itemId).icon;

  context.imageSmoothingEnabled = false;

  if (icon.type === 'block') {
    paintBlockIcon(context, catalog.block(icon.block), size);
  } else {
    context.drawImage(paintSprite(icon.shape, icon.colors), 0, 0, size, size);
  }

  return canvas;
}

/**
 * Bloco inteiro em perspectiva; o tapete é a mesma peça, só que baixinha.
 * Planta, tocha, água e trilho ficam de frente, como a criança os reconhece.
 */
function paintBlockIcon(context: CanvasRenderingContext2D, block: BlockDefinition, size: number): void {
  const side = tileCanvas(block, 'side');

  if (block.shape === 'cross' || block.shape === 'torch' || block.shape === 'liquid' || block.shape === 'rail') {
    context.drawImage(side, 0, 0, size, size);
    return;
  }

  const unit = size / TILE_SIZE;
  const height = block.shape === 'carpet' ? CARPET_ICON_HEIGHT : 1;
  // A peça baixa desce para o meio do ícone, em vez de ficar grudada no alto.
  const drop = ((1 - height) * size) / 4;
  const faces: readonly (readonly [HTMLCanvasElement, readonly number[], string | null])[] = [
    [tileCanvas(block, 'top'), [unit / 2, unit / 4, -unit / 2, unit / 4, size / 2, drop], null],
    [side, [unit / 2, unit / 4, 0, (unit / 2) * height, 0, size / 4 + drop], 'rgba(0, 0, 0, 0.18)'],
    [side, [unit / 2, -unit / 4, 0, (unit / 2) * height, size / 2, size / 2 + drop], 'rgba(0, 0, 0, 0.34)'],
  ];

  for (const [tile, [a, b, c, d, e, f], shade] of faces) {
    context.setTransform(a, b, c, d, e, f);
    context.drawImage(tile, 0, 0);

    if (shade) {
      context.globalCompositeOperation = 'source-atop';
      context.fillStyle = shade;
      context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      context.globalCompositeOperation = 'source-over';
    }
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
}

function tileCanvas(block: BlockDefinition, face: 'top' | 'side'): HTMLCanvasElement {
  const canvas = createCanvas(TILE_SIZE, TILE_SIZE);

  paintTile(context2d(canvas), block.textures[face]);

  return canvas;
}

/** Desenho de 16 × 16 com contorno de um pixel em volta de tudo que foi pintado. */
function paintSprite(shape: IconShape, colors: readonly string[]): HTMLCanvasElement {
  const canvas = createCanvas(SPRITE_SIZE, SPRITE_SIZE);
  const context = context2d(canvas);
  const pixel: Pixel = (x, y, color) => {
    if (x >= 0 && y >= 0 && x < SPRITE_SIZE && y < SPRITE_SIZE) {
      context.fillStyle = color;
      context.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  };
  const brush: SpriteBrush = {
    pixel,
    line: (fromX, fromY, toX, toY, color, thickness = 1) => {
      const steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));

      for (let step = 0; step <= steps; step += 1) {
        const x = fromX + ((toX - fromX) * step) / Math.max(1, steps);
        const y = fromY + ((toY - fromY) * step) / Math.max(1, steps);

        for (let offset = 0; offset < thickness; offset += 1) {
          pixel(x + offset, y, color);
        }
      }
    },
    disc: (centerX, centerY, radius, color) => {
      for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
        for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
          if (Math.hypot(x + 0.5 - centerX, y + 0.5 - centerY) <= radius) {
            pixel(x, y, color);
          }
        }
      }
    },
    rect: (x, y, width, height, color) => {
      context.fillStyle = color;
      context.fillRect(x, y, width, height);
    },
  };

  SPRITES[shape](brush, colors);
  outline(context);

  return canvas;
}

/** Pinta de escuro todo pixel vazio encostado num pixel pintado. */
function outline(context: CanvasRenderingContext2D): void {
  const image = context.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  const alpha = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= SPRITE_SIZE || y >= SPRITE_SIZE ? 0 : image.data[(y * SPRITE_SIZE + x) * 4 + 3];

  context.fillStyle = OUTLINE;

  for (let y = 0; y < SPRITE_SIZE; y += 1) {
    for (let x = 0; x < SPRITE_SIZE; x += 1) {
      if (alpha(x, y) === 0 && (alpha(x - 1, y) || alpha(x + 1, y) || alpha(x, y - 1) || alpha(x, y + 1))) {
        context.fillRect(x, y, 1, 1);
      }
    }
  }
}
