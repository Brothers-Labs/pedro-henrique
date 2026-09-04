import {
  IQ_AGE_BANDS,
  IQ_DEFAULT_AGE,
  IQ_EMPTY_LIFETIME_STATS,
  IQ_ISLANDS,
  IQ_MAX_AGE,
  IQ_MIN_AGE,
} from '../../../core/data/iq-game.data';
import type {
  IqAchievementId,
  IqAdaptiveState,
  IqAgeBand,
  IqAnswerRecord,
  IqDifficulty,
  IqGuardianReport,
  IqIslandId,
  IqIslandProgress,
  IqJourneySummary,
  IqLifetimeStats,
  IqSkill,
  IqSkillScore,
} from '../../../core/models/iq-game.model';

/**
 * Motor do Desafio da Mente: progressão, adaptação de dificuldade e pontuação.
 *
 * Tudo aqui é função pura sobre dados imutáveis, sem Angular e sem tela. O
 * "Índice Cognitivo" que sai daqui é uma medida de desempenho no jogo, criada
 * para acompanhar evolução — nunca uma avaliação clínica.
 */

export const MIN_DIFFICULTY: IqDifficulty = 1;
export const MAX_DIFFICULTY: IqDifficulty = 5;

/** Acertos ou erros seguidos que movem a dificuldade um degrau. */
export const STREAK_TO_ADAPT = 2;

export const XP_PER_DIFFICULTY = 10;
/** XP de participação: tentar também conta, para o erro nunca zerar o esforço. */
export const XP_FOR_TRYING = 2;
export const XP_STREAK_BONUS = 5;
export const XP_STREAK_THRESHOLD = 3;

/** Metas das conquistas de longo prazo. */
export const LOGIC_MASTERY_TARGET = 10;
export const FIRE_STREAK_TARGET = 5;

export const MAX_SKILL_STARS = 5;

/** Ordem estável das habilidades na tela e nos desempates. */
export const IQ_SKILLS: readonly IqSkill[] = [
  'logica',
  'numeros',
  'visual',
  'memoria',
  'atencao',
  'linguagem',
];

/** Etapas do mapa que valem desafios; a última é o baú de recompensa. */
export const CHALLENGE_ISLANDS = IQ_ISLANDS.filter((island) => island.kind === 'desafios');

/* Idade e faixa etária ------------------------------------------------------ */

/** Diz se a idade digitada pode virar uma jornada. */
export function isPlayableAge(age: number): boolean {
  return Number.isInteger(age) && age >= IQ_MIN_AGE && age <= IQ_MAX_AGE;
}

/** Traz a idade para dentro do intervalo aceito, sem nunca falhar. */
export function clampAge(age: number): number {
  if (!Number.isFinite(age)) {
    return IQ_DEFAULT_AGE;
  }

  return Math.min(IQ_MAX_AGE, Math.max(IQ_MIN_AGE, Math.trunc(age)));
}

/** Faixa etária da idade informada; idades fora do intervalo são aproximadas. */
export function resolveAgeBand(age: number): IqAgeBand {
  const playableAge = clampAge(age);
  const band = IQ_AGE_BANDS.find(
    (candidate) => playableAge >= candidate.minAge && playableAge <= candidate.maxAge,
  );

  return band ?? IQ_AGE_BANDS[IQ_AGE_BANDS.length - 1];
}

/** Estado inicial da adaptação para uma faixa etária. */
export function initialAdaptiveState(band: IqAgeBand): IqAdaptiveState {
  return {
    difficulty: band.startingDifficulty,
    correctStreak: 0,
    wrongStreak: 0,
    hasLevelledUp: false,
  };
}

/* Dificuldade adaptativa ----------------------------------------------------- */

/**
 * Move a dificuldade conforme o desempenho recente.
 *
 * Dois acertos seguidos sobem um degrau; dois erros seguidos descem um. A queda
 * é silenciosa de propósito: a criança nunca é avisada de que o jogo ficou mais
 * fácil, só de que ficou mais difícil.
 */
export function nextAdaptiveState(state: IqAdaptiveState, wasCorrect: boolean): IqAdaptiveState {
  if (wasCorrect) {
    const correctStreak = state.correctStreak + 1;
    const reachedThreshold = correctStreak >= STREAK_TO_ADAPT;
    const hasLevelledUp = reachedThreshold && state.difficulty < MAX_DIFFICULTY;

    return {
      difficulty: hasLevelledUp ? stepDifficulty(state.difficulty, 1) : state.difficulty,
      correctStreak: reachedThreshold ? 0 : correctStreak,
      wrongStreak: 0,
      hasLevelledUp,
    };
  }

  const wrongStreak = state.wrongStreak + 1;
  const reachedThreshold = wrongStreak >= STREAK_TO_ADAPT;
  const shouldLevelDown = reachedThreshold && state.difficulty > MIN_DIFFICULTY;

  return {
    difficulty: shouldLevelDown ? stepDifficulty(state.difficulty, -1) : state.difficulty,
    correctStreak: 0,
    wrongStreak: reachedThreshold ? 0 : wrongStreak,
    hasLevelledUp: false,
  };
}

function stepDifficulty(difficulty: IqDifficulty, delta: number): IqDifficulty {
  const next = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, difficulty + delta));

  return next as IqDifficulty;
}

/* Pontuação ------------------------------------------------------------------ */

/** XP de uma resposta: vale mais quanto mais difícil, com bônus de sequência. */
export function xpForAnswer(
  difficulty: IqDifficulty,
  wasCorrect: boolean,
  streakAfterAnswer: number,
): number {
  if (!wasCorrect) {
    return XP_FOR_TRYING;
  }

  const bonus = streakAfterAnswer >= XP_STREAK_THRESHOLD ? XP_STREAK_BONUS : 0;

  return XP_PER_DIFFICULTY * difficulty + bonus;
}

/* Mapa da jornada ------------------------------------------------------------ */

/**
 * Situação de cada etapa do mapa.
 *
 * A jornada é sequencial: uma ilha só abre quando a anterior termina, e o baú
 * só aparece aberto depois que todas as ilhas de desafio foram concluídas.
 */
export function buildIslandProgress(
  clearedCount: number,
  isPlaying: boolean,
): readonly IqIslandProgress[] {
  return IQ_ISLANDS.map((island, index): IqIslandProgress => {
    if (island.kind === 'recompensa') {
      const isUnlocked = clearedCount >= CHALLENGE_ISLANDS.length;

      return { island, index, state: isUnlocked ? 'recompensa' : 'bloqueada' };
    }

    if (index < clearedCount) {
      return { island, index, state: 'concluida' };
    }
    if (index === clearedCount) {
      return { island, index, state: isPlaying ? 'atual' : 'disponivel' };
    }

    return { island, index, state: 'bloqueada' };
  });
}

/* Desempenho por habilidade --------------------------------------------------- */

/** Estrelas de uma habilidade: 0 quando ainda não foi praticada, senão de 1 a 5. */
export function starsForAccuracy(accuracy: number, answered: number): number {
  if (answered === 0) {
    return 0;
  }

  return Math.max(1, Math.round(accuracy * MAX_SKILL_STARS));
}

/** Desempenho de todas as habilidades, inclusive as ainda não praticadas. */
export function buildSkillScores(answers: readonly IqAnswerRecord[]): readonly IqSkillScore[] {
  return IQ_SKILLS.map((skill) => {
    const ofSkill = answers.filter((answer) => answer.skill === skill);
    const correct = ofSkill.filter((answer) => answer.wasCorrect).length;
    const accuracy = ofSkill.length === 0 ? 0 : correct / ofSkill.length;

    return {
      skill,
      answered: ofSkill.length,
      correct,
      accuracy,
      stars: starsForAccuracy(accuracy, ofSkill.length),
    };
  });
}

/** Acertos por habilidade, no formato guardado no histórico. */
export function countCorrectBySkill(
  answers: readonly IqAnswerRecord[],
): Readonly<Record<IqSkill, number>> {
  const correct = answers.filter((answer) => answer.wasCorrect);
  const countOf = (skill: IqSkill): number =>
    correct.filter((answer) => answer.skill === skill).length;

  return {
    logica: countOf('logica'),
    numeros: countOf('numeros'),
    visual: countOf('visual'),
    memoria: countOf('memoria'),
    atencao: countOf('atencao'),
    linguagem: countOf('linguagem'),
  };
}

/* Índice Cognitivo ------------------------------------------------------------ */

const ACCURACY_WEIGHT = 0.6;
const DIFFICULTY_WEIGHT = 0.25;
const PACE_WEIGHT = 0.15;

/** Faixa de tempo considerada; fora dela o ritmo satura, sem virar corrida. */
const FAST_RESPONSE_MS = 3000;
const SLOW_RESPONSE_MS = 20000;

/**
 * Índice Cognitivo de 0 a 100.
 *
 * Combina acerto, dificuldade alcançada e ritmo, nessa ordem de peso. É uma
 * métrica do jogo, para acompanhar evolução entre uma jornada e outra.
 */
export function calculateCognitiveIndex(answers: readonly IqAnswerRecord[]): number {
  if (answers.length === 0) {
    return 0;
  }

  const correct = answers.filter((answer) => answer.wasCorrect).length;
  const accuracyScore = correct / answers.length;

  const averageDifficulty = average(answers.map((answer) => answer.difficulty));
  const difficultyScore = (averageDifficulty - MIN_DIFFICULTY) / (MAX_DIFFICULTY - MIN_DIFFICULTY);

  const averageResponseMs = average(answers.map((answer) => answer.responseMs));
  const paceScore = clampRatio(
    1 - (averageResponseMs - FAST_RESPONSE_MS) / (SLOW_RESPONSE_MS - FAST_RESPONSE_MS),
  );

  const score =
    ACCURACY_WEIGHT * accuracyScore +
    DIFFICULTY_WEIGHT * clampRatio(difficultyScore) +
    PACE_WEIGHT * paceScore;

  return Math.round(clampRatio(score) * 100);
}

/* Resumo da jornada ------------------------------------------------------------ */

export interface JourneySummaryInput {
  readonly band: IqAgeBand;
  readonly age: number;
  readonly answers: readonly IqAnswerRecord[];
  readonly totalXp: number;
  readonly bestStreak: number;
}

/** Consolida a jornada para a comemoração da criança e para o relatório. */
export function summarizeJourney({
  band,
  age,
  answers,
  totalXp,
  bestStreak,
}: JourneySummaryInput): IqJourneySummary {
  const skills = buildSkillScores(answers);
  const ranked = rankPracticedSkills(skills);

  return {
    bandId: band.id,
    age,
    answered: answers.length,
    correct: answers.filter((answer) => answer.wasCorrect).length,
    totalXp,
    bestStreak,
    highestDifficulty: highestDifficultyOf(answers, band),
    averageResponseMs:
      answers.length === 0 ? 0 : Math.round(average(answers.map((a) => a.responseMs))),
    skills,
    cognitiveIndex: calculateCognitiveIndex(answers),
    superPowerSkill: ranked[0]?.skill ?? IQ_SKILLS[0],
    growingSkill: ranked[ranked.length - 1]?.skill ?? IQ_SKILLS[0],
  };
}

/** Habilidades praticadas, da de melhor para a de pior desempenho. */
function rankPracticedSkills(skills: readonly IqSkillScore[]): readonly IqSkillScore[] {
  return [...skills]
    .filter((score) => score.answered > 0)
    .sort((first, second) => {
      if (first.accuracy !== second.accuracy) {
        return second.accuracy - first.accuracy;
      }
      if (first.correct !== second.correct) {
        return second.correct - first.correct;
      }

      return IQ_SKILLS.indexOf(first.skill) - IQ_SKILLS.indexOf(second.skill);
    });
}

function highestDifficultyOf(
  answers: readonly IqAnswerRecord[],
  band: IqAgeBand,
): IqDifficulty {
  return answers.reduce<IqDifficulty>(
    (highest, answer) => (answer.difficulty > highest ? answer.difficulty : highest),
    band.startingDifficulty,
  );
}

/* Conquistas -------------------------------------------------------------------- */

/** Conquistas já desbloqueadas para os números acumulados informados. */
export function unlockedAchievementIds(stats: IqLifetimeStats): ReadonlySet<IqAchievementId> {
  const unlocked = new Set<IqAchievementId>();

  if (stats.correctBySkill.logica >= LOGIC_MASTERY_TARGET) {
    unlocked.add('mestre-padroes');
  }
  if (stats.perfectMemoryRuns > 0) {
    unlocked.add('super-memoria');
  }
  if (stats.attentionRuns > 0) {
    unlocked.add('olhos-aguia');
  }
  if (stats.bestStreak >= FIRE_STREAK_TARGET) {
    unlocked.add('mente-em-chamas');
  }
  if (hasClearedEveryIsland(stats.clearedIslandIds)) {
    unlocked.add('grande-explorador');
  }
  if (stats.journeysCompleted > 0) {
    unlocked.add('mestre-da-mente');
  }

  return unlocked;
}

function hasClearedEveryIsland(clearedIslandIds: readonly IqIslandId[]): boolean {
  return CHALLENGE_ISLANDS.every((island) => clearedIslandIds.includes(island.id));
}

/** Soma o que a jornada atual acrescentou ao histórico já guardado. */
export function mergeLifetimeStats(
  base: IqLifetimeStats,
  journey: IqLifetimeStats,
): IqLifetimeStats {
  const correctBySkill: Record<IqSkill, number> = {
    logica: base.correctBySkill.logica + journey.correctBySkill.logica,
    numeros: base.correctBySkill.numeros + journey.correctBySkill.numeros,
    visual: base.correctBySkill.visual + journey.correctBySkill.visual,
    memoria: base.correctBySkill.memoria + journey.correctBySkill.memoria,
    atencao: base.correctBySkill.atencao + journey.correctBySkill.atencao,
    linguagem: base.correctBySkill.linguagem + journey.correctBySkill.linguagem,
  };

  return {
    totalXp: base.totalXp + journey.totalXp,
    bestStreak: Math.max(base.bestStreak, journey.bestStreak),
    correctBySkill,
    clearedIslandIds: [...new Set([...base.clearedIslandIds, ...journey.clearedIslandIds])],
    perfectMemoryRuns: base.perfectMemoryRuns + journey.perfectMemoryRuns,
    attentionRuns: base.attentionRuns + journey.attentionRuns,
    journeysCompleted: base.journeysCompleted + journey.journeysCompleted,
  };
}

/* Relatório dos responsáveis ------------------------------------------------------ */

const HIGHLIGHT_ACCURACY = 0.7;
const PRACTICE_ACCURACY = 0.5;

export interface GuardianReportInput {
  readonly childName: string;
  readonly age: number;
  readonly evaluatedAt: string;
  readonly summary: IqJourneySummary;
}

/**
 * Monta a leitura para os responsáveis.
 *
 * Destaques e pontos a praticar saem de faixas fixas de acerto: o objetivo é
 * mostrar onde a criança está mais à vontade e onde vale treinar mais, sem
 * qualquer linguagem de diagnóstico ou comparação.
 */
export function buildGuardianReport({
  childName,
  age,
  evaluatedAt,
  summary,
}: GuardianReportInput): IqGuardianReport {
  const practiced = summary.skills.filter((score) => score.answered > 0);

  return {
    childName,
    age,
    evaluatedAt,
    summary,
    highlights: practiced
      .filter((score) => score.accuracy >= HIGHLIGHT_ACCURACY)
      .map((score) => score.skill),
    toPractice: practiced
      .filter((score) => score.accuracy < PRACTICE_ACCURACY)
      .map((score) => score.skill),
  };
}

/* Auxiliares ---------------------------------------------------------------------- */

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}
