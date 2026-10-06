import type { VirtualDriveState } from '../models/race-session.model';
import type { DriveInput } from '../simulation/kart';

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const BRAKE_KEYS = new Set(['ArrowDown', 'KeyS']);
const ITEM_KEYS = new Set(['Space', 'KeyE', 'ArrowUp', 'KeyW']);
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);
/** Teclas que rolariam a página no meio da corrida. */
const SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

/**
 * Junta teclado e botões de toque num volante só.
 *
 * O item só sai uma vez por toque — segurar o botão não gasta a próxima
 * caixa no mesmo instante em que ela é pega.
 */
export class DriveControls {
  private readonly held = new Set<string>();
  private wasItemHeld = false;
  private pauseRequested = false;
  private isCapturing = false;

  constructor(
    private readonly virtual: VirtualDriveState,
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

  read(): DriveInput {
    const left = this.virtual.left || this.isHeld(LEFT_KEYS);
    const right = this.virtual.right || this.isHeld(RIGHT_KEYS);
    const isItemHeld = this.virtual.item || this.isHeld(ITEM_KEYS);
    const useItem = isItemHeld && !this.wasItemHeld;

    this.wasItemHeld = isItemHeld;

    return {
      steer: (right ? 1 : 0) - (left ? 1 : 0),
      brake: this.virtual.brake || this.isHeld(BRAKE_KEYS),
      useItem,
    };
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
