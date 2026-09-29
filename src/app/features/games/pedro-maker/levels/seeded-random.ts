/**
 * Gerador pseudoaleatório com semente (mulberry32).
 *
 * A mesma semente produz sempre a mesma sequência: é o que faz a fase 2-4 ser
 * a mesma fase em todo aparelho e em toda partida, mesmo sendo gerada.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = Math.trunc(seed) >>> 0;
  }

  /** Número em [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;

    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [min, max], com os dois extremos incluídos. */
  integer(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<TItem>(items: readonly [TItem, ...TItem[]]): TItem {
    return items[Math.floor(this.next() * items.length)] ?? items[0];
  }

  /** Sorteia respeitando pesos; pesos zero nunca saem. */
  weighted<TItem>(entries: readonly (readonly [TItem, number])[]): TItem {
    const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);

    if (entries.length === 0 || total <= 0) {
      throw new Error('Sorteio com pesos precisa de pelo menos uma opção com peso positivo.');
    }

    let roll = this.next() * total;

    for (const [item, weight] of entries) {
      roll -= Math.max(0, weight);

      if (roll < 0) {
        return item;
      }
    }

    return entries[entries.length - 1][0];
  }
}

/** Semente estável a partir de um texto, para fases nomeadas como "2-4". */
export function seedFromText(text: string): number {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
