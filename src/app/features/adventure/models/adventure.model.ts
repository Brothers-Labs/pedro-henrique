import type { GameId } from '../../../core/models/game-progress.model';
import type { MathOperation } from '../../../core/models/math-game.model';
import type { PetAccessoryId } from '../../../core/models/pet.model';
import type { ThemeColor } from '../../../core/models/profile.model';

/**
 * Modelos do Mapa da Aventura.
 *
 * Mundos e fases são dados: nenhuma regra pergunta "é o mundo 1?" ou "é a fase
 * 10?". Um mundo novo, uma fase a mais ou um guardião diferente entram pela
 * configuração, sem tocar na engine nem nas telas.
 */

/* Catálogo ------------------------------------------------------------------ */

/** Conta da Vila: as quatro operações do jogo livre e as sequências numéricas. */
export type AdventureMathOperation = MathOperation | 'sequencia';

/** Um tipo de pergunta dentro de uma fase de matemática. */
export interface MathRound {
  readonly operation: AdventureMathOperation;
  /** Maior número envolvido na conta. */
  readonly ceiling: number;
  /** Embrulha a conta numa historinha. Não vale para sequências. */
  readonly asWordProblem?: boolean;
}

/**
 * O que a criança faz numa fase.
 *
 * É união discriminada pelo `type` para que cada mundo novo traga o seu tipo
 * de atividade (memória, inglês, ciência) sem mexer nos que já existem.
 */
export type LevelActivity = {
  readonly type: 'math';
  readonly questionCount: number;
  /** Percorridas em ciclo: a pergunta `n` usa o tipo `n % rounds.length`. */
  readonly rounds: readonly [MathRound, ...MathRound[]];
};

/** Personagem do grande desafio do mundo. Desafia, não luta. */
export interface AdventureGuardian {
  readonly name: string;
  readonly emoji: string;
  readonly greeting: string;
}

/** Baú aberto na primeira vez que a fase é concluída. */
export interface AdventureChest {
  readonly curiosityId: string | null;
  readonly bonusPoints: number;
  readonly bonusPetXp: number;
}

export interface AdventureLevel {
  readonly id: string;
  readonly icon: string;
  /** Habilidade treinada, curta o bastante para caber embaixo do ponto do mapa. */
  readonly skill: string;
  readonly title: string;
  readonly story: string;
  readonly objective: string;
  readonly completionMessage: string;
  readonly activity: LevelActivity;
  /** Presente só na fase do grande desafio do mundo. */
  readonly guardian?: AdventureGuardian;
  readonly isCheckpoint?: boolean;
  readonly chest?: AdventureChest;
}

export type WorldUnlockCondition =
  | { readonly kind: 'start' }
  | { readonly kind: 'world-completed'; readonly worldId: string };

/** Cores e enfeites do cenário. As cores entram como variáveis de CSS. */
export interface WorldScenery {
  readonly sky: string;
  readonly ground: string;
  readonly trail: string;
  readonly hasRiver: boolean;
  /** Emojis espalhados pelo mapa, sempre decorativos. */
  readonly decorations: readonly [string, ...string[]];
}

export interface WorldMedal {
  readonly label: string;
  readonly emoji: string;
}

export interface AdventureWorld {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly tagline: string;
  readonly color: ThemeColor;
  /** Jogo do sistema de progresso que recebe as respostas e os pontos do mundo. */
  readonly skillGameId: GameId;
  readonly unlock: WorldUnlockCondition;
  readonly scenery: WorldScenery;
  /** Vazio enquanto o mundo não foi construído: ele aparece como "em breve". */
  readonly levels: readonly AdventureLevel[];
  readonly medal: WorldMedal;
  readonly rewardAccessoryId?: PetAccessoryId;
  readonly completionMessage: string;
}

export interface AdventureCuriosity {
  readonly id: string;
  readonly emoji: string;
  readonly title: string;
  /** Texto com `{nome}` no lugar do nome do mascote. */
  readonly text: string;
}

/* Progresso guardado -------------------------------------------------------- */

export interface LevelRecord {
  readonly attempts: number;
  /** Maior número de acertos numa partida. Nunca diminui. */
  readonly bestScore: number;
  /** De 0 a 3. Nunca diminui. */
  readonly bestStars: number;
  /** Data ISO da primeira conclusão. */
  readonly completedAt: string;
}

export interface CuriosityRecord {
  readonly id: string;
  readonly unlockedAt: string;
}

/**
 * O que fica no aparelho.
 *
 * Só fatos: mundo desbloqueado, fase atual e medalhas não são campos, porque
 * vêm sempre das fases concluídas — assim um save nunca se contradiz.
 * `claimedRewards` guarda o id de cada prêmio já pago, e é o que impede um
 * prêmio de cair duas vezes, mesmo depois de recarregar a página.
 */
export interface AdventureProgress {
  readonly version: number;
  readonly levels: Readonly<Record<string, LevelRecord>>;
  readonly claimedRewards: readonly string[];
  readonly curiosities: readonly CuriosityRecord[];
}

/* Leitura para as telas ----------------------------------------------------- */

/**
 * Situação de uma fase.
 *
 * `current` é onde o mascote está; `available` é uma fase liberada fora do
 * mundo atual. `perfect` é concluída com as três estrelas.
 */
export type LevelStatus = 'locked' | 'available' | 'current' | 'completed' | 'perfect';

export type WorldStatus = 'locked' | 'coming-soon' | 'in-progress' | 'completed';

export interface LevelView {
  readonly level: AdventureLevel;
  /** Posição na trilha, começando em 1. */
  readonly order: number;
  readonly status: LevelStatus;
  readonly record: LevelRecord | null;
}

export interface WorldView {
  readonly world: AdventureWorld;
  readonly status: WorldStatus;
  readonly levels: readonly LevelView[];
  readonly completedLevels: number;
  readonly stars: number;
  readonly maxStars: number;
  /** Fase em que o mascote está: a primeira não concluída, ou a última do mundo. */
  readonly companionLevel: LevelView | null;
}

/* Resultado de uma partida -------------------------------------------------- */

export interface LevelRunResult {
  readonly correct: number;
  readonly total: number;
}

/**
 * Tudo o que mudou ao concluir uma fase, já pronto para a tela de conclusão.
 *
 * Pontos e XP aqui são só os bônus da Aventura; cada resposta já rendeu os
 * seus pelo sistema de progresso dos jogos.
 */
export interface LevelCompletion {
  readonly progress: AdventureProgress;
  readonly stars: number;
  readonly previousBestStars: number;
  readonly isFirstCompletion: boolean;
  readonly bonusPoints: number;
  readonly bonusPetXp: number;
  readonly reachedCheckpoint: boolean;
  readonly openedChest: AdventureChest | null;
  readonly unlockedCuriosity: AdventureCuriosity | null;
  /** Mundo terminado agora, com medalha e prêmio. */
  readonly completedWorld: AdventureWorld | null;
  /** Mundo que acabou de abrir no mapa (pode estar "em breve"). */
  readonly unlockedWorld: AdventureWorld | null;
}
