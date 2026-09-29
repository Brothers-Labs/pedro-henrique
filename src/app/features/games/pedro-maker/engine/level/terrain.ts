import type * as Phaser from 'phaser';

import { TILESET_INDEX, TILESET_MARGIN, TILESET_SPACING, terrainVariant } from '../../art/block-art';
import { TEXTURES } from '../../art/texture-catalog';
import { TILE_SIZE } from '../../config/physics.config';
import type { LevelBlueprint, TerrainType } from '../../models/level.model';
import { DEPTH } from '../effects';

type TileMaterial = TerrainType | 'platform';

const TERRAIN_TYPES = new Set<string>(['ground', 'stone', 'ice', 'platform']);

export interface Terrain {
  readonly layer: Phaser.Tilemaps.TilemapLayer;
  isSolidAt(worldX: number, worldY: number): boolean;
  isIceAt(worldX: number, worldY: number): boolean;
}

/**
 * Terreno da fase como um mapa de blocos.
 *
 * Um mapa de blocos colide muito mais barato que centenas de corpos soltos e
 * não tem emendas onde o Pedro possa enroscar. A borda de cada bloco — topo
 * com grama, cantos arredondados — é escolhida aqui olhando os vizinhos.
 */
export function buildTerrain(scene: Phaser.Scene, blueprint: LevelBlueprint): Terrain {
  const materials = materialGrid(blueprint);
  const data = materials.map((row, y) => row.map((material, x) => tileIndexFor(materials, material, x, y)));

  const map = scene.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  const tileset = map.addTilesetImage(TEXTURES.tiles, TEXTURES.tiles, TILE_SIZE, TILE_SIZE, TILESET_MARGIN, TILESET_SPACING);

  if (!tileset) {
    throw new Error('O tileset da fase não pôde ser criado.');
  }

  const layer = map.createLayer(0, tileset, 0, 0);

  if (!layer) {
    throw new Error('A camada de terreno da fase não pôde ser criada.');
  }

  layer.setDepth(DEPTH.terrain);
  layer.setCollisionByExclusion([-1]);

  const platformTile = TILESET_INDEX.platform;
  const iceFirst = TILESET_INDEX.ice;
  const iceLast = TILESET_INDEX.ice + 7;

  // Plataforma de mão única: só a face de cima segura o Pedro.
  layer.forEachTile((tile) => {
    if (tile.index === platformTile) {
      tile.setCollision(false, false, true, false);
    }
  });

  return {
    layer,
    isSolidAt: (worldX, worldY) => layer.getTileAtWorldXY(worldX, worldY)?.collides ?? false,
    isIceAt: (worldX, worldY) => {
      const index = layer.getTileAtWorldXY(worldX, worldY)?.index ?? -1;

      return index >= iceFirst && index <= iceLast;
    },
  };
}

function materialGrid(blueprint: LevelBlueprint): (TileMaterial | null)[][] {
  const grid: (TileMaterial | null)[][] = Array.from({ length: blueprint.height }, () =>
    Array.from({ length: blueprint.width }, () => null),
  );

  for (const object of blueprint.objects) {
    if (TERRAIN_TYPES.has(object.type)) {
      const row = grid[object.y];

      if (row) {
        row[object.x] = object.type as TileMaterial;
      }
    }
  }

  return grid;
}

function tileIndexFor(grid: readonly (TileMaterial | null)[][], material: TileMaterial | null, x: number, y: number): number {
  if (material === null) {
    return -1;
  }

  if (material === 'platform') {
    return TILESET_INDEX.platform;
  }

  const isSolid = (column: number, row: number): boolean => {
    const neighbor = grid[row]?.[column];

    return neighbor !== undefined && neighbor !== null && neighbor !== 'platform';
  };

  const width = grid[0]?.length ?? 0;
  // A borda da fase não é "beirada": o chão continua para além da tela.
  const isLeftExposed = x > 0 && !isSolid(x - 1, y);
  const isRightExposed = x < width - 1 && !isSolid(x + 1, y);
  const isTopExposed = y === 0 ? false : !isSolid(x, y - 1);

  return TILESET_INDEX[material] + terrainVariant(isTopExposed, isLeftExposed, isRightExposed);
}
