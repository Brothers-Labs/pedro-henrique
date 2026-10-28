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
}

export const LOOK_SENSITIVITY_RANGE = { min: 0.5, max: 2, step: 0.25 } as const;
