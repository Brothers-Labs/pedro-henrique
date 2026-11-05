import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { BlockProperties } from '../block-properties';
import { END_OF_LINE_PAUSE_MS, TRAIN_SEAT_HEIGHT, TrainRide } from './train-ride';

const RAIL_Y = 1;
const SPEED = 5;
const STEP_MS = 50;

/** Olhar do herói: o mesmo jeito de medir do jogo, em que 0 olha para -z. */
const LOOK_NORTH = 0;
const LOOK_EAST = -Math.PI / 2;
const LOOK_WEST = Math.PI / 2;

describe('Passeio de trem do PedroCraft', () => {
  let catalog: CraftCatalog;
  let properties: BlockProperties;
  let world: VoxelWorld;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
    properties = new BlockProperties(catalog);
  });

  beforeEach(() => {
    world = new VoxelWorld(16, 16, 8);

    for (let z = 0; z < 16; z += 1) {
      for (let x = 0; x < 16; x += 1) {
        world.fill(x, 0, z, catalog.blockNumber('stone'));
      }
    }
  });

  const rail = (x: number, z: number): void => {
    world.fill(x, RAIL_Y, z, catalog.blockNumber('rail'));
  };

  const board = (x: number, z: number, lookYaw: number): TrainRide | null =>
    TrainRide.board(world, properties, { x, y: RAIL_Y, z }, SPEED, lookYaw);

  /** Anda até `ms` milissegundos, de passo em passo; devolve se o passeio continuou até o fim. */
  const ride = (train: TrainRide, ms: number, lookYaw: number): boolean => {
    for (let elapsed = 0; elapsed < ms; elapsed += STEP_MS) {
      if (!train.step(STEP_MS, lookYaw)) {
        return false;
      }
    }

    return true;
  };

  it('só deixa subir num trilho com espaço livre em cima', () => {
    rail(5, 5);
    rail(8, 5);
    world.fill(8, RAIL_Y + 1, 5, catalog.blockNumber('stone'));

    expect(board(4, 5, LOOK_EAST)).toBeNull();
    expect(board(8, 5, LOOK_EAST)).toBeNull();

    const train = board(5, 5, LOOK_EAST);

    expect(train).not.toBeNull();
    expect(train?.x).toBe(5.5);
    expect(train?.z).toBe(5.5);
    expect(train?.seatY).toBe(RAIL_Y + TRAIN_SEAT_HEIGHT);
  });

  it('segue a linha reta para o lado do olhar e para no fim', () => {
    for (let x = 2; x <= 8; x += 1) {
      rail(x, 5);
    }

    const train = board(2, 5, LOOK_EAST)!;

    ride(train, 400, LOOK_EAST);
    expect(train.x).toBeCloseTo(2.5 + (SPEED * 400) / 1000, 5);
    expect(train.z).toBe(5.5);

    ride(train, 1000, LOOK_WEST);
    expect(train.x).toBe(8.5);
    expect(train.isStopped).toBeTrue();
  });

  it('espera no fim da linha e volta sozinho', () => {
    for (let x = 2; x <= 4; x += 1) {
      rail(x, 5);
    }

    const train = board(2, 5, LOOK_EAST)!;

    ride(train, 500, LOOK_EAST);
    expect(train.x).toBe(4.5);

    // Chegou no meio do primeiro meio segundo; espera quase toda a pausa e ainda está lá.
    ride(train, END_OF_LINE_PAUSE_MS - 300, LOOK_EAST);
    expect(train.x).toBe(4.5);

    ride(train, 400, LOOK_EAST);
    expect(train.x).toBeLessThan(4.5);
  });

  it('vira na curva, mesmo olhando para outro lado', () => {
    rail(2, 5);
    rail(3, 5);
    rail(3, 4);
    rail(3, 3);

    const train = board(2, 5, LOOK_EAST)!;

    ride(train, 1000, LOOK_EAST);
    expect(train.x).toBe(3.5);
    expect(train.z).toBe(3.5);
  });

  it('na encruzilhada, vai para o lado que o herói olha', () => {
    for (let x = 2; x <= 6; x += 1) {
      rail(x, 5);
    }

    rail(4, 4);
    rail(4, 3);

    const train = board(2, 5, LOOK_EAST)!;

    ride(train, 500, LOOK_NORTH);
    expect(train.x).toBe(4.5);
    expect(train.z).toBeLessThan(5.5);
  });

  it('volta quando o trilho da frente some, e acaba quando somem os dois', () => {
    for (let x = 2; x <= 6; x += 1) {
      rail(x, 5);
    }

    const train = board(2, 5, LOOK_EAST)!;

    ride(train, 100, LOOK_EAST);
    world.set(3, RAIL_Y, 5, AIR);
    ride(train, 100, LOOK_EAST);
    expect(train.x).toBeLessThan(3);

    world.set(2, RAIL_Y, 5, AIR);
    expect(train.step(STEP_MS, LOOK_EAST)).toBeFalse();
  });
});
