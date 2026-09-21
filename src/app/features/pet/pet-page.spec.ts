import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PetService } from '../../core/services/pet.service';
import { PetPage } from './pet-page';

const STORAGE_KEY = 'pedro-henrique:pet:v1';

describe('PetPage', () => {
  let fixture: ComponentFixture<PetPage>;
  let element: HTMLElement;
  let pets: PetService;

  async function render(): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [PetPage] }).compileComponents();

    fixture = TestBed.createComponent(PetPage);
    element = fixture.nativeElement;
    pets = TestBed.inject(PetService);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);
    await render();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('abre na escolha do companheiro quando ainda não há mascote', () => {
    expect(element.querySelector('app-pet-onboarding')).not.toBeNull();
    expect(element.querySelector('.pet__hero')).toBeNull();
  });

  it('vira a casa do mascote depois da adoção', () => {
    pets.choose('dragao', 'Foguinho');
    fixture.detectChanges();

    expect(element.querySelector('app-pet-onboarding')).toBeNull();
    expect(element.querySelector('.pet__name')?.textContent?.trim()).toBe('Foguinho');
    expect(element.querySelector('app-pet-status')).not.toBeNull();
    expect(element.querySelector('app-pet-actions')).not.toBeNull();
    expect(element.querySelector('app-pet-accessories')).not.toBeNull();
    expect(element.querySelector('app-pet-achievements')).not.toBeNull();
    expect(element.querySelector('app-pet-collection')).not.toBeNull();
    expect(element.querySelector('app-pet-timeline')).not.toBeNull();
  });

  it('usa um único h1 e liga cada seção ao seu título', () => {
    pets.choose('robo', 'Bip');
    fixture.detectChanges();

    expect(element.querySelectorAll('h1').length).toBe(1);

    for (const section of Array.from(element.querySelectorAll('[aria-labelledby]'))) {
      const titleId = section.getAttribute('aria-labelledby');

      expect(element.querySelector(`#${titleId}`))
        .withContext(`título ausente para aria-labelledby="${titleId}"`)
        .not.toBeNull();
    }
  });

  it('troca o nome do mascote sem sair da página', () => {
    pets.choose('dino', 'Rex');
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.pet__identity .button--ghost')?.click();
    fixture.detectChanges();

    const field = element.querySelector<HTMLInputElement>('#novo-nome');

    if (!field) {
      throw new Error('O campo de novo nome não está na tela.');
    }

    field.value = 'Rexzinho';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element.querySelectorAll<HTMLButtonElement>('.pet__rename-actions .button')[0].click();
    fixture.detectChanges();

    expect(pets.pet()?.name).toBe('Rexzinho');
    expect(element.querySelector('.pet__name')?.textContent?.trim()).toBe('Rexzinho');
  });
});
