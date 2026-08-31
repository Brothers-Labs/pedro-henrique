import { ENGLISH_CHALLENGES, ENGLISH_LEVELS } from '../../../core/data/english-quiz.data';
import {
  calculateEarnedXp,
  checkWritingAnswer,
  correctAnswerOf,
  normalizeAnswer,
  speakableTextOf,
  STREAK_BONUS_THRESHOLD,
  STREAK_BONUS_XP,
} from './english-game.logic';

describe('normalizeAnswer', () => {
  it('ignora maiúsculas, acentos, pontuação e espaços repetidos', () => {
    expect(normalizeAnswer('  I  Like   Ice-Cream! ')).toBe('i like ice cream');
    expect(normalizeAnswer('Café')).toBe('cafe');
  });

  it('trata as duas formas de apóstrofo como a mesma palavra', () => {
    expect(normalizeAnswer('doesn’t')).toBe(normalizeAnswer("doesn't"));
    expect(normalizeAnswer("doesn't")).toBe('doesnt');
  });
});

describe('checkWritingAnswer', () => {
  it('aceita a resposta certa em qualquer grafia', () => {
    expect(checkWritingAnswer('  CAT ', ['Cat'])).toBe('certa');
    expect(checkWritingAnswer('thanks', ['Thank you', 'Thanks'])).toBe('certa');
  });

  it('reconhece qualquer uma das respostas aceitas', () => {
    const accepted = ['I played soccer yesterday', 'I played football yesterday'];

    expect(checkWritingAnswer('i played football yesterday', accepted)).toBe('certa');
  });

  it('avisa "quase" quando falta apenas uma letrinha em palavras longas', () => {
    expect(checkWritingAnswer('teacer', ['Teacher'])).toBe('quase');
  });

  it('não perdoa erro em palavras curtas, que viraria outra palavra', () => {
    expect(checkWritingAnswer('bat', ['Cat'])).toBe('errada');
  });

  it('trata texto vazio como resposta errada', () => {
    expect(checkWritingAnswer('   ', ['Cat'])).toBe('errada');
  });

  it('recusa uma resposta completamente diferente', () => {
    expect(checkWritingAnswer('dog', ['Cat'])).toBe('errada');
  });
});

describe('calculateEarnedXp', () => {
  const baseInput = { baseXp: 20, usedHint: false, missCount: 0, streak: 1 };

  it('dá o XP cheio quando acerta de primeira e sem dica', () => {
    expect(calculateEarnedXp(baseInput)).toBe(20);
  });

  it('corta o XP pela metade quando a criança pede dica', () => {
    expect(calculateEarnedXp({ ...baseInput, usedHint: true })).toBe(10);
  });

  it('corta o XP pela metade quando houve erro antes do acerto', () => {
    expect(calculateEarnedXp({ ...baseInput, missCount: 1 })).toBe(10);
  });

  it('arredonda o XP reduzido para cima, para nunca sobrar meio ponto', () => {
    expect(calculateEarnedXp({ ...baseInput, baseXp: 5, usedHint: true })).toBe(3);
  });

  it('soma o bônus ao atingir a sequência mínima de acertos', () => {
    expect(calculateEarnedXp({ ...baseInput, streak: STREAK_BONUS_THRESHOLD })).toBe(
      20 + STREAK_BONUS_XP,
    );
  });
});

describe('conteúdo do jogo de inglês', () => {
  it('tem 30 fases distribuídas igualmente entre os três níveis', () => {
    expect(ENGLISH_CHALLENGES.length).toBe(30);

    for (const level of ENGLISH_LEVELS) {
      const challenges = ENGLISH_CHALLENGES.filter((challenge) => challenge.level === level.id);
      expect(challenges.length).toBe(10);
    }
  });

  it('não repete identificadores de fase', () => {
    const ids = new Set(ENGLISH_CHALLENGES.map((challenge) => challenge.id));

    expect(ids.size).toBe(ENGLISH_CHALLENGES.length);
  });

  it('mistura fases de marcar a opção certa com fases de escrever', () => {
    const kinds = new Set(ENGLISH_CHALLENGES.map((challenge) => challenge.kind));

    expect(kinds).toEqual(new Set(['escolha', 'escrita']));
  });

  it('sempre consegue apontar a resposta certa e um texto para pronunciar', () => {
    for (const challenge of ENGLISH_CHALLENGES) {
      expect(correctAnswerOf(challenge).length).toBeGreaterThan(0);
      expect(speakableTextOf(challenge).length).toBeGreaterThan(0);
    }
  });

  it('mantém o índice da alternativa correta dentro da lista de opções', () => {
    for (const challenge of ENGLISH_CHALLENGES) {
      if (challenge.kind === 'escolha') {
        expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
        expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
      }
    }
  });

  it('aceita a própria resposta canônica em todas as fases de escrita', () => {
    for (const challenge of ENGLISH_CHALLENGES) {
      if (challenge.kind === 'escrita') {
        for (const answer of challenge.acceptedAnswers) {
          expect(checkWritingAnswer(answer, challenge.acceptedAnswers)).toBe('certa');
        }
      }
    }
  });
});
