import { IDLE_CRAFT_INPUT } from './craft-input';
import { PARTNER_KEYS, PartnerInputReader, THIRD_SEAT } from './partner-input-reader';

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

describe('Entrada do Jogador 2 do PedroCraft', () => {
  let pads: (Gamepad | null)[];
  let reader: PartnerInputReader;

  const press = (code: string, type: 'keydown' | 'keyup' = 'keydown'): void => {
    window.dispatchEvent(new KeyboardEvent(type, { code }));
  };

  beforeEach(() => {
    pads = [];
    reader = new PartnerInputReader(window, () => 1, () => pads);
  });

  afterEach(() => reader.dispose());

  it('sem controle e sem tecla, fica parado', () => {
    expect(reader.read()).toEqual(IDLE_CRAFT_INPUT);
  });

  it('as setas andam e o Enter pula', () => {
    press(PARTNER_KEYS.forward);
    press(PARTNER_KEYS.left);
    press(PARTNER_KEYS.jump);

    expect(reader.read()).toEqual(jasmine.objectContaining({ forward: 1, strafe: -1, jumpHeld: true }));
  });

  it('U quebra (segurado) e O usa uma vez por toque', () => {
    press(PARTNER_KEYS.primary);
    press(PARTNER_KEYS.secondary);

    expect(reader.read()).toEqual(jasmine.objectContaining({ primaryHeld: true, primaryPressed: true, secondaryPressed: true }));
    expect(reader.read()).toEqual(jasmine.objectContaining({ primaryHeld: true, primaryPressed: false, secondaryPressed: false }));
  });

  it('N e M trocam o espaço da barra, um por toque', () => {
    press(PARTNER_KEYS.nextSlot);

    expect(reader.read().hotbarScroll).toBe(1);
    expect(reader.read().hotbarScroll).toBe(0);

    press(PARTNER_KEYS.nextSlot, 'keyup');
    press(PARTNER_KEYS.previousSlot);

    expect(reader.read().hotbarScroll).toBe(-1);
  });

  it('I J K L giram o olhar pelo tempo segurado', () => {
    press(PARTNER_KEYS.lookLeft);
    press(PARTNER_KEYS.lookUp);

    const look = reader.readLook(500);

    expect(look.yaw).toBeGreaterThan(0);
    expect(look.pitch).toBeGreaterThan(0);
    expect(reader.readLook(1000).yaw).toBeCloseTo(look.yaw * 2, 5);
  });

  it('o controle: analógico esquerdo anda, direito olha, A pula, RT quebra, LT usa e Y abre a mochila', () => {
    pads = [fakePad([0.8, -1, 1, 0], [0, 7, 6, 3])];

    const snapshot = reader.read();

    expect(snapshot.strafe).toBeCloseTo(0.8, 5);
    expect(snapshot.forward).toBe(1);
    expect(snapshot).toEqual(jasmine.objectContaining({ jumpHeld: true, primaryPressed: true, secondaryPressed: true, inventoryPressed: true }));
    expect(reader.readLook(1000).yaw).toBeLessThan(0);
  });

  it('o analógico gasto, com um tiquinho de inclinação, não anda sozinho', () => {
    pads = [fakePad([0.1, -0.15, 0.05, 0])];

    expect(reader.read()).toEqual(jasmine.objectContaining({ strafe: 0, forward: 0 }));
    expect(reader.readLook(1000)).toEqual({ yaw: 0, pitch: 0 });
  });

  it('com o jogo em pausa, não lê nada; ao voltar, botão que ficou segurado não dispara sozinho', () => {
    pads = [fakePad([0, 0, 0, 0], [7])];
    reader.setCapturing(false);

    expect(reader.read()).toEqual(IDLE_CRAFT_INPUT);

    reader.reset();
    reader.setCapturing(true);

    expect(reader.read().primaryPressed).toBeFalse();
  });

  it('com dois controles ligados, o primeiro é do Jogador 2 e o segundo não mexe nele', () => {
    pads = [fakePad([0, -1, 0, 0]), fakePad([1, 0, 0, 0], [0])];

    expect(reader.read()).toEqual(jasmine.objectContaining({ forward: 1, strafe: 0, jumpHeld: false }));
  });
});

describe('Entrada do Jogador 3 do PedroCraft', () => {
  let pads: (Gamepad | null)[];
  let reader: PartnerInputReader;

  beforeEach(() => {
    pads = [];
    reader = new PartnerInputReader(window, () => 1, () => pads, THIRD_SEAT);
  });

  afterEach(() => reader.dispose());

  it('lê o segundo controle ligado: o primeiro é do Jogador 2', () => {
    pads = [fakePad([0, -1, 0, 0]), fakePad([1, 0, -1, 0], [0, 7])];

    const snapshot = reader.read();

    expect(snapshot).toEqual(jasmine.objectContaining({ strafe: 1, forward: 0, jumpHeld: true, primaryPressed: true }));
    expect(reader.readLook(1000).yaw).toBeGreaterThan(0);
  });

  it('com um controle só, o Jogador 3 fica parado: aquele controle é do Jogador 2', () => {
    pads = [fakePad([0, -1, 0, 0], [0])];

    expect(reader.read()).toEqual(IDLE_CRAFT_INPUT);
  });

  it('um controle desligado no meio da lista não troca os controles de dono', () => {
    pads = [null, fakePad([0, -1, 0, 0]), fakePad([-1, 0, 0, 0])];

    expect(reader.read().strafe).toBe(-1);
  });

  it('não usa o teclado: as setas e o Enter são do Jogador 2', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: PARTNER_KEYS.forward }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: PARTNER_KEYS.jump }));

    expect(reader.read()).toEqual(IDLE_CRAFT_INPUT);
    expect(reader.readLook(1000)).toEqual({ yaw: 0, pitch: 0 });

    window.dispatchEvent(new KeyboardEvent('keyup', { code: PARTNER_KEYS.forward }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: PARTNER_KEYS.jump }));
  });
});
