import type { ThemeColor } from './profile.model';

/**
 * Modelos do Desafio da Mente.
 *
 * A jornada é uma atividade educativa e gamificada: o "Índice Cognitivo" mede
 * desempenho no jogo e não tem qualquer relação com avaliação clínica.
 */

/** Habilidades acompanhadas ao longo da jornada. */
export type IqSkill = 'logica' | 'numeros' | 'visual' | 'memoria' | 'atencao' | 'linguagem';

/** Níveis de dificuldade, do mais concreto ao mais abstrato. */
export type IqDifficulty = 1 | 2 | 3 | 4 | 5;

export type IqBandId =
  | 'pequeno-explorador'
  | 'explorador'
  | 'aventureiro'
  | 'mestre-desafios'
  | 'super-estrategista';

export type IqIslandId =
  | 'padroes'
  | 'numeros'
  | 'visual'
  | 'memoria'
  | 'atencao'
  | 'palavras'
  | 'castelo'
  | 'bau';

/** Tipos de desafio disponíveis; novos tipos entram sem quebrar os existentes. */
export type IqChallengeType =
  | 'padrao'
  | 'sequencia'
  | 'diferente'
  | 'rotacao'
  | 'memoria'
  | 'atencao'
  | 'linguagem';

/**
 * Peça mostrada na tela.
 *
 * `symbol` é o que aparece; `label` é o que o leitor de tela anuncia, para que
 * o significado nunca dependa só do emoji ou da cor.
 */
export interface IqToken {
  readonly symbol: string;
  readonly label: string;
}

/** Figura geométrica desenhada em CSS a partir de uma grade 3x3. */
export interface IqFigure {
  /** Nove células, na ordem de leitura; `true` significa célula pintada. */
  readonly cells: readonly boolean[];
  readonly tone: ThemeColor;
  readonly label: string;
}

interface IqChallengeBase {
  readonly id: string;
  readonly type: IqChallengeType;
  readonly skill: IqSkill;
  readonly difficulty: IqDifficulty;
  /** Instrução curta, escrita para a criança. */
  readonly prompt: string;
  /** Índice da resposta certa dentro das opções (ou da grade, na atenção). */
  readonly correctIndex: number;
}

/** Padrões, sequências numéricas e linguagem: peças e alternativas em texto. */
export interface IqTokenChallenge extends IqChallengeBase {
  readonly format: 'tokens';
  /** Peças já reveladas; a incógnita é acrescentada pela apresentação. */
  readonly sequence: readonly IqToken[];
  readonly options: readonly IqToken[];
}

/** Raciocínio visual e rotação espacial: alternativas desenhadas em CSS. */
export interface IqFigureChallenge extends IqChallengeBase {
  readonly format: 'figuras';
  /** Figura de referência da rotação; `null` quando não há uma. */
  readonly reference: IqFigure | null;
  readonly options: readonly IqFigure[];
}

/** Memória: a sequência aparece por alguns segundos antes da pergunta. */
export interface IqMemoryChallenge extends IqChallengeBase {
  readonly format: 'memoria';
  readonly sequence: readonly IqToken[];
  readonly exposureMs: number;
  /** Posição perguntada, começando em 1. */
  readonly targetPosition: number;
  readonly options: readonly IqToken[];
}

/** Atenção: encontrar um símbolo dentro de uma grade de distratores. */
export interface IqAttentionChallenge extends IqChallengeBase {
  readonly format: 'atencao';
  readonly target: IqToken;
  readonly grid: readonly IqToken[];
  readonly columns: number;
}

export type IqChallenge =
  | IqTokenChallenge
  | IqFigureChallenge
  | IqMemoryChallenge
  | IqAttentionChallenge;

/** Conjunto de peças de onde os padrões são sorteados. */
export interface IqTokenSet {
  readonly id: string;
  /** Dificuldade a partir da qual o conjunto entra no sorteio. */
  readonly minDifficulty: IqDifficulty;
  readonly tokens: readonly [IqToken, IqToken, ...IqToken[]];
}

/** Alvo e distratores parecidos de um desafio de atenção. */
export interface IqAttentionSet {
  readonly target: IqToken;
  readonly distractors: readonly [IqToken, ...IqToken[]];
}

/** Item do banco de linguagem: classificação para menores, analogia para maiores. */
export interface IqLanguageItem {
  readonly id: string;
  readonly minDifficulty: IqDifficulty;
  readonly maxDifficulty: IqDifficulty;
  readonly prompt: string;
  readonly options: readonly [IqToken, IqToken, ...IqToken[]];
  readonly correctIndex: number;
}

/** Faixa etária: define título, dificuldade inicial e tamanho das ilhas. */
export interface IqAgeBand {
  readonly id: IqBandId;
  readonly title: string;
  readonly emoji: string;
  readonly color: ThemeColor;
  readonly minAge: number;
  readonly maxAge: number;
  readonly description: string;
  readonly startingDifficulty: IqDifficulty;
  /** Desafios curtos por ilha, entre 5 e 8 conforme a faixa. */
  readonly challengesPerIsland: number;
}

/** Etapa do mapa da jornada. */
export interface IqIsland {
  readonly id: IqIslandId;
  readonly name: string;
  readonly emoji: string;
  readonly color: ThemeColor;
  readonly description: string;
  readonly kind: 'desafios' | 'recompensa';
  /** Tipos sorteados nesta ilha; vazio na etapa de recompensa. */
  readonly types: readonly IqChallengeType[];
  /** Habilidade principal da ilha; `null` no castelo e no baú. */
  readonly skill: IqSkill | null;
}

/** Situação de uma etapa no mapa; nunca depende só de cor para ser lida. */
export type IqIslandState = 'concluida' | 'atual' | 'disponivel' | 'bloqueada' | 'recompensa';

export interface IqIslandProgress {
  readonly island: IqIsland;
  readonly index: number;
  readonly state: IqIslandState;
}

/** Estado da adaptação de dificuldade entre um desafio e o próximo. */
export interface IqAdaptiveState {
  readonly difficulty: IqDifficulty;
  readonly correctStreak: number;
  readonly wrongStreak: number;
  /** Verdadeiro no desafio em que a dificuldade acabou de subir. */
  readonly hasLevelledUp: boolean;
}

/** Uma resposta registrada, base de todas as métricas da jornada. */
export interface IqAnswerRecord {
  readonly challengeId: string;
  readonly skill: IqSkill;
  readonly difficulty: IqDifficulty;
  readonly wasCorrect: boolean;
  readonly responseMs: number;
}

/** Desempenho consolidado de uma habilidade. */
export interface IqSkillScore {
  readonly skill: IqSkill;
  readonly answered: number;
  readonly correct: number;
  /** Proporção de acertos, de 0 a 1. */
  readonly accuracy: number;
  /** Estrelas de 1 a 5; nunca zero, para não soar como fracasso. */
  readonly stars: number;
}

/** Retrato completo de uma jornada, usado na comemoração e no relatório. */
export interface IqJourneySummary {
  readonly bandId: IqBandId;
  readonly age: number;
  readonly answered: number;
  readonly correct: number;
  readonly totalXp: number;
  readonly bestStreak: number;
  readonly highestDifficulty: IqDifficulty;
  readonly averageResponseMs: number;
  readonly skills: readonly IqSkillScore[];
  /** Índice educativo de 0 a 100; não é medida clínica de QI. */
  readonly cognitiveIndex: number;
  readonly superPowerSkill: IqSkill;
  readonly growingSkill: IqSkill;
}

/** Jornada concluída, guardada para o histórico dos responsáveis. */
export interface IqJourneyRecord {
  /** Data em ISO (`yyyy-MM-ddTHH:mm:ss.sssZ`). */
  readonly completedAt: string;
  readonly summary: IqJourneySummary;
}

/** Números acumulados entre jornadas, base das conquistas de longo prazo. */
export interface IqLifetimeStats {
  readonly totalXp: number;
  readonly bestStreak: number;
  readonly correctBySkill: Readonly<Record<IqSkill, number>>;
  readonly clearedIslandIds: readonly IqIslandId[];
  readonly perfectMemoryRuns: number;
  readonly attentionRuns: number;
  readonly journeysCompleted: number;
}

export type IqAchievementId =
  | 'mestre-padroes'
  | 'super-memoria'
  | 'olhos-aguia'
  | 'mente-em-chamas'
  | 'grande-explorador'
  | 'mestre-da-mente';

export interface IqAchievement {
  readonly id: IqAchievementId;
  readonly title: string;
  readonly description: string;
  readonly emoji: string;
}

/** Conquista já resolvida para a tela, com o estado desta jornada. */
export interface IqAchievementProgress {
  readonly achievement: IqAchievement;
  readonly isUnlocked: boolean;
  /** Desbloqueada agora, nesta jornada, e ainda não comemorada. */
  readonly isNew: boolean;
}

/** Tudo o que os responsáveis veem, já pronto para a tela. */
export interface IqGuardianReport {
  readonly childName: string;
  readonly age: number;
  readonly evaluatedAt: string;
  readonly summary: IqJourneySummary;
  readonly highlights: readonly IqSkill[];
  readonly toPractice: readonly IqSkill[];
}
