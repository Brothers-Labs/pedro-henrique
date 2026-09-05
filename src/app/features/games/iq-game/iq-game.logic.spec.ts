import {
  IQ_AGE_BANDS,
  IQ_EMPTY_LIFETIME_STATS,
  IQ_ISLANDS,
  IQ_MAX_AGE,
  IQ_MIN_AGE,
} from '../../../core/data/iq-game.data';
import type {
  IqAgeBand,
  IqAnswerRecord,
  IqDifficulty,
  IqLifetimeStats,
  IqSkill,
} from '../../../core/models/iq-game.model';
import {
  buildGuardianReport,
  buildIslandProgress,
  buildSkillScores,
  calculateCognitiveIndex,
  CHALLENGE_ISLANDS,
  clampAge,
  countCorrectBySkill,
  FIRE_STREAK_TARGET,
  initialAdaptiveState,
  isPlayableAge,
  LOGIC_MASTERY_TARGET,
  MAX_DIFFICULTY,
  MAX_SKILL_STARS,
  mergeLifetimeStats,
  MIN_DIFFICULTY,
  nextAdaptiveState,
  resolveAgeBand,
  starsForAccuracy,
  summarizeJourney,
  unlockedAchievementIds,
  XP_FOR_TRYING,
  XP_PER_DIFFICULTY,
  XP_STREAK_BONUS,
  XP_STREAK_THRESHOLD,
  xpForAnswer,
} from './iq-game.logic';

function answer(
  skill: IqSkill,
  wasCorrect: boolean,
  difficulty: IqDifficulty = 3,
  responseMs = 5000,
): IqAnswerRecord {
  return { challengeId: `${skill}-${difficulty}`, skill, difficulty, wasCorrect, responseMs };
}

function bandOf(id: IqAgeBand['id']): IqAgeBand {
  const band = IQ_AGE_BANDS.find((candidate) => candidate.id === id);
  if (!band) {
    throw new Error(`Faixa "${id}" não existe nos dados do jogo.`);
  }

  return band;
}

describe('idade', () => {
  it('aceita todas as idades do intervalo oferecido', () => {
    for (let age = IQ_MIN_AGE; age <= IQ_MAX_AGE; age += 1) {
      expect(isPlayableAge(age)).toBeTrue();
    }
  });

  it('recusa idades fora do intervalo e valores quebrados', () => {
    expect(isPlayableAge(IQ_MIN_AGE - 1)).toBeFalse();
    expect(isPlayableAge(IQ_MAX_AGE + 1)).toBeFalse();
    expect(isPlayableAge(7.5)).toBeFalse();
    expect(isPlayableAge(Number.NaN)).toBeFalse();
  });

  it('traz qualquer valor para dentro do intervalo, sem falhar', () => {
    expect(clampAge(0)).toBe(IQ_MIN_AGE);
    expect(clampAge(-3)).toBe(IQ_MIN_AGE);
    expect(clampAge(99)).toBe(IQ_MAX_AGE);
    expect(clampAge(8.9)).toBe(8);
    expect(clampAge(Number.NaN)).toBe(7);
    expect(clampAge(Number.POSITIVE_INFINITY)).toBe(7);
  });
});

describe('resolveAgeBand', () => {
  it('escolhe a faixa prevista para cada idade da tabela', () => {
    expect(resolveAgeBand(4).id).toBe('pequeno-explorador');
    expect(resolveAgeBand(5).id).toBe('pequeno-explorador');
    expect(resolveAgeBand(6).id).toBe('explorador');
    expect(resolveAgeBand(7).id).toBe('explorador');
    expect(resolveAgeBand(8).id).toBe('aventureiro');
    expect(resolveAgeBand(9).id).toBe('aventureiro');
    expect(resolveAgeBand(10).id).toBe('mestre-desafios');
    expect(resolveAgeBand(12).id).toBe('mestre-desafios');
    expect(resolveAgeBand(13).id).toBe('super-estrategista');
  });

  it('trata idades fora do intervalo pela ponta mais próxima', () => {
    expect(resolveAgeBand(2).id).toBe('pequeno-explorador');
    expect(resolveAgeBand(40).id).toBe('super-estrategista');
  });

  it('sobe a dificuldade inicial junto com a faixa etária', () => {
    const difficulties = IQ_AGE_BANDS.map((band) => band.startingDifficulty);

    expect(difficulties).toEqual([1, 2, 3, 4, 5]);
  });

  it('dá entre 5 e 8 desafios por ilha, conforme a faixa', () => {
    for (const band of IQ_AGE_BANDS) {
      expect(band.challengesPerIsland).toBeGreaterThanOrEqual(5);
      expect(band.challengesPerIsland).toBeLessThanOrEqual(8);
    }
  });

  it('começa a jornada na dificuldade da faixa, sem sequências pendentes', () => {
    const state = initialAdaptiveState(bandOf('aventureiro'));

    expect(state).toEqual({
      difficulty: 3,
      correctStreak: 0,
      wrongStreak: 0,
      hasLevelledUp: false,
    });
  });
});

describe('nextAdaptiveState', () => {
  const start = initialAdaptiveState(bandOf('aventureiro'));

  it('mantém a dificuldade depois de um único acerto', () => {
    const state = nextAdaptiveState(start, true);

    expect(state.difficulty).toBe(3);
    expect(state.correctStreak).toBe(1);
    expect(state.hasLevelledUp).toBeFalse();
  });

  it('sobe um nível depois de dois acertos seguidos', () => {
    const state = nextAdaptiveState(nextAdaptiveState(start, true), true);

    expect(state.difficulty).toBe(4);
    expect(state.hasLevelledUp).toBeTrue();
    expect(state.correctStreak).toBe(0);
  });

  it('desce um nível depois de dois erros seguidos, em silêncio', () => {
    const state = nextAdaptiveState(nextAdaptiveState(start, false), false);

    expect(state.difficulty).toBe(2);
    expect(state.hasLevelledUp).toBeFalse();
  });

  it('zera a sequência de acertos quando a criança erra', () => {
    const afterCorrect = nextAdaptiveState(start, true);
    const afterWrong = nextAdaptiveState(afterCorrect, false);

    expect(afterWrong.correctStreak).toBe(0);
    expect(afterWrong.difficulty).toBe(3);
  });

  it('nunca passa do nível máximo, por mais acertos que venham', () => {
    let state = initialAdaptiveState(bandOf('super-estrategista'));

    for (let round = 0; round < 10; round += 1) {
      state = nextAdaptiveState(state, true);
    }

    expect(state.difficulty).toBe(MAX_DIFFICULTY);
    expect(state.hasLevelledUp).toBeFalse();
  });

  it('nunca desce abaixo do nível mínimo, por mais erros que venham', () => {
    let state = initialAdaptiveState(bandOf('pequeno-explorador'));

    for (let round = 0; round < 10; round += 1) {
      state = nextAdaptiveState(state, false);
    }

    expect(state.difficulty).toBe(MIN_DIFFICULTY);
  });
});

describe('xpForAnswer', () => {
  it('paga mais XP quanto mais difícil for o desafio', () => {
    expect(xpForAnswer(1, true, 1)).toBe(XP_PER_DIFFICULTY);
    expect(xpForAnswer(5, true, 1)).toBe(XP_PER_DIFFICULTY * 5);
  });

  it('soma o bônus ao atingir a sequência mínima de acertos', () => {
    expect(xpForAnswer(2, true, XP_STREAK_THRESHOLD)).toBe(
      XP_PER_DIFFICULTY * 2 + XP_STREAK_BONUS,
    );
  });

  it('ainda dá XP de participação quando a criança erra', () => {
    expect(xpForAnswer(4, false, 0)).toBe(XP_FOR_TRYING);
  });
});

describe('buildIslandProgress', () => {
  it('abre só a primeira ilha no começo da jornada', () => {
    const steps = buildIslandProgress(0, false);

    expect(steps[0].state).toBe('disponivel');
    expect(steps[1].state).toBe('bloqueada');
  });

  it('marca a ilha atual enquanto a criança está jogando', () => {
    expect(buildIslandProgress(0, true)[0].state).toBe('atual');
  });

  it('conclui a anterior e libera a seguinte a cada ilha vencida', () => {
    const steps = buildIslandProgress(2, false);

    expect(steps[0].state).toBe('concluida');
    expect(steps[1].state).toBe('concluida');
    expect(steps[2].state).toBe('disponivel');
    expect(steps[3].state).toBe('bloqueada');
  });

  it('mantém o baú fechado até a última ilha de desafios terminar', () => {
    const reward = IQ_ISLANDS.length - 1;

    expect(buildIslandProgress(CHALLENGE_ISLANDS.length - 1, false)[reward].state).toBe(
      'bloqueada',
    );
    expect(buildIslandProgress(CHALLENGE_ISLANDS.length, false)[reward].state).toBe('recompensa');
  });

  it('desenha o mapa inteiro do projeto, com o castelo antes do baú', () => {
    const steps = buildIslandProgress(0, false);

    expect(steps.length).toBe(8);
    expect(steps[6].island.id).toBe('castelo');
    expect(steps[7].island.id).toBe('bau');
  });
});

describe('estrelas por habilidade', () => {
  it('não dá estrela para habilidade que ainda não foi praticada', () => {
    expect(starsForAccuracy(0, 0)).toBe(0);
  });

  it('dá a nota cheia para quem acertou tudo', () => {
    expect(starsForAccuracy(1, 5)).toBe(MAX_SKILL_STARS);
  });

  it('nunca zera quem tentou, mesmo errando tudo', () => {
    expect(starsForAccuracy(0, 5)).toBe(1);
  });

  it('conta acertos e tentativas de cada habilidade separadamente', () => {
    const scores = buildSkillScores([
      answer('logica', true),
      answer('logica', false),
      answer('memoria', true),
    ]);

    const logic = scores.find((score) => score.skill === 'logica');
    const language = scores.find((score) => score.skill === 'linguagem');

    expect(logic?.answered).toBe(2);
    expect(logic?.correct).toBe(1);
    expect(logic?.accuracy).toBe(0.5);
    expect(language?.answered).toBe(0);
    expect(language?.stars).toBe(0);
  });
});

describe('calculateCognitiveIndex', () => {
  it('devolve zero quando ainda não houve resposta', () => {
    expect(calculateCognitiveIndex([])).toBe(0);
  });

  it('fica entre 0 e 100 em qualquer cenário', () => {
    const worst = calculateCognitiveIndex([answer('logica', false, 1, 60000)]);
    const best = calculateCognitiveIndex([answer('logica', true, 5, 500)]);

    expect(worst).toBeGreaterThanOrEqual(0);
    expect(best).toBeLessThanOrEqual(100);
    expect(best).toBe(100);
  });

  it('sobe quando a criança acerta mais', () => {
    const few = calculateCognitiveIndex([answer('logica', true), answer('logica', false)]);
    const many = calculateCognitiveIndex([answer('logica', true), answer('logica', true)]);

    expect(many).toBeGreaterThan(few);
  });

  it('sobe quando os acertos vêm em desafios mais difíceis', () => {
    const easy = calculateCognitiveIndex([answer('logica', true, 1)]);
    const hard = calculateCognitiveIndex([answer('logica', true, 5)]);

    expect(hard).toBeGreaterThan(easy);
  });

  it('não vira corrida: demorar pesa menos que acertar', () => {
    const slowAndRight = calculateCognitiveIndex([answer('logica', true, 3, 30000)]);
    const fastAndWrong = calculateCognitiveIndex([answer('logica', false, 3, 800)]);

    expect(slowAndRight).toBeGreaterThan(fastAndWrong);
  });
});

describe('summarizeJourney', () => {
  const band = bandOf('explorador');

  it('aponta como superpoder a habilidade de melhor desempenho', () => {
    const summary = summarizeJourney({
      band,
      age: 7,
      answers: [
        answer('memoria', true),
        answer('memoria', true),
        answer('logica', true),
        answer('logica', false),
        answer('atencao', false),
        answer('atencao', false),
      ],
      totalXp: 100,
      bestStreak: 3,
    });

    expect(summary.superPowerSkill).toBe('memoria');
    expect(summary.growingSkill).toBe('atencao');
  });

  it('ignora habilidades não praticadas ao escolher o superpoder', () => {
    const summary = summarizeJourney({
      band,
      age: 7,
      answers: [answer('linguagem', true)],
      totalXp: 10,
      bestStreak: 1,
    });

    expect(summary.superPowerSkill).toBe('linguagem');
    expect(summary.growingSkill).toBe('linguagem');
  });

  it('guarda a maior dificuldade alcançada na jornada', () => {
    const summary = summarizeJourney({
      band,
      age: 7,
      answers: [answer('logica', true, 2), answer('logica', true, 4)],
      totalXp: 60,
      bestStreak: 2,
    });

    expect(summary.highestDifficulty).toBe(4);
    expect(summary.answered).toBe(2);
    expect(summary.correct).toBe(2);
  });

  it('nunca deixa a jornada sem superpoder, mesmo sem nenhum acerto', () => {
    const summary = summarizeJourney({
      band,
      age: 7,
      answers: [answer('visual', false)],
      totalXp: XP_FOR_TRYING,
      bestStreak: 0,
    });

    expect(summary.superPowerSkill).toBe('visual');
    expect(summary.cognitiveIndex).toBeGreaterThanOrEqual(0);
  });
});

describe('conquistas', () => {
  function statsWith(overrides: Partial<IqLifetimeStats>): IqLifetimeStats {
    return { ...IQ_EMPTY_LIFETIME_STATS, ...overrides };
  }

  it('não desbloqueia nada para quem ainda não jogou', () => {
    expect(unlockedAchievementIds(IQ_EMPTY_LIFETIME_STATS).size).toBe(0);
  });

  it('libera Mestre dos Padrões ao acumular acertos de lógica', () => {
    const almost = statsWith({
      correctBySkill: {
        ...IQ_EMPTY_LIFETIME_STATS.correctBySkill,
        logica: LOGIC_MASTERY_TARGET - 1,
      },
    });
    const reached = statsWith({
      correctBySkill: { ...IQ_EMPTY_LIFETIME_STATS.correctBySkill, logica: LOGIC_MASTERY_TARGET },
    });

    expect(unlockedAchievementIds(almost).has('mestre-padroes')).toBeFalse();
    expect(unlockedAchievementIds(reached).has('mestre-padroes')).toBeTrue();
  });

  it('libera Super Memória ao passar pela ilha da memória sem erros', () => {
    expect(unlockedAchievementIds(statsWith({ perfectMemoryRuns: 1 })).has('super-memoria'))
      .toBeTrue();
  });

  it('libera Olhos de Águia ao concluir a ilha da atenção', () => {
    expect(unlockedAchievementIds(statsWith({ attentionRuns: 1 })).has('olhos-aguia')).toBeTrue();
  });

  it('libera Mente em Chamas na sequência de cinco acertos', () => {
    const almost = statsWith({ bestStreak: FIRE_STREAK_TARGET - 1 });
    const reached = statsWith({ bestStreak: FIRE_STREAK_TARGET });

    expect(unlockedAchievementIds(almost).has('mente-em-chamas')).toBeFalse();
    expect(unlockedAchievementIds(reached).has('mente-em-chamas')).toBeTrue();
  });

  it('libera Grande Explorador só depois de todas as ilhas de desafio', () => {
    const partial = statsWith({ clearedIslandIds: ['padroes', 'numeros'] });
    const complete = statsWith({ clearedIslandIds: CHALLENGE_ISLANDS.map((i) => i.id) });

    expect(unlockedAchievementIds(partial).has('grande-explorador')).toBeFalse();
    expect(unlockedAchievementIds(complete).has('grande-explorador')).toBeTrue();
  });

  it('libera Mestre da Mente ao terminar a jornada', () => {
    expect(unlockedAchievementIds(statsWith({ journeysCompleted: 1 })).has('mestre-da-mente'))
      .toBeTrue();
  });
});

describe('mergeLifetimeStats', () => {
  it('soma XP e acertos, e guarda a melhor sequência das duas', () => {
    const base: IqLifetimeStats = {
      ...IQ_EMPTY_LIFETIME_STATS,
      totalXp: 100,
      bestStreak: 6,
      correctBySkill: { ...IQ_EMPTY_LIFETIME_STATS.correctBySkill, logica: 4 },
      journeysCompleted: 1,
    };
    const journey: IqLifetimeStats = {
      ...IQ_EMPTY_LIFETIME_STATS,
      totalXp: 50,
      bestStreak: 3,
      correctBySkill: { ...IQ_EMPTY_LIFETIME_STATS.correctBySkill, logica: 7, memoria: 2 },
      journeysCompleted: 1,
    };

    const merged = mergeLifetimeStats(base, journey);

    expect(merged.totalXp).toBe(150);
    expect(merged.bestStreak).toBe(6);
    expect(merged.correctBySkill.logica).toBe(11);
    expect(merged.correctBySkill.memoria).toBe(2);
    expect(merged.journeysCompleted).toBe(2);
  });

  it('não repete ilhas já concluídas em jornadas anteriores', () => {
    const merged = mergeLifetimeStats(
      { ...IQ_EMPTY_LIFETIME_STATS, clearedIslandIds: ['padroes', 'numeros'] },
      { ...IQ_EMPTY_LIFETIME_STATS, clearedIslandIds: ['numeros', 'memoria'] },
    );

    expect(merged.clearedIslandIds).toEqual(['padroes', 'numeros', 'memoria']);
  });

  it('acumula acertos de lógica entre jornadas até a conquista abrir', () => {
    const perJourney: IqLifetimeStats = {
      ...IQ_EMPTY_LIFETIME_STATS,
      correctBySkill: { ...IQ_EMPTY_LIFETIME_STATS.correctBySkill, logica: 5 },
    };

    const afterTwo = mergeLifetimeStats(perJourney, perJourney);

    expect(afterTwo.correctBySkill.logica).toBe(LOGIC_MASTERY_TARGET);
    expect(unlockedAchievementIds(afterTwo).has('mestre-padroes')).toBeTrue();
  });
});

describe('countCorrectBySkill', () => {
  it('conta apenas os acertos, habilidade por habilidade', () => {
    const counts = countCorrectBySkill([
      answer('logica', true),
      answer('logica', false),
      answer('visual', true),
      answer('visual', true),
    ]);

    expect(counts.logica).toBe(1);
    expect(counts.visual).toBe(2);
    expect(counts.numeros).toBe(0);
  });
});

describe('buildGuardianReport', () => {
  const summary = summarizeJourney({
    band: bandOf('explorador'),
    age: 7,
    answers: [
      answer('logica', true),
      answer('logica', true),
      answer('atencao', false),
      answer('atencao', false),
    ],
    totalXp: 40,
    bestStreak: 2,
  });

  const report = buildGuardianReport({
    childName: 'Pedro Henrique',
    age: 7,
    evaluatedAt: '2026-09-03T12:00:00.000Z',
    summary,
  });

  it('identifica o que se destacou e o que vale praticar', () => {
    expect(report.highlights).toEqual(['logica']);
    expect(report.toPractice).toEqual(['atencao']);
  });

  it('não lista habilidades que a criança nem chegou a praticar', () => {
    expect(report.highlights).not.toContain('linguagem');
    expect(report.toPractice).not.toContain('linguagem');
  });

  it('carrega nome, idade e data para o cabeçalho do relatório', () => {
    expect(report.childName).toBe('Pedro Henrique');
    expect(report.age).toBe(7);
    expect(report.evaluatedAt).toBe('2026-09-03T12:00:00.000Z');
    expect(report.summary.cognitiveIndex).toBe(summary.cognitiveIndex);
  });
});
