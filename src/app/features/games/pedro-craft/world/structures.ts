import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { AIR, type CraftCatalog } from '../content/craft-catalog';
import { STRUCTURE_AIR } from '../content/parsers/parse-world';
import type { StructureTemplate } from '../models/content.model';

/**
 * Onde uma construção escreve.
 *
 * O gerador escreve sem avisar ninguém (o mundo ainda está nascendo); a muda
 * que vira árvore no meio do jogo escreve avisando a malha e o save. A
 * árvore não precisa saber qual dos dois é.
 */
export interface BlockWriter {
  get(x: number, y: number, z: number): number;
  put(x: number, y: number, z: number, block: number): void;
}

export interface TreeShape {
  readonly log: number;
  readonly leaves: number;
  readonly height: number;
}

/**
 * Árvore de cubos: tronco reto e copa em camadas, mais larga embaixo.
 *
 * Só ocupa ar ou blocos substituíveis — uma árvore nunca apaga a parede da
 * casa nem o bloco que alguém colocou. Os cantos da copa caem por sorteio,
 * para as árvores não saírem iguais.
 */
export function placeTree(
  writer: BlockWriter,
  catalog: CraftCatalog,
  x: number,
  baseY: number,
  z: number,
  shape: TreeShape,
  random: SeededRandom,
): void {
  const top = baseY + shape.height - 1;
  const canFill = (block: number): boolean => block === AIR || (catalog.blockAt(block)?.replaceable ?? false);

  for (let layer = top - 2; layer <= top + 1; layer += 1) {
    const radius = layer <= top - 1 ? 2 : 1;

    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const isCorner = Math.abs(dx) === radius && Math.abs(dz) === radius;

        if (isCorner && (layer === top + 1 || random.chance(0.5))) {
          continue;
        }

        if (canFill(writer.get(x + dx, layer, z + dz))) {
          writer.put(x + dx, layer, z + dz, shape.leaves);
        }
      }
    }
  }

  for (let y = baseY; y <= top; y += 1) {
    const current = writer.get(x, y, z);

    if (canFill(current) || current === shape.leaves) {
      writer.put(x, y, z, shape.log);
    }
  }
}

/** Tamanho de uma construção desenhada em camadas. */
export function structureSize(template: StructureTemplate): { readonly width: number; readonly depth: number; readonly height: number } {
  return { width: template.layers[0][0].length, depth: template.layers[0].length, height: template.layers.length };
}

/**
 * Constrói um molde com o canto (x, y, z) na origem.
 *
 * O ponto (`.`) também escreve: vira ar. É o que limpa o capim e as flores
 * que estavam dentro da casa antes dela ser erguida.
 */
export function placeStructure(
  writer: BlockWriter,
  catalog: CraftCatalog,
  template: StructureTemplate,
  originX: number,
  originY: number,
  originZ: number,
): void {
  template.layers.forEach((layer, y) => {
    layer.forEach((row, z) => {
      [...row].forEach((symbol, x) => {
        const block = symbol === STRUCTURE_AIR ? AIR : catalog.blockNumber(template.palette[symbol]);

        writer.put(originX + x, originY + y, originZ + z, block);
      });
    });
  });
}
