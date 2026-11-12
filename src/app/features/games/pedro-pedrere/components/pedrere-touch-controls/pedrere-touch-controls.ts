import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ControlLayout, ControlState } from '../../models/controls.model';

type ControlButton = keyof ControlState;

/**
 * Botões de toque do Pedro Pedrerê.
 *
 * Cada modo mostra só o que usa: a corrida anda sozinha e só pede o pulo; o
 * pula-pula pula sozinho e só pede o lado. Menos botões, menos confusão.
 */
@Component({
  selector: 'app-pedrere-touch-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pad">
      @if (hasArrows()) {
        <button type="button" class="pad__button" aria-label="Andar para a esquerda" (pointerdown)="press($event, 'left')">
          ◀
        </button>
        <button type="button" class="pad__button" aria-label="Andar para a direita" (pointerdown)="press($event, 'right')">
          ▶
        </button>
      }
    </div>
    <div class="pad">
      @if (hasJump()) {
        <button type="button" class="pad__button pad__button--jump" aria-label="Pular" (pointerdown)="press($event, 'jump')">
          ⤒
        </button>
      }
    </div>
  `,
  styleUrl: './pedrere-touch-controls.scss',
  host: { '(contextmenu)': '$event.preventDefault()' },
})
export class PedrereTouchControls {
  readonly state = input.required<ControlState>();
  readonly layout = input.required<ControlLayout>();

  protected readonly hasArrows = computed(() => this.layout() !== 'corrida');
  protected readonly hasJump = computed(() => this.layout() !== 'pula-pula');

  /** Segura enquanto o dedo estiver no botão, mesmo que ele escorregue um pouco para fora. */
  protected press(event: PointerEvent, button: ControlButton): void {
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
