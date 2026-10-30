import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';

import { context2d, createCanvas } from '../../../pedro-maker/art/canvas';
import { paintTile, TILE_SIZE } from '../../art/craft-tiles';
import type { CraftCatalog } from '../../content/craft-catalog';
import type { TextureSpec } from '../../models/content.model';
import type { FaceKind, TileSource, TileUv } from './chunk-mesher';

/** Faces por linha no atlas. */
const ATLAS_COLUMNS = 16;

/** Borda repetida em volta de cada face: a placa nunca pega um pixel da vizinha. */
const PADDING = 1;

const SLOT = TILE_SIZE + PADDING * 2;

/** Recuo de meio pixel nas bordas de cada face, pelo mesmo motivo. */
const HALF_TEXEL = 0.5;

interface BlockTiles {
  readonly top: number;
  readonly side: number;
  readonly bottom: number;
  /** Uma face por estágio, só nas plantações. */
  readonly stages: readonly number[] | null;
}

/**
 * Todas as faces dos blocos numa textura só.
 *
 * Faces com a mesma receita (padrão e cores) são pintadas uma vez: a terra do
 * lado da grama e a terra pura dividem o mesmo quadradinho. As plantações
 * ganham uma face por estágio de crescimento.
 */
export class BlockAtlas implements TileSource {
  readonly texture: CanvasTexture;
  readonly canvas: HTMLCanvasElement;

  private readonly tilesByBlock: readonly (BlockTiles | null)[];
  private readonly uvs: readonly TileUv[];
  private readonly recipes: readonly TileRecipe[];

  constructor(catalog: CraftCatalog) {
    const recipes: TileRecipe[] = [];
    const indexByKey = new Map<string, number>();
    const register = (spec: TextureSpec, growth = 1): number => {
      const key = `${spec.pattern}|${spec.colors.join()}|${spec.detail ?? ''}|${growth}`;
      const known = indexByKey.get(key);

      if (known !== undefined) {
        return known;
      }

      recipes.push({ spec, growth });
      indexByKey.set(key, recipes.length - 1);

      return recipes.length - 1;
    };

    const tilesByBlock: (BlockTiles | null)[] = [null];

    for (const block of catalog.content.blocks) {
      const crop = catalog.cropForBlock(block.id);
      const stages = crop
        ? Array.from({ length: crop.stages }, (_, stage) => register(block.textures.side, (stage + 1) / crop.stages))
        : null;

      tilesByBlock.push({
        top: register(block.textures.top),
        side: register(block.textures.side),
        bottom: register(block.textures.bottom),
        stages,
      });
    }

    this.tilesByBlock = tilesByBlock;
    this.recipes = recipes;
    this.canvas = paintAtlas(recipes);
    this.uvs = recipes.map((_, index) => uvOf(index, this.canvas.width, this.canvas.height));

    const texture = new CanvasTexture(this.canvas);

    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = SRGBColorSpace;
    this.texture = texture;
  }

  tile(block: number, face: FaceKind, stage: number): TileUv {
    const tiles = this.tilesByBlock[block];

    if (!tiles) {
      return this.uvs[0];
    }

    if (tiles.stages) {
      return this.uvs[tiles.stages[Math.min(stage, tiles.stages.length - 1)]];
    }

    return this.uvs[tiles[face]];
  }

  /**
   * Repinta as faces com as cores da estação (a grama branca de neve, as
   * folhas laranjas). Acontece uma vez por estação, não a cada quadro; a
   * paleta vazia volta às cores originais.
   */
  applyPalette(palette: Readonly<Record<string, string>>): void {
    const swap = (color: string): string => palette[color.toLowerCase()] ?? color;

    paintRecipes(
      this.canvas,
      this.recipes.map(({ spec, growth }) => ({ spec: { ...spec, colors: spec.colors.map(swap) }, growth })),
    );
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

interface TileRecipe {
  readonly spec: TextureSpec;
  readonly growth: number;
}

function paintAtlas(recipes: readonly TileRecipe[]): HTMLCanvasElement {
  const rows = Math.max(1, Math.ceil(recipes.length / ATLAS_COLUMNS));
  const canvas = createCanvas(ATLAS_COLUMNS * SLOT, rows * SLOT);

  paintRecipes(canvas, recipes);

  return canvas;
}

function paintRecipes(canvas: HTMLCanvasElement, recipes: readonly TileRecipe[]): void {
  const context = context2d(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  recipes.forEach(({ spec, growth }, index) => {
    const left = (index % ATLAS_COLUMNS) * SLOT + PADDING;
    const top = Math.floor(index / ATLAS_COLUMNS) * SLOT + PADDING;

    paintTile(context, spec, left, top, growth);
    extrudeEdges(context, left, top);
  });
}

function uvOf(index: number, width: number, height: number): TileUv {
  const left = (index % ATLAS_COLUMNS) * SLOT + PADDING + HALF_TEXEL;
  const top = Math.floor(index / ATLAS_COLUMNS) * SLOT + PADDING + HALF_TEXEL;
  const right = left + TILE_SIZE - HALF_TEXEL * 2;
  const bottom = top + TILE_SIZE - HALF_TEXEL * 2;

  // A textura sobe invertida para a placa: o topo do canvas é o v mais alto.
  return { u0: left / width, u1: right / width, v0: 1 - bottom / height, v1: 1 - top / height };
}

/** Copia a última linha e coluna de cada lado para a borda do espaço da face. */
function extrudeEdges(context: CanvasRenderingContext2D, left: number, top: number): void {
  const size = TILE_SIZE;

  context.drawImage(context.canvas, left, top, size, 1, left, top - PADDING, size, PADDING);
  context.drawImage(context.canvas, left, top + size - 1, size, 1, left, top + size, size, PADDING);
  context.drawImage(context.canvas, left, top - PADDING, 1, size + PADDING * 2, left - PADDING, top - PADDING, PADDING, size + PADDING * 2);
  context.drawImage(context.canvas, left + size - 1, top - PADDING, 1, size + PADDING * 2, left + size, top - PADDING, PADDING, size + PADDING * 2);
}
