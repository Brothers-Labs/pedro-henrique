import { TestBed } from '@angular/core/testing';

import type { RunResult } from '../models/aventura-state.model';
import { AVENTURA_STORAGE_KEY } from './aventura-repository';
import { AventuraStore } from './aventura-store.service';

const NOW = new Date('2026-10-20T12:00:00-03:00');

function createStore(): AventuraStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [AventuraStore] });

  return TestBed.inject(AventuraStore);
}

function victory(attemptId: string): RunResult {
  return {
    attemptId,
    levelId: '1-1',
    isVictory: true,
    timeMs: 40_000,
    coins: 20,
    hearts: 0,
    crowns: 2,
    ramps: 1,
    damageTaken: 0,
    score: 2000,
  };
}

describe('AventuraStore', () => {
  beforeEach(() => {
    localStorage.removeItem(AVENTURA_STORAGE_KEY);
    jasmine.clock().install();
    jasmine.clock().mockDate(NOW);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    TestBed.resetTestingModule();
    localStorage.removeItem(AVENTURA_STORAGE_KEY);
  });

  it('começa na Ilha Inicial, nível 1 e carteira vazia', () => {
    const store = createStore();

    expect(store.suggestedLevel().id).toBe('1-1');
    expect(store.seasonLevel().level).toBe(1);
    expect(store.coins()).toBe(0);
    expect(store.regions()[0].status).toBe('unlocked');
    expect(store.regions()[1].status).toBe('locked');
  });

  it('percorre a jornada: vitória → XP → missão → resgate → recarregar → progresso preservado', () => {
    const store = createStore();
    const summary = store.submitRun(victory('a1'));

    expect(summary?.stars).toBeGreaterThan(0);
    expect(store.claimableMissionCount()).toBeGreaterThan(0);
    expect(store.suggestedLevel().id).toBe('1-2');

    const coinsBefore = store.coins();

    expect(store.claimMission('diaria-completar-fase')).toBeTrue();
    expect(store.claimMission('diaria-completar-fase')).toBeFalse();
    expect(store.coins()).toBeGreaterThan(coinsBefore);

    const reloaded = createStore();

    expect(reloaded.coins()).toBe(store.coins());
    expect(reloaded.levelProgress('1-1')?.wins).toBe(1);
    expect(reloaded.seasonProgress().xp).toBe(store.seasonProgress().xp);
    expect(reloaded.submitRun(victory('a1'))).toBeNull();
  });

  it('salva as configurações e as recupera', () => {
    createStore().updateSettings({ musicVolume: 0.2, quality: 'baixa' });

    expect(createStore().settings()).toEqual(jasmine.objectContaining({ musicVolume: 0.2, quality: 'baixa' }));
  });

  it('avisa quando o aparelho não deixa gravar', () => {
    const store = createStore();

    spyOn(Storage.prototype, 'setItem').and.throwError('cheio');
    store.updateSettings({ effectsVolume: 0.1 });

    expect(store.isPersistent()).toBeFalse();
  });

  it('apaga o progresso quando pedido', () => {
    const store = createStore();

    store.submitRun(victory('a2'));
    store.resetProgress();

    expect(store.coins()).toBe(0);
    expect(store.levelProgress('1-1')).toBeNull();
  });
});
