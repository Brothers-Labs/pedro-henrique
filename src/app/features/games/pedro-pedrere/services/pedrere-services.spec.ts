import { TestBed } from '@angular/core/testing';

import { GameProgressService } from '../../../../core/services/game-progress.service';
import { DEFAULT_HERO_LOOK } from '../config/hero-look.config';
import { createBlankRows } from '../levels/level-editor';
import type { PedrereLevel } from '../models/level.model';
import type { AdventureResult } from '../models/scene.model';
import {
  DEFAULT_LEVEL_NAME,
  MAX_CUSTOM_LEVELS,
  normalizeLevelName,
  parseStoredLevels,
  PedrereLevelsService,
} from './pedrere-levels.service';
import { BOUNCE_GOAL_METERS, PedrereProgressService, reconcilePedrereProgress } from './pedrere-progress.service';

const PROGRESS_KEY = 'pedro-henrique:pedro-pedrere:v1';
const LEVELS_KEY = 'pedro-henrique:pedro-pedrere:levels:v1';

function victory(stars: number): AdventureResult {
  return { mode: 'aventura', isVictory: true, coins: 0, totalCoins: 0, stars };
}

describe('Progresso guardado do Pedro Pedrerê', () => {
  it('recomeça do padrão quando não há nada legível', () => {
    expect(reconcilePedrereProgress(null).look).toEqual(DEFAULT_HERO_LOOK);
    expect(reconcilePedrereProgress('lixo').bestRaceMs).toBeNull();
  });

  it('conserta só o campo estranho, sem perder as estrelas', () => {
    const progress = reconcilePedrereProgress({
      look: { shirt: 'xadrez', pants: 'preta', hat: 'coroa' },
      adventureStars: { 'primeiros-pulos': 2, 'fase-que-sumiu': 3, 'praia-do-pula-pula': 9 },
      bestHeightMeters: 31.8,
      races: 'muitas',
      raceWins: 2,
      bestRaceMs: -5,
    });

    expect(progress.look).toEqual({ shirt: DEFAULT_HERO_LOOK.shirt, pants: 'preta', hat: 'coroa' });
    expect(progress.adventureStars).toEqual({ 'primeiros-pulos': 2, 'praia-do-pula-pula': 3 });
    expect(progress.bestHeightMeters).toBe(31);
    expect(progress.races).toBe(0);
    expect(progress.raceWins).toBe(2);
    expect(progress.bestRaceMs).toBeNull();
  });
});

describe('PedrereProgressService', () => {
  let siteProgress: jasmine.SpyObj<GameProgressService>;
  let service: PedrereProgressService;

  beforeEach(() => {
    localStorage.removeItem(PROGRESS_KEY);
    siteProgress = jasmine.createSpyObj<GameProgressService>('GameProgressService', ['registerChallenge']);
    TestBed.configureTestingModule({ providers: [{ provide: GameProgressService, useValue: siteProgress }] });
    service = TestBed.inject(PedrereProgressService);
  });

  afterEach(() => localStorage.removeItem(PROGRESS_KEY));

  it('guarda a roupa escolhida no aparelho', () => {
    service.chooseShirt('azul');
    service.choosePants('marrom');
    service.chooseHat('cartola');

    expect(service.look()).toEqual({ shirt: 'azul', pants: 'marrom', hat: 'cartola' });
    expect(reconcilePedrereProgress(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null')).look.hat).toBe('cartola');
  });

  it('fica com as melhores estrelas da fase pronta e conta a vitória na jornada', () => {
    expect(service.recordAdventure('primeiros-pulos', victory(2)).isNewRecord).toBeTrue();
    expect(service.recordAdventure('primeiros-pulos', victory(1)).isNewRecord).toBeFalse();

    expect(service.starsOf('primeiros-pulos')).toBe(2);
    expect(service.totalStars()).toBe(2);
    expect(siteProgress.registerChallenge).toHaveBeenCalledTimes(2);
    expect(siteProgress.registerChallenge).toHaveBeenCalledWith('pedro-pedrere', true);
  });

  it('fase criada vale na jornada, mas não guarda estrelas', () => {
    service.recordAdventure('minha-abc', victory(3));

    expect(service.starsOf('minha-abc')).toBe(0);
    expect(siteProgress.registerChallenge).toHaveBeenCalledOnceWith('pedro-pedrere', true);
  });

  it('derrota na aventura não conta nada', () => {
    service.recordAdventure('primeiros-pulos', { ...victory(0), isVictory: false });

    expect(siteProgress.registerChallenge).not.toHaveBeenCalled();
  });

  it('o pula-pula vale como acerto só a partir da meta', () => {
    expect(service.recordBounce({ mode: 'pula-pula', heightMeters: 10 }).isNewRecord).toBeTrue();
    service.recordBounce({ mode: 'pula-pula', heightMeters: BOUNCE_GOAL_METERS });

    expect(service.progress().bestHeightMeters).toBe(BOUNCE_GOAL_METERS);
    expect(siteProgress.registerChallenge.calls.allArgs()).toEqual([
      ['pedro-pedrere', false],
      ['pedro-pedrere', true],
    ]);
  });

  it('conta corridas, vitórias e o melhor tempo', () => {
    service.recordRace({ mode: 'corrida', placement: 1, runners: 4, timeMs: 21_000 });
    const outcome = service.recordRace({ mode: 'corrida', placement: 4, runners: 4, timeMs: 25_000 });

    expect(outcome.isNewRecord).toBeFalse();
    expect(service.progress()).toEqual(jasmine.objectContaining({ races: 2, raceWins: 1, bestRaceMs: 21_000 }));
    expect(siteProgress.registerChallenge.calls.allArgs()).toEqual([
      ['pedro-pedrere', true],
      ['pedro-pedrere', false],
    ]);
  });
});

describe('Fases criadas no modo maker', () => {
  let service: PedrereLevelsService;

  beforeEach(() => {
    localStorage.removeItem(LEVELS_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(PedrereLevelsService);
  });

  afterEach(() => localStorage.removeItem(LEVELS_KEY));

  it('cria e depois atualiza a mesma fase', () => {
    const created = service.save({ name: '  Fase   do Pedro ', theme: 'praia', rows: createBlankRows(40) });

    if (!created.isSaved) {
      fail('a fase devia ter sido salva');

      return;
    }

    expect(created.level.name).toBe('Fase do Pedro');
    expect(created.level.id).toMatch(/^minha-/);

    const updated = service.save({ name: 'Nova', theme: 'neve', rows: created.level.rows }, created.level.id);

    expect(updated.isSaved).toBeTrue();
    expect(service.levels().length).toBe(1);
    expect(service.find(created.level.id)?.theme).toBe('neve');
    expect(parseStoredLevels(localStorage.getItem(LEVELS_KEY))).toEqual(service.levels());
  });

  it('recusa fase sem chegada e explica o motivo', () => {
    const rows = createBlankRows(40).map((row) => row.replace('F', '.'));
    const outcome = service.save({ name: 'Sem fim', theme: 'campo', rows });

    expect(outcome).toEqual({
      isSaved: false,
      messages: ['Coloque a bandeira de chegada em algum lugar da fase.'],
    });
    expect(service.levels()).toEqual([]);
  });

  it('não passa do limite de fases', () => {
    for (let index = 0; index < MAX_CUSTOM_LEVELS; index += 1) {
      service.save({ name: `Fase ${index}`, theme: 'campo', rows: createBlankRows(40) });
    }

    expect(service.save({ name: 'Mais uma', theme: 'campo', rows: createBlankRows(40) }).isSaved).toBeFalse();
    expect(service.levels().length).toBe(MAX_CUSTOM_LEVELS);
  });

  it('apaga a fase', () => {
    const outcome = service.save({ name: 'Tchau', theme: 'campo', rows: createBlankRows(40) });

    if (outcome.isSaved) {
      service.remove(outcome.level.id);
    }

    expect(service.levels()).toEqual([]);
  });

  it('descarta do armazenamento o que não é uma fase jogável', () => {
    const valid: PedrereLevel = { id: 'minha-1', name: 'Boa', theme: 'noite', rows: createBlankRows(40) };
    const raw = JSON.stringify([
      valid,
      { ...valid, id: 'primeiros-pulos' },
      { ...valid, theme: 'lava' },
      { ...valid, rows: ['curta'] },
      'lixo',
    ]);

    expect(parseStoredLevels(raw)).toEqual([valid]);
    expect(parseStoredLevels('{ quebrado')).toEqual([]);
    expect(parseStoredLevels(null)).toEqual([]);
  });

  it('nome vazio vira o nome padrão', () => {
    expect(normalizeLevelName('   ')).toBe(DEFAULT_LEVEL_NAME);
  });
});
