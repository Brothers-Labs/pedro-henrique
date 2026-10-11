import { ADVENTURE_RULES } from '../config/adventure-rules.config';
import type { AdventureLevel, AdventureProgress, AdventureWorld, LevelRunResult } from '../models/adventure.model';
import {
  buildWorldViews,
  createAdventureProgress,
  currentWorldOf,
  isWorldUnlocked,
  levelViewOf,
  nextLevelOf,
  settleLevel,
  starsFor,
} from './adventure-progression';

const NOW = new Date('2026-10-09T10:00:00.000Z');
const LATER = new Date('2026-10-10T10:00:00.000Z');

const PERFECT: LevelRunResult = { correct: 10, total: 10 };
const GOOD: LevelRunResult = { correct: 7, total: 10 };
const WEAK: LevelRunResult = { correct: 2, total: 10 };

const { rewards } = ADVENTURE_RULES;

function level(id: string, extra: Partial<AdventureLevel> = {}): AdventureLevel {
  return {
    id,
    icon: '➕',
    skill: 'Soma',
    title: `Fase ${id}`,
    story: 'História',
    objective: 'Objetivo',
    completionMessage: 'Concluída',
    activity: { type: 'math', questionCount: 10, rounds: [{ operation: 'soma', ceiling: 10 }] },
    ...extra,
  };
}

function world(id: string, levels: readonly AdventureLevel[], unlock: AdventureWorld['unlock']): AdventureWorld {
  return {
    id,
    name: `Mundo ${id}`,
    emoji: '🏡',
    tagline: 'Mundo de teste',
    color: 'yellow',
    skillGameId: 'matematica',
    unlock,
    scenery: { sky: '#fff', ground: '#0f0', trail: '#f90', hasRiver: false, decorations: ['🌳'] },
    levels,
    medal: { label: `Medalha ${id}`, emoji: '🏅' },
    rewardAccessoryId: 'mochila',
    completionMessage: `Mundo ${id} concluído!`,
  };
}

/** Três mundos: um de três fases (checkpoint, baú e guardião), um de uma fase e um "em breve". */
const WORLDS: readonly AdventureWorld[] = [
  world(
    'a',
    [
      level('a1'),
      level('a2', {
        isCheckpoint: true,
        chest: { curiosityId: 'comida-favorita', bonusPoints: 15, bonusPetXp: 5 },
      }),
      level('a3', { guardian: { name: 'Guardião', emoji: '🧮', greeting: 'Olá!' } }),
    ],
    { kind: 'start' },
  ),
  world('b', [level('b1')], { kind: 'world-completed', worldId: 'a' }),
  world('c', [], { kind: 'world-completed', worldId: 'b' }),
];

function play(progress: AdventureProgress, worldId: string, levelId: string, result = GOOD, now = NOW): AdventureProgress {
  return settleLevel(progress, WORLDS, worldId, levelId, result, now).progress;
}

function completeWorldA(): AdventureProgress {
  return ['a1', 'a2', 'a3'].reduce((progress, id) => play(progress, 'a', id), createAdventureProgress());
}

describe('starsFor', () => {
  it('dá uma estrela por terminar, mesmo errando quase tudo', () => {
    expect(starsFor(0, 10)).toBe(1);
    expect(starsFor(6, 10)).toBe(1);
  });

  it('dá duas a partir de 70% e três a partir de 90%', () => {
    expect(starsFor(7, 10)).toBe(2);
    expect(starsFor(8, 10)).toBe(2);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(10, 10)).toBe(3);
  });

  it('não dá estrela sem perguntas', () => {
    expect(starsFor(0, 0)).toBe(0);
  });
});

describe('buildWorldViews', () => {
  it('começa com a primeira fase do primeiro mundo como atual e o resto trancado', () => {
    const [first, second, third] = buildWorldViews(createAdventureProgress(), WORLDS);

    expect(first.status).toBe('in-progress');
    expect(first.levels.map((view) => view.status)).toEqual(['current', 'locked', 'locked']);
    expect(second.status).toBe('locked');
    expect(second.levels.map((view) => view.status)).toEqual(['locked']);
    expect(third.status).toBe('locked');
  });

  it('libera a fase seguinte quando a anterior é concluída', () => {
    const [first] = buildWorldViews(play(createAdventureProgress(), 'a', 'a1'), WORLDS);

    expect(first.levels.map((view) => view.status)).toEqual(['completed', 'current', 'locked']);
    expect(first.companionLevel?.level.id).toBe('a2');
  });

  it('marca como perfeita a fase com três estrelas', () => {
    const [first] = buildWorldViews(play(createAdventureProgress(), 'a', 'a1', PERFECT), WORLDS);

    expect(first.levels[0].status).toBe('perfect');
  });

  it('abre o próximo mundo só quando o anterior termina, e o mascote muda de mundo', () => {
    const views = buildWorldViews(completeWorldA(), WORLDS);

    expect(views[0].status).toBe('completed');
    expect(views[1].status).toBe('in-progress');
    expect(views[1].levels[0].status).toBe('current');
    expect(currentWorldOf(views)?.world.id).toBe('b');
  });

  it('mostra como "em breve" o mundo aberto que ainda não tem fases', () => {
    const progress = play(completeWorldA(), 'b', 'b1');
    const views = buildWorldViews(progress, WORLDS);

    expect(views[2].status).toBe('coming-soon');
    expect(currentWorldOf(views)?.world.id).toBe('b');
    expect(views[1].companionLevel?.level.id).toBe('b1');
  });

  it('soma as estrelas de cada mundo sem nunca passar do máximo', () => {
    const [first] = buildWorldViews(play(createAdventureProgress(), 'a', 'a1', PERFECT), WORLDS);

    expect(first.stars).toBe(3);
    expect(first.maxStars).toBe(9);
    expect(first.completedLevels).toBe(1);
  });

  it('acha a fase pelo mundo e pelo id', () => {
    const views = buildWorldViews(createAdventureProgress(), WORLDS);

    expect(levelViewOf(views, 'a', 'a2')?.order).toBe(2);
    expect(levelViewOf(views, 'a', 'b1')).toBeNull();
  });
});

describe('isWorldUnlocked', () => {
  it('não abre um mundo que depende de um mundo inexistente', () => {
    const orphan = world('x', [level('x1')], { kind: 'world-completed', worldId: 'nenhum' });

    expect(isWorldUnlocked(createAdventureProgress(), orphan, [...WORLDS, orphan])).toBeFalse();
  });
});

describe('settleLevel', () => {
  it('paga a primeira conclusão e as estrelas conquistadas', () => {
    const completion = settleLevel(createAdventureProgress(), WORLDS, 'a', 'a1', GOOD, NOW);

    expect(completion.isFirstCompletion).toBeTrue();
    expect(completion.stars).toBe(2);
    expect(completion.bonusPoints).toBe(rewards.firstCompletion.points + 2 * rewards.perNewStar.points);
    expect(completion.bonusPetXp).toBe(rewards.firstCompletion.petXp + 2 * rewards.perNewStar.petXp);
    expect(completion.progress.levels['a1']).toEqual({
      attempts: 1,
      bestScore: 7,
      bestStars: 2,
      completedAt: NOW.toISOString(),
    });
  });

  it('não paga nada de novo ao repetir a mesma partida (duplo clique, recarregar)', () => {
    const first = settleLevel(createAdventureProgress(), WORLDS, 'a', 'a2', GOOD, NOW);
    const repeated = settleLevel(first.progress, WORLDS, 'a', 'a2', GOOD, NOW);

    expect(repeated.isFirstCompletion).toBeFalse();
    expect(repeated.bonusPoints).toBe(0);
    expect(repeated.bonusPetXp).toBe(0);
    expect(repeated.reachedCheckpoint).toBeFalse();
    expect(repeated.openedChest).toBeNull();
    expect(repeated.unlockedCuriosity).toBeNull();
    expect(repeated.progress.curiosities.length).toBe(1);
  });

  it('rejogar pior mantém as melhores estrelas e a melhor pontuação', () => {
    const best = play(createAdventureProgress(), 'a', 'a1', PERFECT);
    const completion = settleLevel(best, WORLDS, 'a', 'a1', WEAK, LATER);
    const record = completion.progress.levels['a1'];

    expect(completion.stars).toBe(1);
    expect(record.bestStars).toBe(3);
    expect(record.bestScore).toBe(10);
    expect(record.attempts).toBe(2);
    expect(record.completedAt).toBe(NOW.toISOString());
    expect(completion.bonusPoints).toBe(0);
  });

  it('rejogar melhor paga só as estrelas novas', () => {
    const weak = play(createAdventureProgress(), 'a', 'a1', WEAK);
    const completion = settleLevel(weak, WORLDS, 'a', 'a1', PERFECT, LATER);

    expect(completion.previousBestStars).toBe(1);
    expect(completion.bonusPoints).toBe(2 * rewards.perNewStar.points);
    expect(completion.bonusPetXp).toBe(2 * rewards.perNewStar.petXp);
  });

  it('comemora o checkpoint e abre o baú com a curiosidade uma vez só', () => {
    const completion = settleLevel(play(createAdventureProgress(), 'a', 'a1'), WORLDS, 'a', 'a2', WEAK, NOW);

    expect(completion.reachedCheckpoint).toBeTrue();
    expect(completion.openedChest?.bonusPoints).toBe(15);
    expect(completion.unlockedCuriosity?.id).toBe('comida-favorita');
    expect(completion.bonusPoints).toBe(
      rewards.firstCompletion.points + rewards.perNewStar.points + rewards.checkpoint.points + 15,
    );
    expect(completion.progress.curiosities).toEqual([{ id: 'comida-favorita', unlockedAt: NOW.toISOString() }]);
  });

  it('vencer o guardião conclui o mundo, paga o prêmio especial e abre o próximo mundo', () => {
    const beforeGuardian = ['a1', 'a2'].reduce((progress, id) => play(progress, 'a', id), createAdventureProgress());
    const completion = settleLevel(beforeGuardian, WORLDS, 'a', 'a3', WEAK, NOW);

    expect(completion.completedWorld?.id).toBe('a');
    expect(completion.unlockedWorld?.id).toBe('b');
    expect(completion.bonusPoints).toBe(
      rewards.firstCompletion.points + rewards.perNewStar.points + rewards.guardian.points,
    );
  });

  it('não repete a conclusão do mundo ao rejogar o guardião', () => {
    const completion = settleLevel(completeWorldA(), WORLDS, 'a', 'a3', PERFECT, LATER);

    // O mundo foi concluído com duas estrelas no guardião: só a terceira é nova.
    expect(completion.completedWorld).toBeNull();
    expect(completion.unlockedWorld).toBeNull();
    expect(completion.bonusPoints).toBe(rewards.perNewStar.points);
  });

  it('anuncia o mundo "em breve" que abre ao terminar o último mundo pronto', () => {
    const completion = settleLevel(completeWorldA(), WORLDS, 'b', 'b1', GOOD, NOW);

    expect(completion.completedWorld?.id).toBe('b');
    expect(completion.unlockedWorld?.id).toBe('c');
  });

  it('limita acertos ao total e ignora números negativos', () => {
    const completion = settleLevel(createAdventureProgress(), WORLDS, 'a', 'a1', { correct: 99, total: 10 }, NOW);
    const negative = settleLevel(createAdventureProgress(), WORLDS, 'a', 'a1', { correct: -3, total: 10 }, NOW);

    expect(completion.progress.levels['a1'].bestScore).toBe(10);
    expect(negative.progress.levels['a1'].bestScore).toBe(0);
  });

  it('recusa uma fase que não existe no mundo', () => {
    expect(() => settleLevel(createAdventureProgress(), WORLDS, 'a', 'b1', GOOD, NOW)).toThrowError(/não existe/);
  });

  it('não altera o progresso recebido', () => {
    const progress = createAdventureProgress();

    settleLevel(progress, WORLDS, 'a', 'a1', GOOD, NOW);

    expect(progress).toEqual(createAdventureProgress());
  });
});

describe('nextLevelOf', () => {
  it('aponta a fase seguinte e termina no fim do mundo', () => {
    expect(nextLevelOf(WORLDS[0], 'a1')?.id).toBe('a2');
    expect(nextLevelOf(WORLDS[0], 'a3')).toBeNull();
    expect(nextLevelOf(WORLDS[0], 'inexistente')).toBeNull();
  });
});
