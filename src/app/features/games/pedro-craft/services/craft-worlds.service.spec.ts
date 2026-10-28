import { TestBed } from '@angular/core/testing';

import { WORLD_SAVE_VERSION, type WorldSave } from '../models/world-save.model';
import { CraftWorldsService, EXPLORATION_WORLD, MAX_WORLDS } from './craft-worlds.service';
import { WORLD_SAVE_GATEWAY, type WorldSaveGateway } from './world-save.gateway';

class MemoryGateway implements WorldSaveGateway {
  readonly records = new Map<string, unknown>();

  list(): Promise<readonly unknown[]> {
    return Promise.resolve([...this.records.values()]);
  }

  put(save: WorldSave): Promise<void> {
    this.records.set(save.id, structuredClone(save));
    return Promise.resolve();
  }

  remove(id: string): Promise<void> {
    this.records.delete(id);
    return Promise.resolve();
  }
}

const savedWorld = (id: string, updatedAt: string): WorldSave => ({
  version: WORLD_SAVE_VERSION,
  id,
  name: `Mundo ${id}`,
  seed: 7,
  mode: 'adventure',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt,
  state: null,
});

describe('Mundos guardados do PedroCraft', () => {
  let gateway: MemoryGateway;
  let service: CraftWorldsService;

  beforeEach(() => {
    gateway = new MemoryGateway();
    TestBed.configureTestingModule({ providers: [{ provide: WORLD_SAVE_GATEWAY, useValue: gateway }] });
    service = TestBed.inject(CraftWorldsService);
  });

  it('lista do mais recente para o mais antigo', async () => {
    gateway.records.set('a', savedWorld('a', '2026-10-01T10:00:00.000Z'));
    gateway.records.set('b', savedWorld('b', '2026-10-03T10:00:00.000Z'));
    await service.load();

    expect(service.worlds().map((world) => world.id)).toEqual(['b', 'a']);
  });

  it('separa o mundo estragado sem perder os outros', async () => {
    gateway.records.set('a', savedWorld('a', '2026-10-01T10:00:00.000Z'));
    gateway.records.set('quebrado', { id: 'quebrado', name: 'Castelo', version: 1 });
    await service.load();

    expect(service.worlds().map((world) => world.id)).toEqual(['a']);
    expect(service.broken()).toEqual([jasmine.objectContaining({ id: 'quebrado', name: 'Castelo' })]);
    expect(await service.find('quebrado')).toEqual(jasmine.objectContaining({ type: 'broken' }));
  });

  it('cria um mundo com o nome arrumado, ainda sem estado, e guarda no aparelho', async () => {
    const world = await service.create('  Minha   ilha ');

    expect(world.name).toBe('Minha ilha');
    expect(world.state).toBeNull();
    expect(gateway.records.has(world.id)).toBeTrue();
    expect(service.worlds()[0]).toEqual(world);
  });

  it('guarda o modo escolhido ao criar o mundo', async () => {
    const world = await service.create('Ilha criativa', 'creative');

    expect(world.mode).toBe('creative');
  });

  it('um mundo salvo antes dos modos abre como aventura', async () => {
    const { mode: _mode, ...withoutMode } = savedWorld('antigo', '2026-10-01T10:00:00.000Z');

    gateway.records.set('antigo', withoutMode);
    await service.load();

    expect(service.worlds()[0].mode).toBe('adventure');
  });

  it('não passa do limite de mundos', async () => {
    for (let index = 0; index < MAX_WORLDS; index += 1) {
      await service.create('');
    }

    expect(service.canCreate()).toBeFalse();
    await expectAsync(service.create('mais um')).toBeRejected();
  });

  it('a Fazenda do Pedro abre sempre a mesma, sem duplicar', async () => {
    const first = await service.openExploration();
    const second = await service.openExploration();

    expect(first.id).toBe(EXPLORATION_WORLD.id);
    expect(second).toEqual(first);
    expect(service.worlds().length).toBe(1);
  });

  it('apaga o mundo do aparelho e da lista', async () => {
    const world = await service.create('Para apagar');

    await service.remove(world.id);

    expect(gateway.records.has(world.id)).toBeFalse();
    expect(await service.find(world.id)).toEqual({ type: 'missing' });
  });
});
