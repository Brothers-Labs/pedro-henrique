/**
 * Ruído suave em 2D (value noise com várias oitavas), com semente.
 *
 * Cada canto da grade ganha um valor pseudoaleatório pelo hash da posição e
 * da semente; entre os cantos, a interpolação suave faz colinas sem degraus.
 * Sem tabela guardada e sem dependência: o mesmo (x, z, semente) dá sempre o
 * mesmo número, em qualquer aparelho.
 */
export class ValueNoise {
  constructor(private readonly seed: number) {}

  /** Valor em [-1, 1] na posição (x, z), em unidades da grade. */
  sample(x: number, z: number): number {
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    const tx = smooth(x - x0);
    const tz = smooth(z - z0);
    const top = lerp(this.corner(x0, z0), this.corner(x0 + 1, z0), tx);
    const bottom = lerp(this.corner(x0, z0 + 1), this.corner(x0 + 1, z0 + 1), tx);

    return lerp(top, bottom, tz) * 2 - 1;
  }

  /** Soma de oitavas: formas grandes com detalhes menores por cima. Resultado em [-1, 1]. */
  fractal(x: number, z: number, octaves = 4): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let range = 0;

    for (let octave = 0; octave < octaves; octave += 1) {
      total += this.sample(x * frequency + octave * 17.31, z * frequency - octave * 9.73) * amplitude;
      range += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total / range;
  }

  /** Hash inteiro da posição e da semente, em [0, 1). */
  private corner(x: number, z: number): number {
    let hash = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(this.seed, 2246822519);

    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    hash ^= hash >>> 16;

    return (hash >>> 0) / 4294967296;
  }
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
