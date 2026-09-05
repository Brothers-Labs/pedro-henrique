import { TestBed } from '@angular/core/testing';

import { IQ_EMPTY_LIFETIME_STATS } from '../data/iq-game.data';
import type { IqJourneyRecord, IqLifetimeStats } from '../models/iq-game.model';
import { IqJourneyService } from './iq-journey.service';

const STORAGE_KEY = 'pedro-henrique:iq-journey:v1';

function recordAt(completedAt: string, cognitiveIndex = 70): IqJourneyRecord {
  return {
    completedAt,
    summary: {
      bandId: 'explorador',
      age: 7,
      answered: 35,
      correct: 28,
      totalXp: 420,
      bestStreak: 6,
      highestDifficulty: 4,
      averageResponseMs: 5200,
      skills: [],
      cognitiveIndex,
      superPowerSkill: 'logica',
      growingSkill: 'atencao',
    },
  };
}

function lifetimeWith(overrides: Partial<IqLifetimeStats>): IqLifetimeStats {
  return { ...IQ_EMPTY_LIFETIME_STATS, ...overrides };
}

/** Cria o serviço já com o storage no estado desejado. */
function createService(): IqJourneyService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});

  return TestBed.inject(IqJourneyService);
}

describe('IqJourneyService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('começa zerado quando ninguém jogou ainda', () => {
    const service = createService();

    expect(service.lifetime()).toEqual(IQ_EMPTY_LIFETIME_STATS);
    expect(service.history()).toEqual([]);
    expect(service.lastJourney()).toBeNull();
  });

  it('guarda a jornada concluída e o acumulado informado', () => {
    const service = createService();
    const record = recordAt('2026-09-03T12:00:00.000Z');

    service.saveJourney(record, lifetimeWith({ totalXp: 420, journeysCompleted: 1 }));

    expect(service.lifetime().totalXp).toBe(420);
    expect(service.history().length).toBe(1);
    expect(service.lastJourney()).toEqual(record);
  });

  it('devolve o progresso guardado ao abrir o site de novo', () => {
    const first = createService();
    first.saveJourney(
      recordAt('2026-09-03T12:00:00.000Z', 81),
      lifetimeWith({ totalXp: 300, bestStreak: 5, journeysCompleted: 1 }),
    );

    const reopened = createService();

    expect(reopened.lifetime().totalXp).toBe(300);
    expect(reopened.lifetime().bestStreak).toBe(5);
    expect(reopened.lastJourney()?.summary.cognitiveIndex).toBe(81);
  });

  it('mantém a jornada mais recente no topo do histórico', () => {
    const service = createService();

    service.saveJourney(recordAt('2026-09-01T10:00:00.000Z'), IQ_EMPTY_LIFETIME_STATS);
    service.saveJourney(recordAt('2026-09-03T10:00:00.000Z'), IQ_EMPTY_LIFETIME_STATS);

    expect(service.lastJourney()?.completedAt).toBe('2026-09-03T10:00:00.000Z');
    expect(service.history().length).toBe(2);
  });

  it('não deixa o histórico crescer sem limite', () => {
    const service = createService();

    for (let journey = 0; journey < 20; journey += 1) {
      service.saveJourney(
        recordAt(new Date(Date.UTC(2026, 0, journey + 1)).toISOString()),
        IQ_EMPTY_LIFETIME_STATS,
      );
    }

    expect(service.history().length).toBe(12);
  });

  describe('recuperação segura', () => {
    it('recomeça do zero quando o conteúdo não é JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'isto não é json');

      expect(createService().lifetime()).toEqual(IQ_EMPTY_LIFETIME_STATS);
    });

    it('recomeça do zero quando o formato guardado é outro', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['lista', 'inesperada']));

      const service = createService();

      expect(service.lifetime()).toEqual(IQ_EMPTY_LIFETIME_STATS);
      expect(service.history()).toEqual([]);
    });

    it('ignora acumulado com número inválido em vez de confiar nele', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lifetime: { ...IQ_EMPTY_LIFETIME_STATS, totalXp: -50 },
          history: [],
        }),
      );

      expect(createService().lifetime()).toEqual(IQ_EMPTY_LIFETIME_STATS);
    });

    it('ignora acumulado sem todas as habilidades', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lifetime: { ...IQ_EMPTY_LIFETIME_STATS, correctBySkill: { logica: 3 } },
          history: [],
        }),
      );

      expect(createService().lifetime()).toEqual(IQ_EMPTY_LIFETIME_STATS);
    });

    it('descarta só o registro corrompido e preserva os válidos', () => {
      const valid = recordAt('2026-09-03T12:00:00.000Z');

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lifetime: IQ_EMPTY_LIFETIME_STATS,
          history: [{ completedAt: 'ontem', summary: null }, valid, 'lixo'],
        }),
      );

      const service = createService();

      expect(service.history().length).toBe(1);
      expect(service.lastJourney()?.completedAt).toBe(valid.completedAt);
    });

    it('aceita o acumulado válido mesmo quando o histórico está quebrado', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lifetime: lifetimeWith({ totalXp: 120, journeysCompleted: 2 }),
          history: 'não é uma lista',
        }),
      );

      const service = createService();

      expect(service.lifetime().totalXp).toBe(120);
      expect(service.history()).toEqual([]);
    });
  });

  it('limpa tudo quando o progresso é reiniciado', () => {
    const service = createService();
    service.saveJourney(
      recordAt('2026-09-03T12:00:00.000Z'),
      lifetimeWith({ totalXp: 500, journeysCompleted: 1 }),
    );

    service.reset();

    expect(service.lifetime()).toEqual(IQ_EMPTY_LIFETIME_STATS);
    expect(service.history()).toEqual([]);
    expect(createService().lifetime()).toEqual(IQ_EMPTY_LIFETIME_STATS);
  });
});
