import type {
  BossDefinition,
  LevelBlueprint,
  LevelObject,
  LevelObjectProperties,
  LevelObjectType,
  LevelTheme,
} from '../models/level.model';

export interface BlueprintMeta {
  readonly id: string;
  readonly name: string;
  readonly theme: LevelTheme;
  readonly targetTimeSeconds: number;
  readonly boss?: BossDefinition;
}

/**
 * Montador de fases.
 *
 * As fases da campanha são escritas com ele, trecho a trecho, na ordem em que
 * a criança vai atravessá-las — é bem mais fácil de ler e ajustar do que uma
 * grade de caracteres com duzentas colunas. O gerador de fase surpresa usa o
 * mesmo montador.
 *
 * Uma célula guarda um objeto só: colocar outro por cima substitui o anterior,
 * exatamente como no editor.
 */
export class LevelBuilder {
  private readonly cells = new Map<number, LevelObject>();
  private sequence = 0;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  add(type: LevelObjectType, x: number, y: number, properties?: LevelObjectProperties): this {
    if (!this.isInside(x, y)) {
      return this;
    }

    this.sequence += 1;
    this.cells.set(this.key(x, y), {
      id: `${type}-${this.sequence}`,
      type,
      x,
      y,
      ...(properties ? { properties } : {}),
    });

    return this;
  }

  remove(x: number, y: number): this {
    this.cells.delete(this.key(x, y));

    return this;
  }

  typeAt(x: number, y: number): LevelObjectType | null {
    return this.cells.get(this.key(x, y))?.type ?? null;
  }

  /** Terreno do topo `surfaceRow` até o fundo da fase, entre duas colunas. */
  ground(fromX: number, toX: number, surfaceRow: number, type: LevelObjectType = 'ground'): this {
    for (let x = fromX; x <= toX; x += 1) {
      for (let y = surfaceRow; y < this.height; y += 1) {
        this.add(type, x, y);
      }
    }

    return this;
  }

  /** Retângulo cheio, com os dois cantos incluídos. */
  fill(type: LevelObjectType, fromX: number, toX: number, fromY: number, toY: number): this {
    for (let x = fromX; x <= toX; x += 1) {
      for (let y = fromY; y <= toY; y += 1) {
        this.add(type, x, y);
      }
    }

    return this;
  }

  row(type: LevelObjectType, x: number, y: number, length: number, properties?: LevelObjectProperties): this {
    for (let offset = 0; offset < length; offset += 1) {
      this.add(type, x + offset, y, properties);
    }

    return this;
  }

  /** Esvazia uma faixa de colunas inteira: é assim que se abre um buraco. */
  clearColumns(fromX: number, toX: number): this {
    for (let x = fromX; x <= toX; x += 1) {
      for (let y = 0; y < this.height; y += 1) {
        this.remove(x, y);
      }
    }

    return this;
  }

  coins(x: number, y: number, count: number): this {
    return this.row('coin', x, y, count);
  }

  /** Moedas em arco, desenhando o caminho do pulo que a criança deve fazer. */
  coinArc(x: number, baseY: number, count: number): this {
    const middle = (count - 1) / 2;

    for (let offset = 0; offset < count; offset += 1) {
      const lift = Math.round(2 - (Math.abs(offset - middle) / Math.max(1, middle)) * 2);
      this.add('coin', x + offset, baseY - lift);
    }

    return this;
  }

  build(meta: BlueprintMeta): LevelBlueprint {
    return {
      ...meta,
      width: this.width,
      height: this.height,
      objects: [...this.cells.values()],
    };
  }

  private isInside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  private key(x: number, y: number): number {
    return y * this.width + x;
  }
}
