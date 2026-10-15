import { NO_COMMANDS, type RunCommands } from '../simulation/run-simulation';

export type RunCommand = keyof RunCommands;

/** Deslize mínimo, em pixels, para o gesto valer como comando. */
const SWIPE_THRESHOLD_PX = 32;
/** Inclinação do analógico que conta como "apertado". */
const STICK_THRESHOLD = 0.55;

const KEY_COMMANDS: Readonly<Record<string, RunCommand>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ArrowDown: 'slide',
  KeyS: 'slide',
  KeyE: 'attack',
  KeyF: 'attack',
};

const PAUSE_KEYS = new Set(['Escape', 'KeyP']);

/** Botões do controle padrão (Xbox/PlayStation) no layout "standard" do navegador. */
const GAMEPAD_BUTTONS: Readonly<Record<number, RunCommand | 'pause'>> = {
  0: 'jump',
  1: 'slide',
  2: 'attack',
  9: 'pause',
  12: 'jump',
  13: 'slide',
  14: 'left',
  15: 'right',
};

/**
 * Junta tudo o que comanda o Pedro num único pacote por passo.
 *
 * Cada fonte só anota o toque; `consume` entrega o pacote e o zera. Segurar
 * uma tecla não repete o comando: a criança troca de faixa uma vez por toque.
 */
export class RunInput {
  private pending: Record<RunCommand, boolean> = { ...NO_COMMANDS };
  private isPauseRequested = false;
  private isEnabled = true;
  private swipeStart: { x: number; y: number } | null = null;
  private readonly gamepadPressed = new Set<string>();

  constructor(
    private readonly keyTarget: Window,
    private readonly surface: HTMLElement,
  ) {
    keyTarget.addEventListener('keydown', this.handleKeyDown);
    surface.addEventListener('pointerdown', this.handlePointerDown);
    surface.addEventListener('pointerup', this.handlePointerUp);
  }

  /** Durante pausa e telas de resultado nada é anotado. */
  setEnabled(isEnabled: boolean): void {
    this.isEnabled = isEnabled;
    this.pending = { ...NO_COMMANDS };
  }

  /** Botões da tela de toque. */
  press(command: RunCommand): void {
    if (this.isEnabled) {
      this.pending[command] = true;
    }
  }

  consume(): RunCommands {
    this.pollGamepads();

    const commands = this.pending;

    this.pending = { ...NO_COMMANDS };

    return commands;
  }

  consumePauseRequest(): boolean {
    this.pollGamepads();

    const isRequested = this.isPauseRequested;

    this.isPauseRequested = false;

    return isRequested;
  }

  dispose(): void {
    this.keyTarget.removeEventListener('keydown', this.handleKeyDown);
    this.surface.removeEventListener('pointerdown', this.handlePointerDown);
    this.surface.removeEventListener('pointerup', this.handlePointerUp);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (PAUSE_KEYS.has(event.code)) {
      this.isPauseRequested = this.isEnabled;
      return;
    }

    const command = KEY_COMMANDS[event.code];

    if (command && this.isEnabled) {
      // Espaço e setas rolariam a página por baixo do jogo.
      event.preventDefault();
      this.pending[command] = true;
    }
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.swipeStart = { x: event.clientX, y: event.clientY };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const start = this.swipeStart;

    this.swipeStart = null;

    if (!start || !this.isEnabled) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) {
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.pending[dx < 0 ? 'left' : 'right'] = true;
    } else {
      this.pending[dy < 0 ? 'jump' : 'slide'] = true;
    }
  };

  /** Lê o controle a cada passo e transforma "acabou de apertar" em comando. */
  private pollGamepads(): void {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return;
    }

    for (const pad of navigator.getGamepads()) {
      if (!pad) {
        continue;
      }

      for (const [index, command] of Object.entries(GAMEPAD_BUTTONS)) {
        this.edge(`${pad.index}:b${index}`, pad.buttons[Number(index)]?.pressed ?? false, command);
      }

      const horizontal = pad.axes[0] ?? 0;

      this.edge(`${pad.index}:left`, horizontal < -STICK_THRESHOLD, 'left');
      this.edge(`${pad.index}:right`, horizontal > STICK_THRESHOLD, 'right');
    }
  }

  private edge(key: string, isPressed: boolean, command: RunCommand | 'pause'): void {
    if (!isPressed) {
      this.gamepadPressed.delete(key);
      return;
    }

    if (this.gamepadPressed.has(key)) {
      return;
    }

    this.gamepadPressed.add(key);

    if (command === 'pause') {
      this.isPauseRequested = this.isEnabled;
    } else {
      this.press(command);
    }
  }
}
