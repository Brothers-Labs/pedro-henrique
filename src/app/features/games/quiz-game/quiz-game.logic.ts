import { QUIZ_QUESTIONS } from '../../../core/data/quiz.data';
import { quizTierFor } from '../../../core/games/difficulty';
import type { QuizQuestion } from '../../../core/models/quiz.model';

/**
 * Escolha das perguntas do quiz.
 *
 * O nível define a faixa de dificuldade; o banco é filtrado por ela e só
 * depois sorteado. Fica fora do componente para poder ser testado sozinho.
 */

/** Perguntas mínimas em uma faixa para ela ser usada sem ajuda das vizinhas. */
const MINIMUM_POOL = 6;

/**
 * Perguntas disponíveis para o nível.
 *
 * Se a faixa exata tiver poucas perguntas, as faixas vizinhas entram junto —
 * melhor uma pergunta um pouco mais fácil do que a mesma pergunta duas vezes
 * no mesmo nível.
 */
export function questionsForLevel(level: number): readonly QuizQuestion[] {
  const tier = quizTierFor(level);
  const exact = QUIZ_QUESTIONS.filter((question) => question.difficulty === tier);

  if (exact.length >= MINIMUM_POOL) {
    return exact;
  }

  return QUIZ_QUESTIONS.filter((question) => Math.abs(question.difficulty - tier) <= 1);
}

/**
 * Sorteia a próxima pergunta evitando o que já apareceu no nível.
 *
 * Quando o banco da faixa se esgota antes do fim do nível, o filtro é
 * liberado: repetir é melhor do que ficar sem pergunta.
 */
export function drawQuestion(
  level: number,
  alreadyAsked: ReadonlySet<string>,
  random: () => number = Math.random,
): QuizQuestion {
  const pool = questionsForLevel(level);
  const fresh = pool.filter((question) => !alreadyAsked.has(question.id));
  const source = fresh.length > 0 ? fresh : pool;

  return source[Math.min(source.length - 1, Math.floor(random() * source.length))];
}
