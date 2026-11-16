import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PRESET_EFFECTS } from '../../data/tube-effects.data';
import type { TubeScene } from '../../models/tube.model';
import { ScenePlayer } from './scene-player';

const SCENES: readonly TubeScene[] = [
  { emoji: '🦖', text: 'Primeira', background: '#12b886', motion: 'pular', seconds: 2 },
  { emoji: '🚀', text: 'Segunda', background: '#2a2350', motion: 'girar', seconds: 3 },
];

describe('ScenePlayer', () => {
  let fixture: ComponentFixture<ScenePlayer>;
  let element: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(ScenePlayer);
    fixture.componentRef.setInput('scenes', SCENES);
    fixture.componentRef.setInput('effect', PRESET_EFFECTS.find((effect) => effect.id === 'festa'));
    fixture.componentRef.setInput('autoplay', false);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => fixture.destroy());

  function playButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('.player__play')!;
  }

  it('mostra a primeira cena com o efeito do vídeo por cima', () => {
    expect(element.querySelector('app-effect-stage')?.getAttribute('data-effect')).toBe('festa');
    expect(element.querySelector('app-scene-view')?.getAttribute('data-scene')).toBe('1');
    expect(element.textContent).toContain('Primeira');
    expect(element.querySelector('.stage__sticker')?.textContent).toContain('🎂');
    expect(element.querySelectorAll('.stage__particle').length).toBeGreaterThan(0);
    expect(element.querySelector('.player__time')?.textContent).toBe('0:00 / 0:05');
  });

  it('a barra de posição pula para a cena seguinte', () => {
    const progress = element.querySelector<HTMLInputElement>('.player__progress')!;

    progress.value = '2.5';
    progress.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.querySelector('app-scene-view')?.getAttribute('data-scene')).toBe('2');
    expect(element.textContent).toContain('Segunda');
  });

  it('o botão alterna entre tocar e pausar', () => {
    expect(playButton().getAttribute('aria-label')).toBe('Tocar');

    playButton().click();
    fixture.detectChanges();
    expect(playButton().getAttribute('aria-label')).toBe('Pausar');
    expect(element.querySelector('app-scene-view')?.getAttribute('data-motion')).toBe('pular');

    playButton().click();
    fixture.detectChanges();
    expect(playButton().getAttribute('aria-label')).toBe('Tocar');
    expect(element.querySelector('app-scene-view')?.getAttribute('data-motion')).withContext('pausado, o desenho para').toBe('parado');
  });

  it('o relógio anda com o tempo real e avisa quando acaba', () => {
    let now = 1000;
    let ended = false;

    spyOn(performance, 'now').and.callFake(() => now);
    jasmine.clock().install();
    fixture.componentInstance.ended.subscribe(() => (ended = true));

    try {
      playButton().click();
      now += 2500;
      jasmine.clock().tick(100);
      fixture.detectChanges();
      expect(element.querySelector('app-scene-view')?.getAttribute('data-scene')).toBe('2');

      now += 3000;
      jasmine.clock().tick(100);
      fixture.detectChanges();
      expect(ended).toBeTrue();
      expect(playButton().getAttribute('aria-label')).toBe('Tocar');
      expect(element.querySelector('.player__time')?.textContent).toBe('0:05 / 0:05');
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
