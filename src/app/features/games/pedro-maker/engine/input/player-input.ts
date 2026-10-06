import type { VirtualInputState } from '../../models/session.model';
import type { InputSnapshot } from './input-snapshot';

const LEFT_KEYS = ['ArrowLeft', 'KeyA'] as const;
const RIGHT_KEYS = ['ArrowRight', 'KeyD'] as const;
const JUMP_KEYS = ['ArrowUp', 'KeyW', 'Space'] as const;
const RUN_KEYS = ['ShiftLeft', 'ShiftRight'] as const;
const ACTION_KEYS = ['KeyE'] as const;
const PAUSE_KEYS = ['Escape'] as const;

/** Teclas que o jogo usa e que, sem isso, rolariam a página. */
const SCROLLING_KEYS: ReadonlySet<string> = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

/**
 * Entrada do jogador.
 *
 * Teclado e botões de toque valem ao mesmo tempo: quem joga no notebook com
 * tela de toque pode usar os dois. O "apertou agora" é calculado aqui, uma vez
 * por passo, para que nenhuma outra parte do jogo precise lembrar do passo
 * anterior.
 */
export class PlayerInput {
  private readonly pressed = new Set<string>();
  private isCapturing = true;
  private wasJumpHeld = false;
  private wasActionHeld = false;
  private wasPauseHeld = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isTyping(event.target)) {
      return;
    }

    this.pressed.add(event.code);

    // Com o jogo pausado, espaço e setas voltam a servir aos botões do menu.
    if (this.isCapturing && SCROLLING_KEYS.has(event.code)) {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  /** Trocar de janela com a tecla apertada não pode deixar o Pedro andando sozinho. */
  private readonly onBlur = (): void => {
    this.pressed.clear();
  };

  constructor(
    private readonly virtual: VirtualInputState,
    private readonly target: Window,
  ) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  setCapturing(isCapturing: boolean): void {
    this.isCapturing = isCapturing;
  }

  read(): InputSnapshot {
    const virtual = this.virtual;
    const jumpHeld = virtual.jump || this.isDown(JUMP_KEYS);
    const actionHeld = virtual.action || this.isDown(ACTION_KEYS);
    const pauseHeld = this.isDown(PAUSE_KEYS);

    const snapshot: InputSnapshot = {
      left: virtual.left || this.isDown(LEFT_KEYS),
      right: virtual.right || this.isDown(RIGHT_KEYS),
      run: virtual.run || this.isDown(RUN_KEYS),
      jumpHeld,
      jumpPressed: jumpHeld && !this.wasJumpHeld,
      actionPressed: actionHeld && !this.wasActionHeld,
      pausePressed: pauseHeld && !this.wasPauseHeld,
    };

    this.wasJumpHeld = jumpHeld;
    this.wasActionHeld = actionHeld;
    this.wasPauseHeld = pauseHeld;

    return snapshot;
  }

  /** Esquece o que estava apertado: ao voltar da pausa, nada dispara sozinho. */
  reset(): void {
    this.virtual.left = false;
    this.virtual.right = false;
    this.virtual.run = false;
    this.virtual.jump = false;
    this.virtual.action = false;
    this.pressed.clear();
    this.wasJumpHeld = true;
    this.wasActionHeld = true;
    this.wasPauseHeld = true;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
  }

  private isDown(codes: readonly string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}
