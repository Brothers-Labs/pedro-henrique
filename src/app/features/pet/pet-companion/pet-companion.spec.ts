import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameEventBus } from '../../../core/events/game-event-bus';
import { PetService } from '../../../core/services/pet.service';
import { PetCompanion } from './pet-companion';

const STORAGE_KEY = 'pedro-henrique:pet:v1';

describe('PetCompanion', () => {
  let fixture: ComponentFixture<PetCompanion>;
  let element: HTMLElement;
  let bus: GameEventBus;
  let pets: PetService;

  function answer(wasCorrect: boolean, streak = 1): void {
    bus.emit({ type: 'CHALLENGE_COMPLETED', gameId: 'matematica', wasCorrect, streak });
    fixture.detectChanges();
  }

  function speech(): string {
    return element.querySelector('.companion__bubble')?.textContent?.trim() ?? '';
  }

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [PetCompanion] }).compileComponents();

    fixture = TestBed.createComponent(PetCompanion);
    element = fixture.nativeElement;
    bus = TestBed.inject(GameEventBus);
    pets = TestBed.inject(PetService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('fica quieto enquanto não existe mascote', () => {
    answer(true);

    expect(element.querySelector('.companion')).toBeNull();
  });

  it('comemora o acerto', () => {
    pets.choose('dragao', 'Foguinho');
    answer(true);

    expect(speech().length).toBeGreaterThan(0);
  });

  it('não comenta todos os desafios seguidos, para não cansar', () => {
    pets.choose('dragao', 'Foguinho');

    answer(true);
    const first = speech();

    answer(false, 0);

    // A segunda resposta cai dentro do silêncio: a fala continua sendo a mesma.
    expect(speech()).toBe(first);
  });

  it('abre uma exceção para a sequência longa', () => {
    pets.choose('dragao', 'Foguinho');

    answer(true, 1);
    const first = speech();

    answer(true, 5);

    expect(speech()).not.toBe(first);
  });

  it('anuncia o XP do nível concluído no jogo', () => {
    pets.choose('dragao', 'Foguinho');

    bus.emit({ type: 'LEVEL_COMPLETED', gameId: 'matematica', level: 2, wasPerfect: false });
    fixture.detectChanges();

    expect(speech()).toContain('XP');
  });

  it('cala quando uma comemoração maior toma a tela', () => {
    pets.choose('dragao', 'Foguinho');
    answer(true);

    expect(element.querySelector('.companion')).not.toBeNull();

    pets.addXp(200, 'conquista');
    fixture.detectChanges();

    expect(element.querySelector('.companion')).toBeNull();
  });
});
