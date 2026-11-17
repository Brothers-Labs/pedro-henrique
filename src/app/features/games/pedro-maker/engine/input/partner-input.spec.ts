import type { VirtualInputState } from '../../models/session.model';
import { IDLE_INPUT } from './input-snapshot';
import { PARTNER_KEYS, PartnerInput, THIRD_SEAT } from './partner-input';
import { PlayerInput } from './player-input';

/** Um controle de mentira, no mapa padrão do navegador: 4 eixos e 17 botões. */
function fakePad(axes: readonly number[] = [0, 0, 0, 0], pressed: readonly number[] = []): Gamepad {
  return {
    axes,
    buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: pressed.includes(index), touched: false, value: pressed.includes(index) ? 1 : 0 })),
    connected: true,
    id: 'controle de teste',
    index: 0,
    mapping: 'standard',
    timestamp: 0,
    hapticActuators: [],
    vibrationActuator: null,
  } as unknown as Gamepad;
}

const press = (code: string, type: 'keydown' | 'keyup' = 'keydown'): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
};

describe('Entrada do Jogador 2 do Pedro Maker', () => {
  let pads: (Gamepad | null)[];
  let input: PartnerInput;

  beforeEach(() => {
    pads = [];
    input = new PartnerInput(window, undefined, () => pads);
  });

  afterEach(() => input.dispose());

  it('sem controle e sem tecla, fica parado', () => {
    expect(input.read()).toEqual(IDLE_INPUT);
  });

  it('as setas andam, a seta para cima pula e o Shift da direita corre', () => {
    press(PARTNER_KEYS.right);
    press(PARTNER_KEYS.jump);
    press(PARTNER_KEYS.run);

    expect(input.read()).toEqual(jasmine.objectContaining({ right: true, left: false, run: true, jumpHeld: true, jumpPressed: true }));
    expect(input.read()).withContext('o pulo só conta como apertado no primeiro passo').toEqual(jasmine.objectContaining({ jumpHeld: true, jumpPressed: false }));

    press(PARTNER_KEYS.right, 'keyup');
    press(PARTNER_KEYS.jump, 'keyup');
    press(PARTNER_KEYS.run, 'keyup');
  });

  it('o controle anda pelo analógico ou pelo direcional, pula no A e pausa no Start', () => {
    pads = [fakePad([-0.5, 0, 0, 0], [0, 9])];

    expect(input.read()).toEqual(jasmine.objectContaining({ left: true, right: false, run: false, jumpPressed: true, pausePressed: true }));

    pads = [fakePad([0, 0, 0, 0], [15])];

    expect(input.read()).toEqual(jasmine.objectContaining({ right: true, jumpHeld: false, pausePressed: false }));
  });

  it('o analógico empurrado até a ponta corre', () => {
    pads = [fakePad([1, 0, 0, 0])];

    expect(input.read()).toEqual(jasmine.objectContaining({ right: true, run: true }));
  });

  it('pausado, não mexe ninguém; ao voltar, o botão segurado só conta depois de solto', () => {
    pads = [fakePad([0, 0, 0, 0], [0])];
    input.setCapturing(false);

    expect(input.read()).toEqual(IDLE_INPUT);

    input.setCapturing(true);
    input.reset();

    expect(input.read().jumpPressed).toBeFalse();
  });
});

describe('Entrada do Jogador 3 do Pedro Maker', () => {
  it('usa só o segundo controle, nunca as setas do Jogador 2', () => {
    const pads = [fakePad([0, 0, 0, 0], [14]), fakePad([0, 0, 0, 0], [15])];
    const third = new PartnerInput(window, THIRD_SEAT, () => pads);

    press(PARTNER_KEYS.left);

    expect(third.read()).toEqual(jasmine.objectContaining({ left: false, right: true }));

    press(PARTNER_KEYS.left, 'keyup');
    third.dispose();
  });
});

describe('Teclado do Jogador 1 do Pedro Maker', () => {
  const virtual = (): VirtualInputState => ({ left: false, right: false, run: false, jump: false, action: false });

  it('sozinho, as setas e o W A S D andam', () => {
    const input = new PlayerInput(virtual(), window);

    press('ArrowRight');

    expect(input.read().right).toBeTrue();

    press('ArrowRight', 'keyup');
    input.dispose();
  });

  it('em turma, as setas ficam com o Jogador 2 e o Jogador 1 anda com A e D', () => {
    const input = new PlayerInput(virtual(), window, 'left-side');

    press('ArrowRight');
    press('ArrowUp');

    expect(input.read()).toEqual(jasmine.objectContaining({ right: false, jumpHeld: false }));

    press('ArrowRight', 'keyup');
    press('ArrowUp', 'keyup');
    press('KeyD');
    press('KeyW');

    expect(input.read()).toEqual(jasmine.objectContaining({ right: true, jumpHeld: true }));

    press('KeyD', 'keyup');
    press('KeyW', 'keyup');
    input.dispose();
  });
});
