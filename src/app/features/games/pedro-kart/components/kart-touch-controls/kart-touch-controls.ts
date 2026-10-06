import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { VirtualDriveState } from '../../models/race-session.model';

type DriveButton = keyof VirtualDriveState;

/**
 * Botões de toque do kart.
 *
 * Esquerda e direita ficam embaixo do polegar esquerdo; item e freio,
 * embaixo do direito. O kart acelera sozinho, então ninguém precisa segurar
 * um botão a corrida inteira.
 */
@Component({
  selector: 'app-kart-touch-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pad pad--steer">
      <button type="button" class="pad__button" aria-label="Virar para a esquerda" (pointerdown)="press($event, 'left')">
        ◀
      </button>
      <button type="button" class="pad__button" aria-label="Virar para a direita" (pointerdown)="press($event, 'right')">
        ▶
      </button>
    </div>
    <div class="pad pad--actions">
      <button type="button" class="pad__button pad__button--item" aria-label="Usar item" (pointerdown)="press($event, 'item')">
        🎁
      </button>
      <button type="button" class="pad__button pad__button--brake" aria-label="Frear" (pointerdown)="press($event, 'brake')">
        🛑
      </button>
    </div>
  `,
  styleUrl: './kart-touch-controls.scss',
  host: { '(contextmenu)': '$event.preventDefault()' },
})
export class KartTouchControls {
  readonly state = input.required<VirtualDriveState>();

  /** Segura enquanto o dedo estiver no botão, mesmo que ele escorregue um pouco para fora. */
  protected press(event: PointerEvent, button: DriveButton): void {
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
