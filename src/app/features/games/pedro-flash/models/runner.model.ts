export type ShoeId = 'relampago' | 'foguete' | 'mola' | 'dino';

export type TrailColorId = 'amarelo' | 'azul' | 'vermelho' | 'verde' | 'roxo' | 'rosa';

/** Notas de 1 a 5 que o vestiário mostra em barrinhas. */
export interface ShoeStats {
  readonly speed: number;
  readonly acceleration: number;
  readonly jump: number;
}

export interface Shoe {
  readonly id: ShoeId;
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
  readonly color: string;
  readonly stats: ShoeStats;
}

export interface TrailColor {
  readonly id: TrailColorId;
  readonly label: string;
  readonly hex: string;
}

/** O visual escolhido no vestiário. */
export interface RunnerSetup {
  readonly shoe: ShoeId;
  readonly trail: TrailColorId;
}

export type FlashDifficulty = 'facil' | 'normal' | 'dificil';

/**
 * Os três jeitos de jogar.
 *
 * - Aventura: o Pedro sozinho, atrás de raios e do melhor tempo.
 * - Corrida: a mesma fase contra três corredores.
 * - Batalha: uma arena fechada e um chefão robô para derrotar.
 */
export type RunMode = 'aventura' | 'corrida' | 'batalha';

export type BossId = 'trovao' | 'tufao' | 'apagao';
