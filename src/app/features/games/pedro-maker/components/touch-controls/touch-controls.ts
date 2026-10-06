import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';

import type { VirtualInputState } from '../../models/session.model';
import { MakerSettingsService } from '../../services/maker-settings.service';

type Direction = 'left' | 'right' | null;

/**
 * Parte do direcional, a partir do centro, que já conta como "correr".
 *
 * Empurrar o polegar até a ponta é o gesto natural de quem quer ir mais
 * rápido — e dispensa um terceiro botão numa tela pequena.
 */
const RUN_ZONE = 0.62;

/** Toque curtinho no pulo: a mão sente que o botão pegou, sem olhar. */
const JUMP_VIBRATION_MS = 12;

/**
 * Botões de toque da fase.
 *
 * À esquerda, um direcional só: o lado do polegar decide a direção, então dá
 * para passar de ← para → deslizando, sem levantar o dedo; na ponta, o Pedro
 * corre. À direita, PULAR e AÇÃO, grandes o bastante para uma mão de sete anos
 * acertar sem olhar.
 *
 * Os botões escrevem direto no estado compartilhado com o motor, que o lê a
 * cada passo — nenhum evento passa pelo Angular no meio do caminho.
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

  private readonly settings = inject(MakerSettingsService);

  protected readonly direction = signal<Direction>(null);
  protected readonly isRunning = signal(false);
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
    const middle = pad.left + pad.width / 2;
    const offset = (event.clientX - middle) / (pad.width / 2);
    const direction: Direction = offset < 0 ? 'left' : 'right';

    this.apply(direction, Math.abs(offset) >= RUN_ZONE);
  }

  protected releasePad(): void {
    this.apply(null, false);
  }

  protected pressButton(event: PointerEvent, button: 'jump' | 'action'): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.setButton(button, true);

    if (button === 'jump' && this.settings.settings().vibration && typeof navigator.vibrate === 'function') {
      navigator.vibrate(JUMP_VIBRATION_MS);
    }
  }

  protected releaseButton(button: 'jump' | 'action'): void {
    this.setButton(button, false);
  }

  private apply(direction: Direction, isRunning: boolean): void {
    const state = this.state();
    const running = direction !== null && isRunning;

    state.left = direction === 'left';
    state.right = direction === 'right';
    state.run = running;
    this.direction.set(direction);
    this.isRunning.set(running);
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
