import type { ThemeColor } from './profile.model';

/**
 * Modelos da jornada de jogos.
 *
 * A progressão é por nível e desempenho, não por idade: a idade continua no
 * perfil como referência, mas nunca limita até onde a criança pode chegar.
 */

export type GameId = 'memoria' | 'velha' | 'feijoes' | 'quiz' | 'ingles' | 'matematica' | 'qi';

/**
 * Nome da unidade de desafio de cada jogo.
 *
 * Existe porque "10 perguntas" não descreve o jogo da velha nem a trilha dos
 * feijões. Cada jogo diz na própria ficha o que conta como um desafio.
 */
export type ChallengeUnit = 'desafio' | 'pergunta' | 'conta' | 'rodada' | 'partida';

/** Ficha de um jogo: o que o catálogo sabe sobre ele sem carregá-lo. */
export interface GameDefinition {
  readonly id: GameId;
  readonly label: string;
  readonly emoji: string;
  readonly color: ThemeColor;
  readonly tagline: string;
  readonly unit: ChallengeUnit;
  /** Quantos desafios fecham um nível neste jogo. */
  readonly challengesPerLevel: number;
  /** Falso para jogos em que a vitória depende de um adversário, não de acerto. */
  readonly tracksAccuracy: boolean;
}

/** Progresso persistido de um jogo. */
export interface GameProgress {
  readonly gameId: GameId;
  /** Começa em 1 e só sobe: um nível conquistado nunca é perdido. */
  readonly level: number;
  /** Desafios já vencidos dentro do nível atual. */
  readonly completedInLevel: number;
  /** Acertos do nível atual, base das estrelas quando ele fechar. */
  readonly correctInLevel: number;
  readonly score: number;
  readonly correctAnswers: number;
  readonly wrongAnswers: number;
  readonly totalPlayed: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly perfectLevels: number;
  /** Melhor desempenho já obtido dentro de um nível, para o recorde pessoal. */
  readonly bestLevelScore: number;
  /** Estrelas de cada nível concluído; a posição é `nível - 1`. */
  readonly starsByLevel: readonly number[];
}

export type AchievementId =
  | 'primeiro-nivel'
  | 'em-chamas'
  | 'cem-pontos'
  | 'nivel-perfeito'
  | 'explorador-de-jogos'
  | 'mil-pontos'
  | 'maratonista';

export interface Achievement {
  readonly id: AchievementId;
  readonly title: string;
  readonly description: string;
  readonly emoji: string;
}

/** Estado completo guardado no aparelho. */
export interface PlayerProgress {
  readonly version: number;
  readonly games: Readonly<Record<GameId, GameProgress>>;
  readonly unlockedAchievements: readonly AchievementId[];
}

/** O que aconteceu ao registrar um desafio, já pronto para a tela reagir. */
export interface ChallengeOutcome {
  readonly gameId: GameId;
  readonly wasCorrect: boolean;
  readonly earnedPoints: number;
  /** Parcela dos pontos que veio da sequência de acertos. */
  readonly streakBonus: number;
  readonly streak: number;
  readonly completedInLevel: number;
  readonly challengesPerLevel: number;
  readonly didLevelUp: boolean;
  /** Nível alcançado; igual ao anterior quando o nível não fechou. */
  readonly level: number;
  /** Estrelas do nível recém-concluído; zero quando não houve conclusão. */
  readonly stars: number;
  readonly wasPerfectLevel: boolean;
  readonly unlockedAchievements: readonly Achievement[];
}

/** Retrato do jogador somando todos os jogos. */
export interface PlayerSummary {
  readonly totalScore: number;
  readonly overallLevel: number;
  readonly bestStreak: number;
  readonly challengesCompleted: number;
  readonly achievementsUnlocked: number;
  /** Quanto falta, de 0 a 100, para o próximo nível geral. */
  readonly progressToNextLevel: number;
  readonly pointsToNextLevel: number;
}

/** Sugestão de próximo passo mostrada no painel da página de jogos. */
export interface NextGoal {
  readonly game: GameDefinition;
  readonly remaining: number;
  readonly nextLevel: number;
}
