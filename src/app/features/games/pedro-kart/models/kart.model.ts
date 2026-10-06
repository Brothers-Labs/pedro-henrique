export type KartBodyId = 'classico' | 'foguete' | 'buggy' | 'dino';

export type KartColorId = 'azul' | 'vermelho' | 'verde' | 'amarelo' | 'laranja' | 'roxo' | 'rosa' | 'preto';

/** Notas de 1 a 5 que a garagem mostra em barrinhas. */
export interface KartStats {
  readonly speed: number;
  readonly acceleration: number;
  readonly handling: number;
}

export interface KartBody {
  readonly id: KartBodyId;
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
  readonly stats: KartStats;
}

export interface KartColor {
  readonly id: KartColorId;
  readonly label: string;
  readonly hex: string;
}

/** O kart escolhido na garagem. */
export interface KartSetup {
  readonly body: KartBodyId;
  readonly color: KartColorId;
}

export type RaceDifficulty = 'facil' | 'normal' | 'dificil';
