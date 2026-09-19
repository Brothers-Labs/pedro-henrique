import { TestBed } from '@angular/core/testing';

import { gameDefinition } from '../data/game-progress.data';
import { GameProgressService } from './game-progress.service';

const STORAGE_KEY = 'pedro-henrique:games-progress:v1';
const LEGACY_ENGLISH_KEY = 'pedro-henrique:english-progress';
const PER_LEVEL = gameDefinition('matematica').challengesPerLevel;

function createService(): GameProgressService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [GameProgressService] });

  return TestBed.inject(GameProgressService);
}

describe('GameProgressService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_ENGLISH_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_ENGLISH_KEY);
  });

  it('começa toda a jornada no nível 1', () => {
    const service = createService();

    expect(service.progressOf('matematica').level).toBe(1);
    expect(service.summary().totalScore).toBe(0);
  });

  it('mantém o progresso depois de recarregar a página', () => {
    const service = createService();
    service.registerChallenge('matematica', true);
    service.registerChallenge('matematica', true);

    const reloaded = createService();

    expect(reloaded.progressOf('matematica').completedInLevel).toBe(2);
    expect(reloaded.progressOf('matematica').score).toBeGreaterThan(0);
  });

  it('não perde o nível conquistado ao recarregar no meio do seguinte', () => {
    const service = createService();
    for (let index = 0; index < PER_LEVEL + 2; index += 1) {
      service.registerChallenge('matematica', true);
    }

    const reloaded = createService();

    expect(reloaded.progressOf('matematica').level).toBe(2);
    expect(reloaded.progressOf('matematica').completedInLevel).toBe(2);
  });

  it('enfileira as conquistas novas e as entrega uma de cada vez', () => {
    const service = createService();
    service.registerChallenge('matematica', true);

    // A primeira resposta certa já atinge "cem pontos"? Não: basta haver fila.
    for (let index = 0; index < PER_LEVEL; index += 1) {
      service.registerChallenge('matematica', true);
    }

    expect(service.pendingAchievement()).not.toBeNull();

    const first = service.pendingAchievement();
    service.dismissAchievement();

    expect(service.pendingAchievement()).not.toBe(first);
  });

  it('traz o XP do jogo de inglês antigo para dentro da jornada', () => {
    localStorage.setItem(
      LEGACY_ENGLISH_KEY,
      JSON.stringify({ totalXp: 240, bestStreak: 6, masteredIds: Array.from({ length: 14 }, (_, i) => `ing-${i}`) }),
    );

    const service = createService();
    const english = service.progressOf('ingles');

    expect(english.score).toBe(240);
    expect(english.bestStreak).toBe(6);
    expect(english.level).toBe(2);
    expect(english.completedInLevel).toBe(4);
  });

  it('recomeça do zero quando o dado guardado está corrompido', () => {
    localStorage.setItem(STORAGE_KEY, 'isto não é json');

    const service = createService();

    expect(service.progressOf('quiz').level).toBe(1);
  });

  it('preenche com progresso zerado um jogo ausente do dado guardado', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, games: { quiz: { level: 4, score: 900 } }, unlockedAchievements: [] }),
    );

    const service = createService();

    expect(service.progressOf('quiz').level).toBe(4);
    expect(service.progressOf('quiz').score).toBe(900);
    expect(service.progressOf('memoria').level).toBe(1);
  });

  it('zera um jogo sem tocar nos outros', () => {
    const service = createService();
    service.registerChallenge('matematica', true);
    service.registerChallenge('quiz', true);

    service.resetGame('matematica');

    expect(service.progressOf('matematica').totalPlayed).toBe(0);
    expect(service.progressOf('quiz').totalPlayed).toBe(1);
  });
});
