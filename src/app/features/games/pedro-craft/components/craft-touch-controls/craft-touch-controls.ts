import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import type { VirtualCraftInput } from '../../engine/input/craft-input';
import type { CraftButtonSize } from '../../models/craft-settings.model';

type HeldButton = 'jump' | 'primary';

/** Parte do raio do analógico que não conta: o polegar descansando não anda sozinho. */
const DEAD_ZONE = 0.15;

/**
 * Controles de toque do PedroCraft.
 *
 * À esquerda, o analógico: o quanto o polegar se afasta do centro é o quanto
 * o herói anda. À direita, botões grandes — pular, quebrar (segurando) e usar
 * (um toque). Olhar em volta é arrastar o dedo em qualquer outro lugar da
 * tela; isso fica com o anfitrião do jogo.
 *
 * Tudo escreve direto no estado compartilhado com o motor, sem passar pelo
 * Angular a cada toque.
 */
@Component({
  selector: 'app-craft-touch-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="stick"
      role="group"
      aria-label="Andar: arraste o dedo para onde quer ir"
      (pointerdown)="pressStick($event)"
      (pointermove)="moveStick($event)"
      (pointerup)="releaseStick()"
      (pointercancel)="releaseStick()"
      (lostpointercapture)="releaseStick()"
    >
      <span class="stick__knob" [style.transform]="knob()"></span>
    </div>

    <div class="buttons">
      <button type="button" class="button button--use" aria-label="Usar ou colocar" (pointerdown)="tapUse($event)">🧱</button>
      <button type="button" class="button button--break" aria-label="Quebrar ou golpear" (pointerdown)="hold($event, 'primary')">⛏️</button>
      <button type="button" class="button button--jump" aria-label="Pular" (pointerdown)="hold($event, 'jump')">⤒</button>
    </div>
  `,
  styleUrl: './craft-touch-controls.scss',
  host: {
    '[attr.data-size]': 'size()',
    '(contextmenu)': '$event.preventDefault()',
  },
})
export class CraftTouchControls {
  readonly state = input.required<VirtualCraftInput>();
  readonly size = input<CraftButtonSize>('normal');

  protected readonly knob = signal('translate(0, 0)');

  protected pressStick(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.moveStick(event);
  }

  protected moveStick(event: PointerEvent): void {
    const target = event.currentTarget;

    if (!(target instanceof HTMLElement) || !target.hasPointerCapture(event.pointerId)) {
      return;
    }

    const area = target.getBoundingClientRect();
    const radius = area.width / 2;
    let offsetX = (event.clientX - (area.left + radius)) / radius;
    let offsetY = (event.clientY - (area.top + area.height / 2)) / radius;
    const length = Math.hypot(offsetX, offsetY);

    if (length > 1) {
      offsetX /= length;
      offsetY /= length;
    }

    const isResting = Math.hypot(offsetX, offsetY) < DEAD_ZONE;
    const state = this.state();

    state.strafe = isResting ? 0 : offsetX;
    state.forward = isResting ? 0 : -offsetY;
    this.knob.set(`translate(${offsetX * 50}%, ${offsetY * 50}%)`);
  }

  protected releaseStick(): void {
    const state = this.state();

    state.strafe = 0;
    state.forward = 0;
    this.knob.set('translate(0, 0)');
  }

  protected tapUse(event: PointerEvent): void {
    event.preventDefault();
    this.state().secondaryTaps += 1;
  }

  /** Segura enquanto o dedo estiver no botão, mesmo que ele escorregue um pouco para fora. */
  protected hold(event: PointerEvent, button: HeldButton): void {
    const target = event.currentTarget;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    target.setPointerCapture(event.pointerId);
    this.state()[button] = true;

    const release = (): void => {
      this.state()[button] = false;
      target.removeEventListener('pointerup', release);
      target.removeEventListener('pointercancel', release);
      target.removeEventListener('lostpointercapture', release);
    };

    target.addEventListener('pointerup', release);
    target.addEventListener('pointercancel', release);
    target.addEventListener('lostpointercapture', release);
  }
}
