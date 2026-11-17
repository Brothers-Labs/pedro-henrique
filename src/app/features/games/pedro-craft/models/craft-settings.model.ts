import type { HeroId } from '../../pedro-maker/models/progress.model';

/** Uma criança, duas na tela dividida ao meio, ou três na tela dividida em quatro. */
export type CraftPlayerCount = 1 | 2 | 3;

/** Quando mostrar os controles de toque durante o jogo. */
export type CraftTouchMode = 'automatico' | 'sempre' | 'nunca';

/** Fácil: inimigos mais lentos e que atacam menos. */
export type CraftDifficulty = 'facil' | 'normal';

/** Tamanho dos botões de toque: "grande" é para mãos pequenas acertarem sem olhar. */
export type CraftButtonSize = 'normal' | 'grande';

export interface CraftSettings {
  /** Sem inimigos. Começa ligado quando o modo calmo do site está ligado. */
  readonly peaceful: boolean;
  readonly difficulty: CraftDifficulty;
  /** Multiplica o giro do olhar, de 0,5 a 2. */
  readonly lookSensitivity: number;
  /** Encostar num degrau andando faz o herói subir sozinho. */
  readonly autoJump: boolean;
  readonly touchControls: CraftTouchMode;
  readonly buttonSize: CraftButtonSize;
  /** Lê em voz alta as missões e os avisos, para quem ainda não lê. */
  readonly readAloud: boolean;
  /** Os primeiros passos guiados já foram vistos neste aparelho. */
  readonly hasSeenFirstSteps: boolean;
  /**
   * Quantas crianças jogam: com 2, a tela divide ao meio e o Jogador 2 usa o
   * controle ou o lado direito do teclado; com 3, o Jogador 3 usa o segundo controle.
   */
  readonly players: CraftPlayerCount;
  /** Herói do Pedro Maker do Jogador 1. */
  readonly hero: HeroId;
  /** Herói do Pedro Maker do Jogador 2. */
  readonly partnerHero: HeroId;
  /** Herói do Pedro Maker do Jogador 3. */
  readonly thirdHero: HeroId;
}

export const LOOK_SENSITIVITY_RANGE = { min: 0.5, max: 2, step: 0.25 } as const;
