import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { PetAdoption } from './pet-onboarding';
import { PetOnboarding } from './pet-onboarding';

describe('PetOnboarding', () => {
  let fixture: ComponentFixture<PetOnboarding>;
  let element: HTMLElement;

  function chooseFirstPet(): void {
    element.querySelectorAll<HTMLButtonElement>('.choice .button')[0].click();
    fixture.detectChanges();
  }

  function nameField(): HTMLInputElement {
    const field = element.querySelector<HTMLInputElement>('#nome-do-mascote');

    if (!field) {
      throw new Error('O campo de nome não está na tela.');
    }

    return field;
  }

  function typeName(value: string): void {
    const field = nameField();
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function confirmButton(): HTMLButtonElement {
    return element.querySelectorAll<HTMLButtonElement>('.naming__actions .button')[0];
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PetOnboarding] }).compileComponents();
    fixture = TestBed.createComponent(PetOnboarding);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('abre com os quatro companheiros possíveis', () => {
    expect(element.querySelectorAll('.choice').length).toBe(4);
  });

  it('leva à etapa do nome depois da escolha', () => {
    chooseFirstPet();

    expect(element.querySelector('#nome-do-mascote')).not.toBeNull();
    expect(element.querySelectorAll('.choice').length).toBe(0);
  });

  it('só libera o começo da aventura depois de um nome de verdade', () => {
    chooseFirstPet();

    expect(confirmButton().disabled).toBeTrue();

    typeName('   ');
    expect(confirmButton().disabled).toBeTrue();

    typeName('Foguinho');
    expect(confirmButton().disabled).toBeFalse();
  });

  it('anuncia a dupla antes de confirmar', () => {
    chooseFirstPet();
    typeName('Foguinho');

    expect(element.querySelector('.naming__preview')?.textContent).toContain(
      'Foguinho agora são uma equipe!',
    );
  });

  it('entrega o tipo e o nome escolhidos', () => {
    const adoptions: PetAdoption[] = [];
    fixture.componentInstance.chosen.subscribe((value) => adoptions.push(value));

    chooseFirstPet();
    typeName('  Foguinho  ');
    confirmButton().click();

    expect(adoptions).toEqual([{ type: 'dragao', name: 'Foguinho' }]);
  });

  it('deixa voltar e escolher outro companheiro', () => {
    chooseFirstPet();
    element.querySelectorAll<HTMLButtonElement>('.naming__actions .button')[1].click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.choice').length).toBe(4);
  });
});
