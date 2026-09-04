import { ChangeDetectionStrategy, Component, signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MotionPreferenceService } from '../../core/services/motion-preference.service';
import { MotionSceneDirective } from './motion-scene.directive';

@Component({
  selector: 'app-motion-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MotionSceneDirective],
  template: `
    <section appMotionScene="hero">
      <div data-motion="hero-avatar">🦖</div>
      <p data-motion="hero-line">Oi, eu sou o Pedro Henrique</p>
    </section>
  `,
})
class MotionHost {}

describe('MotionSceneDirective', () => {
  let fixture: ComponentFixture<MotionHost>;
  let isMotionAllowed: WritableSignal<boolean>;
  let line: HTMLElement;

  function inlineStyle(): string {
    return line.getAttribute('style') ?? '';
  }

  async function setUp(allowMotion: boolean): Promise<void> {
    isMotionAllowed = signal(allowMotion);

    await TestBed.configureTestingModule({
      imports: [MotionHost],
      providers: [{ provide: MotionPreferenceService, useValue: { isAllowed: isMotionAllowed } }],
    }).compileComponents();

    fixture = TestBed.createComponent(MotionHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    line = fixture.nativeElement.querySelector('[data-motion="hero-line"]');
  }

  it('não toca em nada quando o movimento está desligado', async () => {
    await setUp(false);

    expect(line.textContent).toContain('Pedro Henrique');
    expect(inlineStyle()).toBe('');
  });

  it('monta a cena quando o movimento está liberado', async () => {
    await setUp(true);

    expect(inlineStyle()).not.toBe('');
  });

  it('reverte a cena na hora em que o movimento é desligado', async () => {
    await setUp(true);
    expect(inlineStyle()).not.toBe('');

    isMotionAllowed.set(false);
    await fixture.whenStable();

    expect(inlineStyle()).toBe('');
    expect(line.textContent).toContain('Pedro Henrique');
  });

  it('devolve o elemento ao estado original ao destruir o componente', async () => {
    await setUp(true);

    fixture.destroy();

    expect(inlineStyle()).toBe('');
  });
});
