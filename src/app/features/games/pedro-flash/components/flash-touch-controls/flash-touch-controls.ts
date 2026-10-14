import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { VirtualRunState } from '../../models/run-session.model';

type RunButton = keyof VirtualRunState;

/**
 * Botões de toque do Pedro Flash.
 *
 * Esquerda e direita embaixo do polegar esquerdo; pulo, o maior de todos, e
 * o raio embaixo do direito. O Pedro corre sozinho, então ninguém precisa
 * segurar um botão a fase inteira. O raio acende quando há energia.
 */
@Component({
  selector: 'app-flash-touch-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pad pad--steer">
      <button type="button" class="pad__button" aria-label="Ir para a esquerda" (pointerdown)="press($event, 'left')">◀</button>
      <button type="button" class="pad__button" aria-label="Ir para a direita" (pointerdown)="press($event, 'right')">▶</button>
    </div>
    <div class="pad pad--actions">
      <button
        type="button"
        class="pad__button pad__button--dash"
        [class.pad__button--ready]="canDash()"
        aria-label="Modo relâmpago"
        (pointerdown)="press($event, 'dash')"
      >
        ⚡
      </button>
      <button type="button" class="pad__button pad__button--jump" aria-label="Pular" (pointerdown)="press($event, 'jump')">⤒</button>
    </div>
  `,
  styleUrls: ['../../../pedro-kart/components/kart-touch-controls/kart-touch-controls.scss', './flash-touch-controls.scss'],
  host: { '(contextmenu)': '$event.preventDefault()' },
})
export class FlashTouchControls {
  readonly state = input.required<VirtualRunState>();
  readonly canDash = input(false);

  /** Segura enquanto o dedo estiver no botão, mesmo que ele escorregue um pouco para fora. */
  protected press(event: PointerEvent, button: RunButton): void {
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
