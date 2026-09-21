import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { PetStageId, PetTypeId } from '../../../core/models/pet.model';
import { PetAvatar } from './pet-avatar';

describe('PetAvatar', () => {
  let fixture: ComponentFixture<PetAvatar>;
  let element: HTMLElement;

  function render(type: PetTypeId, stage: PetStageId): void {
    fixture.componentRef.setInput('type', type);
    fixture.componentRef.setInput('stage', stage);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PetAvatar] }).compileComponents();
    fixture = TestBed.createComponent(PetAvatar);
    element = fixture.nativeElement;
  });

  it('desenha o mascote do tipo escolhido', () => {
    render('dragao', 'bebe');
    expect(element.querySelector('app-dragon-artwork')).not.toBeNull();

    render('robo', 'bebe');
    expect(element.querySelector('app-robot-artwork')).not.toBeNull();
    expect(element.querySelector('app-dragon-artwork')).toBeNull();

    render('dino', 'bebe');
    expect(element.querySelector('app-dino-artwork')).not.toBeNull();

    render('cachorro', 'bebe');
    expect(element.querySelector('app-dog-artwork')).not.toBeNull();
  });

  it('descreve o desenho para quem usa leitor de tela', () => {
    render('dragao', 'jovem');

    const art = element.querySelector('[role="img"]');

    expect(art?.getAttribute('aria-label')).toBe('Dragão jovem');
  });

  it('prefere a descrição informada por quem usa o componente', () => {
    render('dragao', 'adulto');
    fixture.componentRef.setInput('label', 'Foguinho, o adulto');
    fixture.detectChanges();

    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Foguinho, o adulto',
    );
  });

  it('veste o acessório sobre o desenho', () => {
    render('cachorro', 'adulto');
    fixture.componentRef.setInput('accessoryId', 'bone');
    fixture.detectChanges();

    expect(element.querySelector('.avatar__accessory')?.textContent?.trim()).toBe('🧢');
  });

  it('esconde desenho e acessório quando o que vem ainda é surpresa', () => {
    render('dragao', 'lendario');
    fixture.componentRef.setInput('accessoryId', 'bone');
    fixture.componentRef.setInput('isMystery', true);
    fixture.detectChanges();

    expect(element.querySelector('.avatar__mystery')).not.toBeNull();
    expect(element.querySelector('.avatar__accessory')).toBeNull();
  });

  it('muda a animação conforme o humor, sem trocar o desenho', () => {
    render('dino', 'adulto');
    fixture.componentRef.setInput('mood', 'comemorando');
    fixture.detectChanges();

    expect(element.querySelector('.avatar')?.getAttribute('data-mood')).toBe('comemorando');
    expect(element.querySelector('app-dino-artwork')).not.toBeNull();
  });
});
