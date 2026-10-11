import { ADVENTURE_WORLDS } from '../config/adventure-worlds.config';
import type { AdventureLevel, MathRound } from '../models/adventure.model';
import { buildLevelQuestions } from './question-factory';

/** Gerador previsível: percorre uma sequência fixa de valores entre 0 e 1. */
function seeded(seed = 1): () => number {
  let state = seed;

  return () => {
    state = (state * 16807) % 2147483647;

    return (state - 1) / 2147483646;
  };
}

function levelWith(rounds: readonly [MathRound, ...MathRound[]], questionCount = 10): AdventureLevel {
  return {
    id: 'teste',
    icon: '➕',
    skill: 'Teste',
    title: 'Teste',
    story: 'História',
    objective: 'Objetivo',
    completionMessage: 'Fim',
    activity: { type: 'math', questionCount, rounds },
  };
}

describe('buildLevelQuestions', () => {
  it('monta exatamente o número de perguntas da fase', () => {
    expect(buildLevelQuestions(levelWith([{ operation: 'soma', ceiling: 10 }], 7), seeded()).length).toBe(7);
  });

  it('sempre traz a resposta certa entre quatro alternativas diferentes', () => {
    for (const world of ADVENTURE_WORLDS) {
      for (const level of world.levels) {
        for (const question of buildLevelQuestions(level, seeded(level.id.length + 3))) {
          expect(question.options.length).withContext(question.id).toBe(4);
          expect(new Set(question.options).size).withContext(question.id).toBe(4);
          expect(question.options).withContext(question.id).toContain(question.answer);
        }
      }
    }
  });

  it('percorre os tipos de pergunta em ciclo', () => {
    const questions = buildLevelQuestions(
      levelWith([
        { operation: 'soma', ceiling: 20 },
        { operation: 'sequencia', ceiling: 20 },
      ]),
      seeded(),
    );

    expect(questions.map((question) => question.kind).slice(0, 4)).toEqual(['conta', 'sequencia', 'conta', 'sequencia']);
  });

  it('monta sequências que crescem sempre do mesmo tanto, sem passar do teto', () => {
    for (const question of buildLevelQuestions(levelWith([{ operation: 'sequencia', ceiling: 20 }], 30), seeded(7))) {
      const terms = question.statement.replace(', ?', '').split(', ').map(Number);
      const step = terms[1] - terms[0];

      expect(step).withContext(question.statement).toBeGreaterThan(0);
      expect(terms.every((term, index) => index === 0 || term - terms[index - 1] === step)).toBeTrue();
      expect(Number(question.answer)).toBe(terms[terms.length - 1] + step);
      expect(Number(question.answer)).toBeLessThanOrEqual(20);
    }
  });

  it('embrulha a conta numa história com o nome da criança quando a fase pede', () => {
    const [question] = buildLevelQuestions(
      levelWith([{ operation: 'soma', ceiling: 20, asWordProblem: true }], 1),
      seeded(),
      'Pedro Henrique',
    );

    expect(question.kind).toBe('problema');
    expect(question.statement).toContain('Pedro Henrique');
  });

  it('evita repetir a mesma conta na mesma fase quando há contas de sobra', () => {
    const questions = buildLevelQuestions(levelWith([{ operation: 'multiplicacao', ceiling: 36 }]), seeded(11));
    const statements = new Set(questions.map((question) => question.statement));

    expect(statements.size).toBeGreaterThanOrEqual(questions.length - 1);
  });

  it('dá ids previsíveis, um por posição', () => {
    const questions = buildLevelQuestions(levelWith([{ operation: 'subtracao', ceiling: 10 }], 3), seeded());

    expect(questions.map((question) => question.id)).toEqual(['teste-1', 'teste-2', 'teste-3']);
  });
});
