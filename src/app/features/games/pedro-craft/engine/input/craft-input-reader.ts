import { type CraftInputSnapshot, LOOK_RADIANS_PER_PIXEL, type VirtualCraftInput } from './craft-input';
import { PARTNER_KEYS } from './partner-input-reader';

const PARTNER_CODES: ReadonlySet<string> = new Set(Object.values(PARTNER_KEYS));

const FORWARD_KEYS = ['KeyW', 'ArrowUp'] as const;
const BACK_KEYS = ['KeyS', 'ArrowDown'] as const;
const LEFT_KEYS = ['KeyA', 'ArrowLeft'] as const;
const RIGHT_KEYS = ['KeyD', 'ArrowRight'] as const;
const JUMP_KEYS = ['Space'] as const;
const INVENTORY_KEYS = ['KeyE', 'KeyI'] as const;
const PAUSE_KEYS = ['KeyP'] as const;
const HOTBAR_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'] as const;

/** Teclas que o jogo usa e que, sem isso, rolariam a página. */
const SCROLLING_KEYS: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

const PRIMARY_BUTTON = 0;
const SECONDARY_BUTTON = 2;

/** Giro do olhar pedido desde a última leitura, em radianos. */
export interface LookDelta {
  readonly yaw: number;
  readonly pitch: number;
}

/**
 * Entrada do PedroCraft: teclado, mouse com o ponteiro preso ao jogo e toque.
 *
 * No computador, um clique no jogo prende o ponteiro (pointer lock): o mouse
 * passa a girar o olhar e os botões quebram e colocam. O toque escreve no
 * estado virtual. As duas fontes valem ao mesmo tempo.
 *
 * O olhar é lido a cada quadro da tela, e o resto a cada passo da física:
 * girar a câmera no ritmo da tela é o que deixa o olhar macio em 120 Hz.
 */
export class CraftInputReader {
  private readonly pressed = new Set<string>();
  private isCapturing = true;
  private mouseLookX = 0;
  private mouseLookY = 0;
  private isPrimaryMouseHeld = false;
  private secondaryClicks = 0;
  private scroll = 0;
  private hotbarSlot: number | null = null;
  private wasPrimaryHeld = false;
  private wasInventoryHeld = false;
  private wasPauseHeld = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isTyping(event.target)) {
      return;
    }

    this.pressed.add(event.code);

    const slot = HOTBAR_KEYS.indexOf(event.code as (typeof HOTBAR_KEYS)[number]);

    if (slot >= 0) {
      this.hotbarSlot = slot;
    }

    if (this.isCapturing && SCROLLING_KEYS.has(event.code)) {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  /** Trocar de janela com a tecla apertada não pode deixar o herói andando sozinho. */
  private readonly onBlur = (): void => {
    this.pressed.clear();
    this.isPrimaryMouseHeld = false;
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (this.isPointerLocked) {
      this.mouseLookX += event.movementX;
      this.mouseLookY += event.movementY;
    }
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (!this.isPointerLocked) {
      return;
    }

    if (event.button === PRIMARY_BUTTON) {
      this.isPrimaryMouseHeld = true;
    } else if (event.button === SECONDARY_BUTTON) {
      this.secondaryClicks += 1;
    }
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    if (event.button === PRIMARY_BUTTON) {
      this.isPrimaryMouseHeld = false;
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.isPointerLocked) {
      this.scroll += Math.sign(event.deltaY);
    }
  };

  /** Clique no jogo prende o ponteiro; com ele preso, o clique é ação, não pedido. */
  private readonly onCanvasClick = (): void => {
    if (this.isCapturing && !this.isPointerLocked && this.canvas.ownerDocument.pointerLockElement === null) {
      this.requestPointerLock();
    }
  };

  private readonly onContextMenu = (event: Event): void => event.preventDefault();

  /**
   * `sharesKeyboard`: na tela dividida, as setas e o lado direito do teclado
   * são do Jogador 2, e o Jogador 1 fica com o W A S D, o mouse e o E.
   */
  constructor(
    private readonly virtual: VirtualCraftInput,
    private readonly target: Window,
    private readonly canvas: HTMLElement,
    private readonly lookSensitivity: () => number,
    private readonly sharesKeyboard = false,
  ) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
    target.addEventListener('mousemove', this.onMouseMove);
    target.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('wheel', this.onWheel, { passive: true });
    canvas.addEventListener('click', this.onCanvasClick);
    canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  get isPointerLocked(): boolean {
    return this.canvas.ownerDocument.pointerLockElement === this.canvas;
  }

  setCapturing(isCapturing: boolean): void {
    this.isCapturing = isCapturing;

    if (!isCapturing && this.isPointerLocked) {
      this.canvas.ownerDocument.exitPointerLock();
    }
  }

  /** Giro do olhar acumulado (mouse e arrasto de toque), zerado depois da leitura. */
  readLook(): LookDelta {
    const scale = LOOK_RADIANS_PER_PIXEL * this.lookSensitivity();
    const deltaX = this.mouseLookX + this.virtual.lookDeltaX;
    const deltaY = this.mouseLookY + this.virtual.lookDeltaY;

    this.mouseLookX = 0;
    this.mouseLookY = 0;
    this.virtual.lookDeltaX = 0;
    this.virtual.lookDeltaY = 0;

    return { yaw: -deltaX * scale, pitch: -deltaY * scale };
  }

  read(): CraftInputSnapshot {
    const virtual = this.virtual;
    const primaryHeld = this.isPrimaryMouseHeld || virtual.primary;
    const inventoryHeld = this.isDown(INVENTORY_KEYS);
    const pauseHeld = this.isDown(PAUSE_KEYS);
    const keyboardStrafe = Number(this.isDown(RIGHT_KEYS)) - Number(this.isDown(LEFT_KEYS));
    const keyboardForward = Number(this.isDown(FORWARD_KEYS)) - Number(this.isDown(BACK_KEYS));

    const snapshot: CraftInputSnapshot = {
      strafe: clampUnit(keyboardStrafe + virtual.strafe),
      forward: clampUnit(keyboardForward + virtual.forward),
      jumpHeld: virtual.jump || this.isDown(JUMP_KEYS),
      primaryHeld,
      primaryPressed: primaryHeld && !this.wasPrimaryHeld,
      secondaryPressed: this.secondaryClicks + virtual.secondaryTaps > 0,
      hotbarSlot: this.hotbarSlot,
      hotbarScroll: Math.sign(this.scroll),
      inventoryPressed: inventoryHeld && !this.wasInventoryHeld,
      pausePressed: pauseHeld && !this.wasPauseHeld,
    };

    this.wasPrimaryHeld = primaryHeld;
    this.wasInventoryHeld = inventoryHeld;
    this.wasPauseHeld = pauseHeld;
    this.secondaryClicks = 0;
    virtual.secondaryTaps = 0;
    this.scroll = 0;
    this.hotbarSlot = null;

    return snapshot;
  }

  /** Esquece o que estava apertado: ao voltar da pausa, nada dispara sozinho. */
  reset(): void {
    const virtual = this.virtual;

    virtual.strafe = 0;
    virtual.forward = 0;
    virtual.jump = false;
    virtual.primary = false;
    virtual.secondaryTaps = 0;
    virtual.lookDeltaX = 0;
    virtual.lookDeltaY = 0;
    this.pressed.clear();
    this.isPrimaryMouseHeld = false;
    this.secondaryClicks = 0;
    this.scroll = 0;
    this.hotbarSlot = null;
    this.mouseLookX = 0;
    this.mouseLookY = 0;
    this.wasPrimaryHeld = true;
    this.wasInventoryHeld = true;
    this.wasPauseHeld = true;
  }

  dispose(): void {
    this.setCapturing(false);
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.target.removeEventListener('mousemove', this.onMouseMove);
    this.target.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('click', this.onCanvasClick);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  private requestPointerLock(): void {
    // Alguns navegadores devolvem Promise e recusam sem gesto do usuário: o jogo segue com o arrasto.
    const request = this.canvas.requestPointerLock() as Promise<void> | undefined;

    void request?.catch((error: unknown) => console.warn('PedroCraft: o navegador não prendeu o ponteiro.', error));
  }

  private isDown(codes: readonly string[]): boolean {
    return codes.some((code) => this.pressed.has(code) && !(this.sharesKeyboard && PARTNER_CODES.has(code)));
  }
}

function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}
