import { type CraftInputSnapshot, IDLE_CRAFT_INPUT } from './craft-input';
import type { LookDelta } from './craft-input-reader';

/**
 * Teclas do Jogador 2 no lado direito do teclado: as setas andam, I J K L
 * olham, Enter pula, U quebra, O usa, N e M trocam o espaço da barra e H abre
 * a mochila. A mão esquerda fica no I J K L U O, a direita nas setas.
 */
export const PARTNER_KEYS = {
  forward: 'ArrowUp',
  back: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  lookLeft: 'KeyJ',
  lookRight: 'KeyL',
  lookUp: 'KeyI',
  lookDown: 'KeyK',
  jump: 'Enter',
  primary: 'KeyU',
  secondary: 'KeyO',
  previousSlot: 'KeyN',
  nextSlot: 'KeyM',
  inventory: 'KeyH',
} as const;

const PARTNER_CODES: ReadonlySet<string> = new Set(Object.values(PARTNER_KEYS));

/** Botões do controle no mapa padrão do navegador (Xbox: A, X, Y, LB, RB, LT, RT, Start). */
const PAD = { jump: 0, secondaryAlt: 2, inventory: 3, previousSlot: 4, nextSlot: 5, secondary: 6, primary: 7, pause: 9 } as const;

/** Analógico com folga no meio: controle velho não anda sozinho. */
const DEAD_ZONE = 0.2;
/** Giro do olhar com o analógico todo empurrado, ou com a tecla de olhar segurada, em radianos por segundo. */
const LOOK_SPEED = 2.6;
/** Botão do gatilho conta como apertado a partir daqui. */
const TRIGGER_PRESSED = 0.4;

type GamepadSource = () => readonly (Gamepad | null)[];

/** Qual controle este jogador usa e se o lado direito do teclado também é dele. */
export interface PartnerSeat {
  /**
   * 0 é o primeiro controle ligado (o do Jogador 2), 1 é o segundo (o do
   * Jogador 3). Conta só os controles ligados, na ordem do navegador: um
   * controle que desligou não empurra o outro para a vez errada.
   */
  readonly padSlot: number;
  /** O lado direito do teclado: só o Jogador 2 usa, o Jogador 3 é só controle. */
  readonly usesKeyboard: boolean;
}

/** O Jogador 2: o primeiro controle e o lado direito do teclado. */
export const PARTNER_SEAT: PartnerSeat = { padSlot: 0, usesKeyboard: true };

/**
 * O Jogador 3: o segundo controle, e só ele. O teclado já está todo
 * repartido (W A S D do Jogador 1, setas e I J K L do Jogador 2), e um
 * terceiro grupo de teclas espremeria três crianças em cima de um teclado só.
 */
export const THIRD_SEAT: PartnerSeat = { padSlot: 1, usesKeyboard: false };

/**
 * Entrada do Jogador 2 (ou do 3) na tela dividida: um controle de videogame
 * ligado no computador e, junto, o lado direito do teclado. As duas fontes
 * valem ao mesmo tempo, como o teclado e o toque do Jogador 1. O Jogador 3
 * lê só o segundo controle (veja `THIRD_SEAT`).
 *
 * O olhar gira por tempo, e não por pixel: o analógico e as teclas I J K L
 * dizem "gire para lá", e quanto mais tempo seguram, mais gira.
 */
export class PartnerInputReader {
  private readonly pressed = new Set<string>();
  private isCapturing = true;
  private wasPrimaryHeld = false;
  private wasSecondaryHeld = false;
  private wasInventoryHeld = false;
  private wasPauseHeld = false;
  private wasPreviousHeld = false;
  private wasNextHeld = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!PARTNER_CODES.has(event.code) || isTyping(event.target)) {
      return;
    }

    this.pressed.add(event.code);

    if (this.isCapturing) {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly onBlur = (): void => this.pressed.clear();

  constructor(
    private readonly target: Window,
    private readonly lookSensitivity: () => number,
    private readonly gamepads: GamepadSource = () => (typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []),
    private readonly seat: PartnerSeat = PARTNER_SEAT,
  ) {
    // Sem teclado, nem escuta: as teclas do Jogador 2 não podem mexer o Jogador 3.
    if (seat.usesKeyboard) {
      target.addEventListener('keydown', this.onKeyDown);
      target.addEventListener('keyup', this.onKeyUp);
      target.addEventListener('blur', this.onBlur);
    }
  }

  setCapturing(isCapturing: boolean): void {
    this.isCapturing = isCapturing;
  }

  /** Giro do olhar deste quadro, que durou `frameMs`. */
  readLook(frameMs: number): LookDelta {
    const pad = this.pad();
    const keyYaw = Number(this.isDown(PARTNER_KEYS.lookLeft)) - Number(this.isDown(PARTNER_KEYS.lookRight));
    const keyPitch = Number(this.isDown(PARTNER_KEYS.lookUp)) - Number(this.isDown(PARTNER_KEYS.lookDown));
    const padYaw = -axis(pad, 2);
    const padPitch = -axis(pad, 3);
    const turn = LOOK_SPEED * this.lookSensitivity() * (frameMs / 1000);

    return { yaw: clampUnit(keyYaw + padYaw) * turn, pitch: clampUnit(keyPitch + padPitch) * turn };
  }

  read(): CraftInputSnapshot {
    if (!this.isCapturing) {
      return IDLE_CRAFT_INPUT;
    }

    const pad = this.pad();
    const primaryHeld = this.isDown(PARTNER_KEYS.primary) || isPressed(pad, PAD.primary);
    const secondaryHeld = this.isDown(PARTNER_KEYS.secondary) || isPressed(pad, PAD.secondary) || isPressed(pad, PAD.secondaryAlt);
    const inventoryHeld = this.isDown(PARTNER_KEYS.inventory) || isPressed(pad, PAD.inventory);
    const pauseHeld = isPressed(pad, PAD.pause);
    const previousHeld = this.isDown(PARTNER_KEYS.previousSlot) || isPressed(pad, PAD.previousSlot);
    const nextHeld = this.isDown(PARTNER_KEYS.nextSlot) || isPressed(pad, PAD.nextSlot);
    const keyStrafe = Number(this.isDown(PARTNER_KEYS.right)) - Number(this.isDown(PARTNER_KEYS.left));
    const keyForward = Number(this.isDown(PARTNER_KEYS.forward)) - Number(this.isDown(PARTNER_KEYS.back));
    const scroll = Number(nextHeld && !this.wasNextHeld) - Number(previousHeld && !this.wasPreviousHeld);

    const snapshot: CraftInputSnapshot = {
      strafe: clampUnit(keyStrafe + axis(pad, 0)),
      forward: clampUnit(keyForward - axis(pad, 1)),
      jumpHeld: this.isDown(PARTNER_KEYS.jump) || isPressed(pad, PAD.jump),
      primaryHeld,
      primaryPressed: primaryHeld && !this.wasPrimaryHeld,
      secondaryPressed: secondaryHeld && !this.wasSecondaryHeld,
      hotbarSlot: null,
      hotbarScroll: scroll,
      inventoryPressed: inventoryHeld && !this.wasInventoryHeld,
      pausePressed: pauseHeld && !this.wasPauseHeld,
    };

    this.wasPrimaryHeld = primaryHeld;
    this.wasSecondaryHeld = secondaryHeld;
    this.wasInventoryHeld = inventoryHeld;
    this.wasPauseHeld = pauseHeld;
    this.wasPreviousHeld = previousHeld;
    this.wasNextHeld = nextHeld;

    return snapshot;
  }

  /** Esquece o que estava apertado: ao voltar da pausa, nada dispara sozinho. */
  reset(): void {
    this.pressed.clear();
    const pad = this.pad();

    // Botões segurados durante a pausa só contam de novo depois de soltos.
    this.wasPrimaryHeld = isPressed(pad, PAD.primary);
    this.wasSecondaryHeld = isPressed(pad, PAD.secondary) || isPressed(pad, PAD.secondaryAlt);
    this.wasInventoryHeld = isPressed(pad, PAD.inventory);
    this.wasPauseHeld = isPressed(pad, PAD.pause);
    this.wasPreviousHeld = isPressed(pad, PAD.previousSlot);
    this.wasNextHeld = isPressed(pad, PAD.nextSlot);
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
  }

  /** O primeiro controle ligado é o do Jogador 2; o segundo, o do Jogador 3. */
  private pad(): Gamepad | null {
    return this.gamepads().filter((pad): pad is Gamepad => pad !== null && pad.connected)[this.seat.padSlot] ?? null;
  }

  private isDown(code: string): boolean {
    return this.pressed.has(code);
  }
}

function axis(pad: Gamepad | null, index: number): number {
  const value = pad?.axes[index] ?? 0;

  return Math.abs(value) < DEAD_ZONE ? 0 : value;
}

function isPressed(pad: Gamepad | null, index: number): boolean {
  const button = pad?.buttons[index];

  return button ? button.pressed || button.value > TRIGGER_PRESSED : false;
}

function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}
