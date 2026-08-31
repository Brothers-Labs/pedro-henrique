import type { ThemeColor } from './profile.model';

/** Trilhas de dificuldade do jogo de inglês, da mais simples à mais avançada. */
export type EnglishLevelId = 'facil' | 'medio' | 'dificil';

/** Formato da fase: marcar a opção certa ou digitar a resposta. */
export type EnglishChallengeKind = 'escolha' | 'escrita';

interface EnglishChallengeBase {
  readonly id: string;
  readonly level: EnglishLevelId;
  /** Enunciado em português: a criança precisa entender o que fazer. */
  readonly prompt: string;
  /** Apoio visual para quem ainda lê pouco. */
  readonly emoji: string;
  /** Dica pedida sob demanda; reduz o XP da fase pela metade. */
  readonly hint: string;
  /** Explicação em português mostrada depois que a fase é concluída. */
  readonly explanation: string;
  /**
   * Texto lido em voz alta pelo botão de áudio. Só é preciso informar quando a
   * resposta correta não é o inglês — por exemplo, ao traduzir para português.
   */
  readonly spokenText?: string;
}

export interface EnglishChoiceChallenge extends EnglishChallengeBase {
  readonly kind: 'escolha';
  readonly options: readonly string[];
  readonly correctIndex: number;
}

export interface EnglishWritingChallenge extends EnglishChallengeBase {
  readonly kind: 'escrita';
  /** A primeira entrada é a resposta canônica exibida no feedback. */
  readonly acceptedAnswers: readonly [string, ...string[]];
  readonly placeholder: string;
}

export type EnglishChallenge = EnglishChoiceChallenge | EnglishWritingChallenge;

/** Descrição de um nível, usada nos cartões de escolha de dificuldade. */
export interface EnglishLevel {
  readonly id: EnglishLevelId;
  readonly label: string;
  readonly emoji: string;
  readonly ageRange: string;
  readonly description: string;
  /** XP concedido ao concluir uma fase deste nível sem erro e sem dica. */
  readonly xpPerChallenge: number;
  readonly color: ThemeColor;
}

/** Patente exibida no painel de XP; sobe sozinha conforme o total acumulado. */
export interface EnglishRank {
  readonly title: string;
  readonly emoji: string;
  readonly requiredXp: number;
}

/** Progresso persistido no dispositivo de quem joga. */
export interface EnglishProgress {
  readonly totalXp: number;
  readonly bestStreak: number;
  /** Fases já concluídas com acerto, em qualquer nível. */
  readonly masteredIds: readonly string[];
}
