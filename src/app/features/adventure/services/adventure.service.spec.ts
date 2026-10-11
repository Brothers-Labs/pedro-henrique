import { TestBed } from '@angular/core/testing';

import { GameProgressService } from '../../../core/services/game-progress.service';
import { PetService } from '../../../core/services/pet.service';
import { ADVENTURE_RULES } from '../config/adventure-rules.config';
import { ADVENTURE_WORLDS } from '../config/adventure-worlds.config';
import { AdventureService } from './adventure.service';

const ADVENTURE_KEY = `pedro-henrique:adventure:v${ADVENTURE_RULES.schemaVersion}`;
const GAMES_KEY = 'pedro-henrique:games-progress:v1';
const PET_KEY = 'pedro-henrique:pet:v1';
const KEYS = [ADVENTURE_KEY, GAMES_KEY, PET_KEY];

const VILLAGE = ADVENTURE_WORLDS[0];
const FIRST_LEVEL = VILLAGE.levels[0];
const PERFECT = { correct: 10, total: 10 };

interface Harness {
  readonly adventure: AdventureService;
  readonly games: GameProgressService;
  readonly pets: PetService;
}

/** Recriar o módulo equivale a recarregar a página: tudo é lido do aparelho de novo. */
function createHarness(): Harness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});

  return {
    adventure: TestBed.inject(AdventureService),
    games: TestBed.inject(GameProgressService),
    pets: TestBed.inject(PetService),
  };
}

function completeVillage(adventure: AdventureService): void {
  for (const level of VILLAGE.levels) {
    adventure.completeLevel(VILLAGE.id, level.id, PERFECT);
  }
}

describe('AdventureService', () => {
  beforeEach(() => KEYS.forEach((key) => localStorage.removeItem(key)));
  afterEach(() => KEYS.forEach((key) => localStorage.removeItem(key)));

  it('começa na primeira fase da Vila da Matemática', () => {
    const { adventure } = createHarness();

    expect(adventure.currentWorld()?.world.id).toBe(VILLAGE.id);
    expect(adventure.levelView(VILLAGE.id, FIRST_LEVEL.id)?.status).toBe('current');
    expect(adventure.levelView(VILLAGE.id, VILLAGE.levels[1].id)?.status).toBe('locked');
  });

  it('conta cada resposta como desafio do jogo do mundo', () => {
    const { adventure, games } = createHarness();

    adventure.recordAnswer(VILLAGE.id, true);
    adventure.recordAnswer(VILLAGE.id, false);

    expect(games.progressOf(VILLAGE.skillGameId).totalPlayed).toBe(2);
    expect(games.progressOf(VILLAGE.skillGameId).correctAnswers).toBe(1);
  });

  it('paga os bônus em pontos e no XP do mascote', () => {
    const { adventure, games, pets } = createHarness();
    pets.choose('dragao', 'Foguinho');
    const petXpBefore = pets.pet()?.totalXp ?? 0;

    const completion = adventure.completeLevel(VILLAGE.id, FIRST_LEVEL.id, PERFECT);

    expect(games.summary().totalScore).toBe(completion.bonusPoints);
    expect((pets.pet()?.totalXp ?? 0) - petXpBefore).toBe(completion.bonusPetXp);
    expect(adventure.summary().stars).toBe(3);
  });

  it('não paga duas vezes a mesma conclusão', () => {
    const { adventure, games } = createHarness();

    adventure.completeLevel(VILLAGE.id, FIRST_LEVEL.id, PERFECT);
    const scoreAfterFirst = games.summary().totalScore;
    const repeated = adventure.completeLevel(VILLAGE.id, FIRST_LEVEL.id, PERFECT);

    expect(repeated.bonusPoints).toBe(0);
    expect(games.summary().totalScore).toBe(scoreAfterFirst);
  });

  it('mantém o progresso e os prêmios pagos depois de recarregar a página', () => {
    const first = createHarness();
    first.adventure.completeLevel(VILLAGE.id, FIRST_LEVEL.id, PERFECT);

    const reloaded = createHarness();
    const repeated = reloaded.adventure.completeLevel(VILLAGE.id, FIRST_LEVEL.id, PERFECT);

    expect(reloaded.adventure.levelView(VILLAGE.id, FIRST_LEVEL.id)?.status).toBe('perfect');
    expect(reloaded.adventure.levelView(VILLAGE.id, VILLAGE.levels[1].id)?.status).toBe('current');
    expect(repeated.isFirstCompletion).toBeFalse();
    expect(repeated.bonusPoints).toBe(0);
  });

  it('ao vencer o guardião entrega medalha, acessório e o próximo mundo', () => {
    const { adventure, pets } = createHarness();
    pets.choose('dragao', 'Foguinho');

    completeVillage(adventure);

    expect(adventure.medals()).toEqual([VILLAGE.medal]);
    expect(pets.pet()?.unlockedAccessories).toContain('mochila');
    expect(adventure.worldViews()[1].status).not.toBe('locked');
    expect(adventure.curiosities().length).toBeGreaterThan(0);
  });

  it('guarda o acessório para quem adotar o mascote depois de vencer o mundo', () => {
    const { adventure, pets } = createHarness();
    completeVillage(adventure);

    pets.choose('robo', 'Bip');
    adventure.deliverAccessories();

    expect(pets.pet()?.unlockedAccessories).toContain('mochila');
  });

  it('descarta do save uma fase que saiu do catálogo, sem perder o resto', () => {
    localStorage.setItem(
      ADVENTURE_KEY,
      JSON.stringify({
        version: 1,
        levels: {
          [FIRST_LEVEL.id]: { attempts: 2, bestScore: 9, bestStars: 3, completedAt: '2026-10-01T10:00:00.000Z' },
          'fase-removida': { attempts: 1, bestScore: 5, bestStars: 1, completedAt: '2026-10-01T10:00:00.000Z' },
        },
        claimedRewards: [`first:${FIRST_LEVEL.id}`, 42],
        curiosities: [{ id: 'nao-existe', unlockedAt: 'ontem' }],
      }),
    );

    const { adventure } = createHarness();

    expect(adventure.levelView(VILLAGE.id, FIRST_LEVEL.id)?.record?.bestStars).toBe(3);
    expect(adventure.summary().stars).toBe(3);
    expect(adventure.curiosities()).toEqual([]);
  });

  it('recomeça do zero com um save corrompido', () => {
    localStorage.setItem(ADVENTURE_KEY, '{não é json');

    const { adventure } = createHarness();

    expect(adventure.summary().stars).toBe(0);
    expect(adventure.levelView(VILLAGE.id, FIRST_LEVEL.id)?.status).toBe('current');
  });
});
