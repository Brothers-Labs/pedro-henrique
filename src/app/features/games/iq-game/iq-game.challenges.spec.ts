import { IQ_AGE_BANDS, IQ_ISLANDS } from '../../../core/data/iq-game.data';
import type { IqChallenge, IqChallengeType, IqDifficulty } from '../../../core/models/iq-game.model';
import {
  createChallenge,
  type IqRandom,
  mirrorCells,
  rotateCells,
  rotationKey,
  SKILL_BY_TYPE,
} from './iq-game.challenges';

/** Gerador previsível: repete a sequência informada, sem depender de sorte. */
function fakeRandom(values: readonly number[]): IqRandom {
  let index = 0;

  return () => {
    const value = values[index % values.length];
    index += 1;

    return value;
  };
}

const ALL_TYPES: readonly IqChallengeType[] = [
  'padrao',
  'sequencia',
  'diferente',
  'rotacao',
  'memoria',
  'atencao',
  'linguagem',
];

const ALL_DIFFICULTIES: readonly IqDifficulty[] = [1, 2, 3, 4, 5];

/** Gera o mesmo desafio com vários sorteios, para cobrir os caminhos internos. */
function samplesOf(type: IqChallengeType, difficulty: IqDifficulty): readonly IqChallenge[] {
  return [
    [0, 0.5, 0.99],
    [0.9, 0.1, 0.4, 0.7],
    [0.25, 0.75],
    [0.99, 0.01],
  ].map((values, index) => createChallenge(type, difficulty, index, fakeRandom(values)));
}

describe('createChallenge', () => {
  it('monta todos os tipos em todas as dificuldades', () => {
    for (const type of ALL_TYPES) {
      for (const difficulty of ALL_DIFFICULTIES) {
        for (const challenge of samplesOf(type, difficulty)) {
          expect(challenge.type).toBe(type);
          expect(challenge.difficulty).toBe(difficulty);
          expect(challenge.prompt.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('liga cada tipo à habilidade que ele avalia', () => {
    for (const type of ALL_TYPES) {
      const challenge = createChallenge(type, 3, 0, fakeRandom([0.4]));

      expect(challenge.skill).toBe(SKILL_BY_TYPE[type]);
    }
  });

  it('sempre aponta uma resposta certa dentro das alternativas', () => {
    for (const type of ALL_TYPES) {
      for (const difficulty of ALL_DIFFICULTIES) {
        for (const challenge of samplesOf(type, difficulty)) {
          const total =
            challenge.format === 'atencao' ? challenge.grid.length : challenge.options.length;

          expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
          expect(challenge.correctIndex).toBeLessThan(total);
        }
      }
    }
  });

  it('oferece quatro alternativas nos desafios de escolha', () => {
    for (const type of ['padrao', 'sequencia', 'diferente', 'rotacao', 'memoria', 'linguagem'] as const) {
      for (const challenge of samplesOf(type, 3)) {
        if (challenge.format !== 'atencao') {
          expect(challenge.options.length).toBe(4);
        }
      }
    }
  });

  it('não repete a mesma alternativa duas vezes', () => {
    for (const type of ['padrao', 'sequencia', 'memoria', 'linguagem'] as const) {
      for (const difficulty of ALL_DIFFICULTIES) {
        for (const challenge of samplesOf(type, difficulty)) {
          if (challenge.format === 'tokens' || challenge.format === 'memoria') {
            const symbols = new Set(challenge.options.map((option) => option.symbol));

            expect(symbols.size).toBe(challenge.options.length);
          }
        }
      }
    }
  });

  it('descreve toda peça em texto, para não depender só do emoji', () => {
    for (const type of ALL_TYPES) {
      for (const challenge of samplesOf(type, 2)) {
        if (challenge.format === 'tokens' || challenge.format === 'memoria') {
          for (const option of challenge.options) {
            expect(option.label.length).toBeGreaterThan(0);
          }
        }
        if (challenge.format === 'atencao') {
          expect(challenge.target.label.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('padrões e lógica', () => {
  it('mostra a unidade repetida e cobra a peça seguinte do ciclo', () => {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (const challenge of samplesOf('padrao', difficulty)) {
        if (challenge.format !== 'tokens') {
          fail('o desafio de padrão deveria ser de peças');
          return;
        }

        const sequence = challenge.sequence;
        const period = new Set(sequence.map((token) => token.symbol)).size;
        const expected = sequence[sequence.length - period];

        expect(sequence.length).toBeGreaterThanOrEqual(4);
        expect(challenge.options[challenge.correctIndex].symbol).toBe(expected.symbol);
      }
    }
  });
});

describe('sequências numéricas', () => {
  it('usa contagem visual com os menores e números com os maiores', () => {
    const [visual] = samplesOf('sequencia', 1);
    const [numeric] = samplesOf('sequencia', 4);

    if (visual.format !== 'tokens' || numeric.format !== 'tokens') {
      fail('a sequência numérica deveria ser de peças');
      return;
    }

    expect(visual.sequence[0].label).toContain('bolinhas');
    expect(Number(numeric.sequence[0].symbol)).not.toBeNaN();
  });

  it('continua a regra que a própria sequência mostra', () => {
    for (const challenge of samplesOf('sequencia', 3)) {
      if (challenge.format !== 'tokens') {
        fail('a sequência numérica deveria ser de peças');
        return;
      }

      const terms = challenge.sequence.map((token) => Number(token.symbol));
      const step = terms[1] - terms[0];
      const answer = Number(challenge.options[challenge.correctIndex].symbol);

      expect(answer).toBe(terms[terms.length - 1] + step);
    }
  });

  it('nunca propõe número negativo nas alternativas', () => {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (const challenge of samplesOf('sequencia', difficulty)) {
        if (challenge.format === 'tokens' && difficulty > 1) {
          for (const option of challenge.options) {
            expect(Number(option.symbol)).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

describe('raciocínio visual', () => {
  it('deixa só uma figura diferente das outras três', () => {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (const challenge of samplesOf('diferente', difficulty)) {
        if (challenge.format !== 'figuras') {
          fail('o desafio visual deveria ser de figuras');
          return;
        }

        const answer = challenge.options[challenge.correctIndex];
        const others = challenge.options.filter((_, index) => index !== challenge.correctIndex);
        const otherKeys = new Set(others.map((figure) => figure.cells.join('')));

        expect(otherKeys.size).toBe(1);
        expect(answer.cells.join('')).not.toBe(others[0].cells.join(''));
      }
    }
  });

  it('mantém o mesmo número de células pintadas, para não entregar a resposta', () => {
    for (const challenge of samplesOf('diferente', 4)) {
      if (challenge.format === 'figuras') {
        const counts = challenge.options.map((figure) => figure.cells.filter(Boolean).length);

        expect(new Set(counts).size).toBe(1);
      }
    }
  });
});

describe('rotação espacial', () => {
  it('gira a grade em passos de noventa graus', () => {
    const cells = [true, false, false, false, false, false, false, false, false];

    expect(rotateCells(cells, 1)).toEqual([false, false, true, false, false, false, false, false, false]);
    expect(rotateCells(cells, 4)).toEqual(cells);
  });

  it('a resposta certa é a figura original girada', () => {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (const challenge of samplesOf('rotacao', difficulty)) {
        if (challenge.format !== 'figuras' || !challenge.reference) {
          fail('a rotação deveria trazer uma figura de referência');
          return;
        }

        const answer = challenge.options[challenge.correctIndex];

        expect(rotationKey(answer.cells)).toBe(rotationKey(challenge.reference.cells));
      }
    }
  });

  it('nenhum distrator é a mesma figura girada', () => {
    for (const challenge of samplesOf('rotacao', 3)) {
      if (challenge.format !== 'figuras' || !challenge.reference) {
        fail('a rotação deveria trazer uma figura de referência');
        return;
      }

      const referenceKey = rotationKey(challenge.reference.cells);

      challenge.options.forEach((option, index) => {
        if (index !== challenge.correctIndex) {
          expect(rotationKey(option.cells)).not.toBe(referenceKey);
        }
      });
    }
  });

  it('as quatro alternativas são visualmente diferentes entre si', () => {
    for (const challenge of samplesOf('rotacao', 5)) {
      if (challenge.format === 'figuras') {
        const keys = new Set(challenge.options.map((figure) => figure.cells.join('')));

        expect(keys.size).toBe(4);
      }
    }
  });

  it('espelhar duas vezes devolve a figura original', () => {
    const cells = [true, true, false, false, true, false, false, false, true];

    expect(mirrorCells(mirrorCells(cells))).toEqual(cells);
  });
});

describe('memória', () => {
  it('aumenta a sequência e encurta o tempo conforme a dificuldade', () => {
    const [easy] = samplesOf('memoria', 1);
    const [hard] = samplesOf('memoria', 5);

    if (easy.format !== 'memoria' || hard.format !== 'memoria') {
      fail('o desafio de memória deveria ter formato de memória');
      return;
    }

    expect(hard.sequence.length).toBeGreaterThan(easy.sequence.length);
    expect(hard.exposureMs).toBeLessThan(easy.exposureMs);
    expect(easy.exposureMs).toBeGreaterThan(0);
  });

  it('pergunta por uma posição que existe na sequência', () => {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (const challenge of samplesOf('memoria', difficulty)) {
        if (challenge.format !== 'memoria') {
          fail('o desafio de memória deveria ter formato de memória');
          return;
        }

        expect(challenge.targetPosition).toBeGreaterThanOrEqual(1);
        expect(challenge.targetPosition).toBeLessThanOrEqual(challenge.sequence.length);

        const expected = challenge.sequence[challenge.targetPosition - 1];
        expect(challenge.options[challenge.correctIndex].symbol).toBe(expected.symbol);
      }
    }
  });
});

describe('atenção', () => {
  it('esconde exatamente um alvo dentro da grade', () => {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (const challenge of samplesOf('atencao', difficulty)) {
        if (challenge.format !== 'atencao') {
          fail('o desafio de atenção deveria ter formato de grade');
          return;
        }

        const targets = challenge.grid.filter((item) => item.symbol === challenge.target.symbol);

        expect(targets.length).toBe(1);
        expect(challenge.grid[challenge.correctIndex].symbol).toBe(challenge.target.symbol);
      }
    }
  });

  it('aumenta a grade conforme a dificuldade', () => {
    const [easy] = samplesOf('atencao', 1);
    const [hard] = samplesOf('atencao', 5);

    if (easy.format !== 'atencao' || hard.format !== 'atencao') {
      fail('o desafio de atenção deveria ter formato de grade');
      return;
    }

    expect(hard.grid.length).toBeGreaterThan(easy.grid.length);
    expect(easy.grid.length % easy.columns).toBe(0);
  });
});

describe('palavras e significados', () => {
  it('usa classificação com os menores e analogia com os maiores', () => {
    const [young] = samplesOf('linguagem', 1);
    const [older] = samplesOf('linguagem', 5);

    expect(young.prompt).toContain('grupo');
    expect(older.prompt).toContain('está para');
  });
});

describe('cobertura do mapa', () => {
  it('todo tipo usado pelas ilhas sabe se montar', () => {
    const types = new Set(IQ_ISLANDS.flatMap((island) => island.types));

    for (const type of types) {
      for (const band of IQ_AGE_BANDS) {
        const challenge = createChallenge(type, band.startingDifficulty, 0, fakeRandom([0.3, 0.8]));

        expect(challenge.type).toBe(type);
      }
    }
  });

  it('gera identificadores diferentes para desafios diferentes da jornada', () => {
    const ids = new Set(
      Array.from({ length: 10 }, (_, order) =>
        createChallenge('padrao', 2, order, fakeRandom([0.5])).id,
      ),
    );

    expect(ids.size).toBe(10);
  });
});
