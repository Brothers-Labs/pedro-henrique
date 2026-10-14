import type { VirtualRunState } from '../models/run-session.model';
import type { RunInput } from '../simulation/runner';

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyK']);
const DASH_KEYS = new Set(['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyJ', 'ArrowDown']);
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);
/** Teclas que rolariam a página no meio da fase. */
const SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

/**
 * Junta teclado e botões de toque num comando só.
 *
 * Pulo e raio valem uma vez por toque: segurar o botão não pula de novo
 * assim que o Pedro encosta no chão, nem gasta duas cargas de energia.
 */
export class RunControls {
  private readonly held = new Set<string>();
  private wasJumpHeld = false;
  private wasDashHeld = false;
  private pauseRequested = false;
  private isCapturing = false;

  constructor(
    private readonly virtual: VirtualRunState,
    private readonly target: Window,
  ) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  setCapturing(isCapturing: boolean): void {
    this.isCapturing = isCapturing;

    if (!isCapturing) {
      this.held.clear();
    }
  }

  /** Lido uma vez por passo da física. */
  read(): RunInput {
    const left = this.virtual.left || this.isHeld(LEFT_KEYS);
    const right = this.virtual.right || this.isHeld(RIGHT_KEYS);
    const isJumpHeld = this.virtual.jump || this.isHeld(JUMP_KEYS);
    const isDashHeld = this.virtual.dash || this.isHeld(DASH_KEYS);
    const input: RunInput = {
      steer: (right ? 1 : 0) - (left ? 1 : 0),
      jump: isJumpHeld && !this.wasJumpHeld,
      dash: isDashHeld && !this.wasDashHeld,
    };

    this.wasJumpHeld = isJumpHeld;
    this.wasDashHeld = isDashHeld;

    return input;
  }

  /** Verdadeiro uma vez por pedido de pausa feito no teclado. */
  consumePauseRequest(): boolean {
    const requested = this.pauseRequested;

    this.pauseRequested = false;

    return requested;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
  }

  private isHeld(keys: ReadonlySet<string>): boolean {
    for (const key of keys) {
      if (this.held.has(key)) {
        return true;
      }
    }

    return false;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.isCapturing || isTyping(event.target)) {
      return;
    }

    if (SCROLL_KEYS.has(event.code)) {
      event.preventDefault();
    }

    if (PAUSE_KEYS.has(event.code) && !event.repeat) {
      this.pauseRequested = true;
    }

    this.held.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.held.clear();
  };
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}
