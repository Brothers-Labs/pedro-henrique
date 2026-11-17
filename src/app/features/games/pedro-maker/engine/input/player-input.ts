import type { VirtualInputState } from '../../models/session.model';
import type { InputSnapshot } from './input-snapshot';

interface KeyMap {
  readonly left: readonly string[];
  readonly right: readonly string[];
  readonly jump: readonly string[];
  readonly run: readonly string[];
  readonly action: readonly string[];
  readonly pause: readonly string[];
}

/** Sozinho, o Jogador 1 usa o teclado todo: setas ou W A S D. */
const WHOLE_KEYBOARD: KeyMap = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['ArrowUp', 'KeyW', 'Space'],
  run: ['ShiftLeft', 'ShiftRight'],
  action: ['KeyE'],
  pause: ['Escape'],
};

/**
 * Jogando junto, o Jogador 1 fica com o lado esquerdo do teclado (A D, W ou
 * espaço, Shift da esquerda e E): as setas são do Jogador 2, como no Pedro Craft.
 */
const LEFT_SIDE: KeyMap = {
  left: ['KeyA'],
  right: ['KeyD'],
  jump: ['KeyW', 'Space'],
  run: ['ShiftLeft'],
  action: ['KeyE'],
  pause: ['Escape'],
};

/** Que parte do teclado é do Jogador 1. */
export type KeyboardShare = 'whole' | 'left-side';

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
  private readonly keys: KeyMap;

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
    share: KeyboardShare = 'whole',
  ) {
    this.keys = share === 'whole' ? WHOLE_KEYBOARD : LEFT_SIDE;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  setCapturing(isCapturing: boolean): void {
    this.isCapturing = isCapturing;
  }

  read(): InputSnapshot {
    const virtual = this.virtual;
    const keys = this.keys;
    const jumpHeld = virtual.jump || this.isDown(keys.jump);
    const actionHeld = virtual.action || this.isDown(keys.action);
    const pauseHeld = this.isDown(keys.pause);

    const snapshot: InputSnapshot = {
      left: virtual.left || this.isDown(keys.left),
      right: virtual.right || this.isDown(keys.right),
      run: virtual.run || this.isDown(keys.run),
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
