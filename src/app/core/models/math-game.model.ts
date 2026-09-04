import type { ThemeColor } from './profile.model';

/** Faixas etárias que definem o tipo de conta gerado na trilha. */
export type MathBandId = 'descobrindo' | 'somando' | 'crescendo' | 'desafiando';

/** Tipo de desafio proposto em uma fase. */
export type MathOperation =
  | 'contagem'
  | 'sequencia'
  | 'soma'
  | 'subtracao'
  | 'multiplicacao'
  | 'divisao';

/** Selo de dificuldade mostrado no mapa; cresce ao longo da trilha. */
export type MathStageTier = 'facil' | 'medio' | 'dificil';

/**
 * Faixa etária do jogo de matemática.
 *
 * A faixa é o único lugar que decide o que aparece na trilha: quais operações
 * entram, até que número as contas chegam e quando a criança deixa de responder
 * por botões e passa a digitar.
 */
export interface MathAgeBand {
  readonly id: MathBandId;
  readonly label: string;
  readonly emoji: string;
  readonly color: ThemeColor;
  readonly minAge: number;
  readonly maxAge: number;
  /** Frase curta que a criança lê antes de começar. */
  readonly description: string;
  /** Operações percorridas em ciclo, uma por fase. */
  readonly operations: readonly [MathOperation, ...MathOperation[]];
  /** Maior número usado na primeira fase da trilha. */
  readonly firstStageCeiling: number;
  /** Maior número usado na última fase; as do meio crescem aos poucos. */
  readonly lastStageCeiling: number;
  /** Quantas fases iniciais são respondidas por botões em vez de digitação. */
  readonly stagesWithOptions: number;
}

interface MathStageBase {
  readonly id: string;
  readonly operation: MathOperation;
  readonly tier: MathStageTier;
  /** Apoio visual para quem ainda lê pouco. */
  readonly emoji: string;
  /** Microcopy que diz o que fazer nesta fase. */
  readonly prompt: string;
  /** Ajuda pedida sob demanda; custa uma estrela. */
  readonly hint: string;
  readonly answer: number;
  /** Alternativas da fase; vazio quando a resposta é digitada. */
  readonly options: readonly number[];
}

/** Fase de contar figurinhas na tela, para quem ainda não lê contas. */
export interface MathCountingStage extends MathStageBase {
  readonly kind: 'contagem';
  readonly symbols: readonly string[];
}

/** Fase com uma conta escrita, ex.: `7 + 5`. */
export interface MathExpressionStage extends MathStageBase {
  readonly kind: 'expressao';
  readonly expression: string;
}

export type MathStage = MathCountingStage | MathExpressionStage;

/** Trilha completa gerada para uma faixa etária. */
export interface MathTrail {
  readonly bandId: MathBandId;
  readonly stages: readonly MathStage[];
}

/** Uma parada do mapa de fases, já pronta para ser desenhada. */
export interface MathTrailStep {
  readonly index: number;
  readonly stage: MathStage;
  readonly stars: number;
  readonly isCompleted: boolean;
  readonly isUnlocked: boolean;
  readonly isCurrent: boolean;
}
