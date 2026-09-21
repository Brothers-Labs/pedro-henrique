import { TestBed } from '@angular/core/testing';

import { GameEventBus } from '../events/game-event-bus';
import { PET_XP } from '../data/pet.data';
import { GameProgressService } from './game-progress.service';
import { PetService } from './pet.service';

const STORAGE_KEY = 'pedro-henrique:pet:v1';
const GAMES_STORAGE_KEY = 'pedro-henrique:games-progress:v1';

interface Harness {
  readonly pets: PetService;
  readonly bus: GameEventBus;
}

function createHarness(): Harness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [PetService, GameEventBus] });

  return { pets: TestBed.inject(PetService), bus: TestBed.inject(GameEventBus) };
}

/** XP de um desafio comum: já passou a meta do dia e o bônus de dez. */
const ROUTINE_XP = PET_XP.atividade + PET_XP.acerto;

function answer(harness: Harness, wasCorrect: boolean, streak = 1): void {
  harness.bus.emit({ type: 'CHALLENGE_COMPLETED', gameId: 'matematica', wasCorrect, streak });
}

describe('PetService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GAMES_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GAMES_STORAGE_KEY);
  });

  it('começa sem mascote nenhum', () => {
    const { pets } = createHarness();

    expect(pets.hasPet()).toBeFalse();
    expect(pets.pet()).toBeNull();
  });

  it('adota o companheiro escolhido com o nome escolhido', () => {
    const { pets } = createHarness();
    pets.choose('dragao', 'Foguinho');

    expect(pets.pet()?.name).toBe('Foguinho');
    expect(pets.type()?.label).toBe('Dragão');
    expect(pets.stage()?.id).toBe('bebe');
  });

  it('ignora os eventos dos jogos enquanto não existe mascote', () => {
    const harness = createHarness();

    answer(harness, true);

    expect(harness.pets.pet()).toBeNull();
  });

  it('converte o primeiro desafio do dia em XP com o bônus da meta diária', () => {
    const harness = createHarness();
    harness.pets.choose('dino', 'Rex');

    answer(harness, true);

    expect(harness.pets.pet()?.totalXp).toBe(ROUTINE_XP + PET_XP['meta-diaria']);
  });

  it('dá o bônus de dez desafios uma vez a cada dez', () => {
    const harness = createHarness();
    harness.pets.choose('dino', 'Rex');

    for (let index = 0; index < 10; index += 1) {
      answer(harness, true);
    }

    const expected = ROUTINE_XP * 10 + PET_XP['meta-diaria'] + PET_XP['dez-atividades'];

    expect(harness.pets.pet()?.totalXp).toBe(expected);
    expect(harness.pets.pet()?.counters.activities).toBe(10);
  });

  it('conta o desafio mesmo quando a resposta está errada, mas sem o XP do acerto', () => {
    const harness = createHarness();
    harness.pets.choose('robo', 'Bip');

    answer(harness, false, 0);

    expect(harness.pets.pet()?.totalXp).toBe(PET_XP.atividade + PET_XP['meta-diaria']);
    expect(harness.pets.pet()?.counters.activities).toBe(1);
  });

  it('recompensa o nível concluído no jogo', () => {
    const harness = createHarness();
    harness.pets.choose('cachorro', 'Bolinha');

    harness.bus.emit({
      type: 'LEVEL_COMPLETED',
      gameId: 'quiz',
      level: 2,
      wasPerfect: false,
    });

    expect(harness.pets.pet()?.totalXp).toBe(PET_XP['nivel-de-jogo']);
  });

  it('mantém a aventura depois de recarregar a página', () => {
    const harness = createHarness();
    harness.pets.choose('dragao', 'Foguinho');
    answer(harness, true);

    const earned = harness.pets.pet()?.totalXp ?? 0;
    const reloaded = createHarness();

    expect(reloaded.pets.pet()?.name).toBe('Foguinho');
    expect(reloaded.pets.pet()?.totalXp).toBe(earned);
  });

  it('não repete a recompensa só porque a página foi recarregada', () => {
    const harness = createHarness();
    harness.pets.choose('dragao', 'Foguinho');

    for (let index = 0; index < 4; index += 1) {
      answer(harness, true);
    }

    const earned = harness.pets.pet()?.totalXp ?? 0;

    expect(createHarness().pets.pet()?.totalXp).toBe(earned);
    expect(createHarness().pets.pet()?.totalXp).toBe(earned);
  });

  it('enfileira as comemorações e entrega uma de cada vez', () => {
    const harness = createHarness();
    harness.pets.choose('dragao', 'Foguinho');

    harness.pets.addXp(200, 'conquista');

    const first = harness.pets.pendingCelebration();

    expect(first).not.toBeNull();

    harness.pets.dismissCelebration();

    expect(harness.pets.pendingCelebration()).not.toBe(first);
  });

  it('recomeça do zero quando o dado guardado está corrompido', () => {
    localStorage.setItem(STORAGE_KEY, 'isto não é json');

    expect(createHarness().pets.hasPet()).toBeFalse();
  });

  it('descarta o mascote ativo que não existe mais no dado guardado', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, activeType: 'dragao', pets: {} }),
    );

    expect(createHarness().pets.hasPet()).toBeFalse();
  });

  it('conserta valores impossíveis vindos de um save adulterado', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeType: 'robo',
        pets: {
          robo: {
            type: 'robo',
            name: 'Bip',
            level: -4,
            xp: -100,
            happiness: 900,
            energy: -30,
            equippedAccessory: 'coroa',
            unlockedAccessories: ['bone', 'inexistente'],
          },
        },
      }),
    );

    const pet = createHarness().pets.pet();

    expect(pet?.level).toBe(1);
    expect(pet?.xp).toBe(0);
    expect(pet?.happiness).toBe(100);
    expect(pet?.energy).toBe(0);
    expect(pet?.unlockedAccessories).toEqual(['bone']);
    // A coroa não estava desbloqueada: ninguém veste o que não conquistou.
    expect(pet?.equippedAccessory).toBeNull();
  });

  it('recebe o XP quando um jogo de verdade registra o desafio', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [PetService, GameProgressService, GameEventBus] });

    const pets = TestBed.inject(PetService);
    const games = TestBed.inject(GameProgressService);

    pets.choose('dragao', 'Foguinho');
    games.registerChallenge('matematica', true);

    expect(pets.pet()?.totalXp).toBe(ROUTINE_XP + PET_XP['meta-diaria']);
    expect(pets.pet()?.counters.bestStreak).toBe(1);
  });

  it('esquece tudo quando a aventura é reiniciada', () => {
    const harness = createHarness();
    harness.pets.choose('dragao', 'Foguinho');

    harness.pets.resetAll();

    expect(harness.pets.hasPet()).toBeFalse();
    expect(createHarness().pets.hasPet()).toBeFalse();
  });
});
