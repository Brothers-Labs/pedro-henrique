import { MATH_AGE_BANDS, MATH_PLAYABLE_AGES } from '../../../core/data/math-game.data';
import type { MathAgeBand, MathStage } from '../../../core/models/math-game.model';
import {
  buildTrail,
  buildTrailSteps,
  completionPercentage,
  MAX_STARS,
  parseTypedAnswer,
  type RandomGenerator,
  resolveAgeBand,
  STAGES_PER_TRAIL,
  starsForMisses,
} from './math-game.logic';

/** Gerador previsível: repete a sequência informada, sem depender de sorte. */
function fakeRandom(values: readonly number[]): RandomGenerator {
  let index = 0;

  return () => {
    const value = values[index % values.length];
    index += 1;

    return value;
  };
}

/** Trilha determinística, para inspecionar as contas geradas. */
function trailOf(band: MathAgeBand, values: readonly number[] = [0, 0.5, 0.99]): readonly MathStage[] {
  return buildTrail(band, fakeRandom(values)).stages;
}

function bandOf(id: MathAgeBand['id']): MathAgeBand {
  const band = MATH_AGE_BANDS.find((candidate) => candidate.id === id);
  if (!band) {
    throw new Error(`Faixa "${id}" não existe nos dados do jogo.`);
  }

  return band;
}

describe('resolveAgeBand', () => {
  it('escolhe a faixa de cada idade prevista pelas regras do jogo', () => {
    expect(resolveAgeBand(4).band.id).toBe('descobrindo');
    expect(resolveAgeBand(5).band.id).toBe('descobrindo');
    expect(resolveAgeBand(6).band.id).toBe('somando');
    expect(resolveAgeBand(7).band.id).toBe('somando');
    expect(resolveAgeBand(8).band.id).toBe('crescendo');
    expect(resolveAgeBand(9).band.id).toBe('crescendo');
    expect(resolveAgeBand(10).band.id).toBe('desafiando');
    expect(resolveAgeBand(12).band.id).toBe('desafiando');
  });

  it('não marca ajuste quando a idade está dentro das faixas', () => {
    for (const age of MATH_PLAYABLE_AGES) {
      expect(resolveAgeBand(age).wasAdjusted).toBeFalse();
    }
  });

  it('aproxima idades abaixo e acima das faixas para a ponta mais próxima', () => {
    expect(resolveAgeBand(2)).toEqual({ band: MATH_AGE_BANDS[0], wasAdjusted: true });
    expect(resolveAgeBand(30)).toEqual({
      band: MATH_AGE_BANDS[MATH_AGE_BANDS.length - 1],
      wasAdjusted: true,
    });
  });

  it('cai na faixa padrão quando a idade não é um número', () => {
    expect(resolveAgeBand(Number.NaN).band.id).toBe('somando');
    expect(resolveAgeBand(Number.NaN).wasAdjusted).toBeTrue();
  });

  it('nunca devolve faixa vazia para valores estranhos', () => {
    for (const age of [Number.POSITIVE_INFINITY, -10, 0, 7.5]) {
      expect(resolveAgeBand(age).band).toBeDefined();
    }
  });
});

describe('buildTrail', () => {
  it('gera sempre a mesma quantidade de fases, em qualquer faixa', () => {
    for (const band of MATH_AGE_BANDS) {
      expect(trailOf(band).length).toBe(STAGES_PER_TRAIL);
    }
  });

  it('não repete identificadores dentro da trilha', () => {
    for (const band of MATH_AGE_BANDS) {
      const ids = new Set(trailOf(band).map((stage) => stage.id));

      expect(ids.size).toBe(STAGES_PER_TRAIL);
    }
  });

  it('usa apenas as operações previstas para a faixa', () => {
    for (const band of MATH_AGE_BANDS) {
      for (const stage of trailOf(band)) {
        expect(band.operations).toContain(stage.operation);
      }
    }
  });

  it('nunca produz resposta negativa nem fracionada', () => {
    for (const band of MATH_AGE_BANDS) {
      for (const stage of trailOf(band, [0.1, 0.9, 0.4, 0.75])) {
        expect(Number.isInteger(stage.answer)).toBeTrue();
        expect(stage.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('dá alternativas às primeiras fases e deixa as demais para digitar', () => {
    for (const band of MATH_AGE_BANDS) {
      trailOf(band).forEach((stage, index) => {
        const shouldHaveOptions = index < band.stagesWithOptions;

        expect(stage.options.length > 0).toBe(shouldHaveOptions);
      });
    }
  });

  it('inclui a resposta certa entre alternativas distintas e não negativas', () => {
    for (const stage of trailOf(bandOf('descobrindo'))) {
      expect(stage.options).toContain(stage.answer);
      expect(new Set(stage.options).size).toBe(stage.options.length);
      expect(stage.options.every((option) => option >= 0)).toBeTrue();
    }
  });

  it('mostra figurinhas contáveis para os menores e contas escritas para os maiores', () => {
    const counting = trailOf(bandOf('descobrindo')).filter((stage) => stage.kind === 'contagem');

    expect(counting.length).toBeGreaterThan(0);
    for (const stage of counting) {
      expect(stage.kind).toBe('contagem');
      if (stage.kind === 'contagem') {
        expect(stage.symbols.length).toBe(stage.answer);
      }
    }

    for (const stage of trailOf(bandOf('desafiando'))) {
      expect(stage.kind).toBe('expressao');
    }
  });

  it('aumenta a dificuldade ao longo da trilha', () => {
    const tiers = trailOf(bandOf('somando')).map((stage) => stage.tier);

    expect(tiers[0]).toBe('facil');
    expect(tiers[STAGES_PER_TRAIL - 1]).toBe('dificil');
  });

  it('respeita o teto de números da faixa mais nova', () => {
    for (const stage of trailOf(bandOf('descobrindo'), [0.99, 0.99, 0.99])) {
      expect(stage.answer).toBeLessThanOrEqual(bandOf('descobrindo').lastStageCeiling);
    }
  });

  it('mantém as divisões exatas', () => {
    const divisions = trailOf(bandOf('desafiando'), [0.2, 0.8, 0.55]).filter(
      (stage) => stage.operation === 'divisao',
    );

    expect(divisions.length).toBeGreaterThan(0);
    for (const stage of divisions) {
      if (stage.kind === 'expressao') {
        const [dividend, divisor] = stage.expression.split(' ÷ ').map(Number);

        expect(dividend / divisor).toBe(stage.answer);
      }
    }
  });
});

describe('parseTypedAnswer', () => {
  it('lê números inteiros mesmo com espaços em volta', () => {
    expect(parseTypedAnswer(' 12 ')).toBe(12);
    expect(parseTypedAnswer('0')).toBe(0);
  });

  it('recusa texto vazio, letras e números quebrados', () => {
    expect(parseTypedAnswer('')).toBeNull();
    expect(parseTypedAnswer('   ')).toBeNull();
    expect(parseTypedAnswer('oito')).toBeNull();
    expect(parseTypedAnswer('3,5')).toBeNull();
    expect(parseTypedAnswer('3.5')).toBeNull();
  });
});

describe('starsForMisses', () => {
  it('dá a nota cheia para quem acerta de primeira', () => {
    expect(starsForMisses(0)).toBe(MAX_STARS);
  });

  it('tira uma estrela por ajuda usada', () => {
    expect(starsForMisses(1)).toBe(MAX_STARS - 1);
    expect(starsForMisses(2)).toBe(MAX_STARS - 2);
  });

  it('nunca zera a fase concluída, por mais tentativas que tenham sido', () => {
    expect(starsForMisses(10)).toBe(1);
  });
});

describe('completionPercentage', () => {
  it('converte fases concluídas em porcentagem arredondada', () => {
    expect(completionPercentage(0, 8)).toBe(0);
    expect(completionPercentage(3, 8)).toBe(38);
    expect(completionPercentage(8, 8)).toBe(100);
  });

  it('devolve zero quando ainda não existe trilha', () => {
    expect(completionPercentage(0, 0)).toBe(0);
  });
});

describe('buildTrailSteps', () => {
  const stages = trailOf(bandOf('somando'));

  it('libera apenas a primeira fase quando nada foi concluído', () => {
    const steps = buildTrailSteps(stages, [], 0);

    expect(steps[0].isUnlocked).toBeTrue();
    expect(steps.slice(1).every((step) => step.isUnlocked)).toBeFalse();
    expect(steps[1].isUnlocked).toBeFalse();
  });

  it('abre a próxima fase assim que a anterior é concluída', () => {
    const steps = buildTrailSteps(stages, [3, 0, 0, 0, 0, 0, 0, 0], 1);

    expect(steps[0].isCompleted).toBeTrue();
    expect(steps[1].isUnlocked).toBeTrue();
    expect(steps[1].isCurrent).toBeTrue();
    expect(steps[2].isUnlocked).toBeFalse();
  });

  it('mantém fases posteriores trancadas quando uma anterior ficou para trás', () => {
    const steps = buildTrailSteps(stages, [3, 0, 2, 0, 0, 0, 0, 0], 1);

    expect(steps[2].isUnlocked).toBeFalse();
    expect(steps[3].isUnlocked).toBeFalse();
  });

  it('abre a trilha inteira quando todas as fases foram concluídas', () => {
    const steps = buildTrailSteps(stages, new Array(STAGES_PER_TRAIL).fill(1), 0);

    expect(steps.every((step) => step.isUnlocked)).toBeTrue();
  });
});
