import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalmModeService } from '../../../core/services/calm-mode.service';
import { PetService } from '../../../core/services/pet.service';
import { PetCelebrations } from './pet-celebrations';

const STORAGE_KEY = 'pedro-henrique:pet:v1';

/** XP suficiente para atravessar os cinco primeiros níveis de uma vez só. */
const XP_ATE_JOVEM = 5000;

describe('PetCelebrations', () => {
  let fixture: ComponentFixture<PetCelebrations>;
  let element: HTMLElement;
  let pets: PetService;

  function toastText(): string {
    return element.querySelector('.pet-toast')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function dialog(): HTMLDialogElement | null {
    return element.querySelector('dialog');
  }

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [PetCelebrations] }).compileComponents();

    fixture = TestBed.createComponent(PetCelebrations);
    element = fixture.nativeElement;
    pets = TestBed.inject(PetService);

    // O modo calmo tira o suspense da evolução e deixa o teste determinístico.
    TestBed.inject(CalmModeService).setEnabled(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(CalmModeService).setEnabled(false);
    localStorage.removeItem(STORAGE_KEY);
  });

  it('não mostra nada quando não há o que comemorar', () => {
    expect(element.querySelector('.pet-toast')).toBeNull();
    expect(dialog()?.open ?? false).toBeFalse();
  });

  it('avisa o nível novo em um aviso curto', () => {
    pets.choose('dragao', 'Foguinho');
    pets.addXp(100, 'atividade');
    fixture.detectChanges();

    expect(toastText()).toContain('Foguinho chegou ao nível 2');
    expect(dialog()?.open ?? false).toBeFalse();
  });

  it('anuncia o acessório desbloqueado junto com o nível', () => {
    pets.choose('dragao', 'Foguinho');
    pets.addXp(350, 'conquista');
    fixture.detectChanges();

    expect(toastText()).toContain('Boné desbloqueado');
  });

  it('mostra uma comemoração de cada vez', () => {
    pets.choose('dragao', 'Foguinho');
    pets.addXp(100, 'atividade');
    fixture.detectChanges();

    const first = toastText();

    element.querySelector<HTMLButtonElement>('.pet-toast__close')?.click();
    fixture.detectChanges();

    expect(toastText()).not.toBe(first);
  });

  it('abre o modal grande quando a mudança é de estágio', () => {
    pets.choose('dragao', 'Foguinho');
    pets.addXp(XP_ATE_JOVEM, 'conquista');
    fixture.detectChanges();

    const modal = dialog();

    expect(modal?.open).withContext('o modal da evolução deveria estar aberto').toBeTrue();
    expect(modal?.textContent).toContain('evoluiu');
    expect(modal?.textContent).toContain('Jovem');
  });

  it('fecha o modal quando a criança continua a aventura', () => {
    pets.choose('dragao', 'Foguinho');
    pets.addXp(XP_ATE_JOVEM, 'conquista');
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.evolution .button')?.click();
    fixture.detectChanges();

    expect(dialog()?.open ?? false).toBeFalse();
  });
});
