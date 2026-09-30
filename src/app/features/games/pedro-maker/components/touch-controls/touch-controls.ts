import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import type { VirtualInputState } from '../../models/session.model';

type Direction = 'left' | 'right' | null;

/**
 * Botões de toque da fase.
 *
 * À esquerda, um direcional só: o lado do polegar decide a direção, então dá
 * para passar de ← para → deslizando, sem levantar o dedo. À direita, PULAR e
 * AÇÃO, grandes o bastante para uma mão de sete anos acertar sem olhar.
 *
 * Os botões escrevem direto no estado compartilhado com o motor, que o lê a
 * cada quadro — nenhum evento passa pelo Angular no meio do caminho.
 */
@Component({
  selector: 'app-touch-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './touch-controls.html',
  styleUrl: './touch-controls.scss',
  host: { '(contextmenu)': '$event.preventDefault()' },
})
export class TouchControls {
  readonly state = input.required<VirtualInputState>();

  protected readonly direction = signal<Direction>(null);
  protected readonly isJumpPressed = signal(false);
  protected readonly isActionPressed = signal(false);

  protected pressPad(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.steer(event);
  }

  protected steer(event: PointerEvent): void {
    if (event.buttons === 0 && event.pointerType === 'mouse') {
      return;
    }

    const pad = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const direction: Direction = event.clientX < pad.left + pad.width / 2 ? 'left' : 'right';

    if (direction !== this.direction()) {
      this.applyDirection(direction);
    }
  }

  protected releasePad(): void {
    this.applyDirection(null);
  }

  protected pressButton(event: PointerEvent, button: 'jump' | 'action'): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.setButton(button, true);
  }

  protected releaseButton(button: 'jump' | 'action'): void {
    this.setButton(button, false);
  }

  private applyDirection(direction: Direction): void {
    const state = this.state();

    state.left = direction === 'left';
    state.right = direction === 'right';
    this.direction.set(direction);
  }

  private setButton(button: 'jump' | 'action', isPressed: boolean): void {
    const state = this.state();

    if (button === 'jump') {
      state.jump = isPressed;
      this.isJumpPressed.set(isPressed);
    } else {
      state.action = isPressed;
      this.isActionPressed.set(isPressed);
    }
  }
}
