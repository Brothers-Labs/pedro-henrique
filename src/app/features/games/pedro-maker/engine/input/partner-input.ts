import { IDLE_INPUT, type InputSnapshot } from './input-snapshot';

/**
 * Teclas do Jogador 2 no lado direito do teclado: as setas andam e pulam, o
 * Shift da direita corre e o Enter é o botão de ação. O Jogador 1 fica com
 * A, D, W e o espaço, do outro lado.
 */
export const PARTNER_KEYS = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  jump: 'ArrowUp',
  run: 'ShiftRight',
  action: 'Enter',
} as const;

const PARTNER_CODES: ReadonlySet<string> = new Set(Object.values(PARTNER_KEYS));

/** Botões do controle no mapa padrão do navegador (Xbox: A, B, X, Y, Start e o direcional). */
const PAD = { jump: 0, jumpAlt: 1, run: 2, action: 3, pause: 9, left: 14, right: 15 } as const;

/** Analógico com folga no meio: controle velho não anda sozinho. */
const DEAD_ZONE = 0.3;
/** Analógico empurrado até quase a ponta corre, como o direcional de toque do Jogador 1. */
const RUN_TILT = 0.85;
/** Botão analógico conta como apertado a partir daqui. */
const BUTTON_PRESSED = 0.4;

type GamepadSource = () => readonly (Gamepad | null)[];

/** Qual controle este jogador usa e se o lado direito do teclado também é dele. */
export interface PartnerSeat {
  /**
   * 0 é o primeiro controle ligado (o do Jogador 2), 1 é o segundo (o do
   * Jogador 3). Conta só os controles ligados: um controle que desligou não
   * empurra o outro para a vez errada.
   */
  readonly padSlot: number;
  /** O lado direito do teclado: só o Jogador 2 usa, o Jogador 3 é só controle. */
  readonly usesKeyboard: boolean;
}

/** O Jogador 2: o primeiro controle e as setas do teclado. */
export const PARTNER_SEAT: PartnerSeat = { padSlot: 0, usesKeyboard: true };

/** O Jogador 3: o segundo controle, e só ele — o teclado já está dividido entre os outros dois. */
export const THIRD_SEAT: PartnerSeat = { padSlot: 1, usesKeyboard: false };

/** Os lugares na ordem dos jogadores: o índice 0 é o Jogador 2. */
export const PARTNER_SEATS: readonly PartnerSeat[] = [PARTNER_SEAT, THIRD_SEAT];

/**
 * Entrada do Jogador 2 (ou do 3) no Pedro Maker em turma: um controle de
 * videogame e, para o Jogador 2, as setas do teclado. As duas fontes valem ao
 * mesmo tempo. O "apertou agora" é calculado aqui, uma vez por passo, como na
 * entrada do Jogador 1.
 */
export class PartnerInput {
  private readonly pressed = new Set<string>();
  private isCapturing = true;
  private wasJumpHeld = false;
  private wasActionHeld = false;
  private wasPauseHeld = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!PARTNER_CODES.has(event.code) || isTyping(event.target)) {
      return;
    }

    this.pressed.add(event.code);

    // Com o jogo pausado, as setas e o Enter voltam a servir aos botões do menu.
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
    private readonly seat: PartnerSeat = PARTNER_SEAT,
    private readonly gamepads: GamepadSource = () => (typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []),
  ) {
    // Sem teclado, nem escuta: as setas do Jogador 2 não podem mexer o Jogador 3.
    if (seat.usesKeyboard) {
      target.addEventListener('keydown', this.onKeyDown);
      target.addEventListener('keyup', this.onKeyUp);
      target.addEventListener('blur', this.onBlur);
    }
  }

  setCapturing(isCapturing: boolean): void {
    this.isCapturing = isCapturing;
  }

  read(): InputSnapshot {
    if (!this.isCapturing) {
      return IDLE_INPUT;
    }

    const pad = this.pad();
    const stick = axis(pad, 0);
    const jumpHeld = this.isDown(PARTNER_KEYS.jump) || isPressed(pad, PAD.jump) || isPressed(pad, PAD.jumpAlt);
    const actionHeld = this.isDown(PARTNER_KEYS.action) || isPressed(pad, PAD.action);
    const pauseHeld = isPressed(pad, PAD.pause);

    const snapshot: InputSnapshot = {
      left: this.isDown(PARTNER_KEYS.left) || isPressed(pad, PAD.left) || stick < 0,
      right: this.isDown(PARTNER_KEYS.right) || isPressed(pad, PAD.right) || stick > 0,
      run: this.isDown(PARTNER_KEYS.run) || isPressed(pad, PAD.run) || Math.abs(stick) >= RUN_TILT,
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
    this.pressed.clear();
    // Botões segurados durante a pausa só contam de novo depois de soltos.
    this.wasJumpHeld = true;
    this.wasActionHeld = true;
    this.wasPauseHeld = true;
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

  return button ? button.pressed || button.value > BUTTON_PRESSED : false;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}
