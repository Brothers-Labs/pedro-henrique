import { TestBed } from '@angular/core/testing';

import { IndexedDbService } from '../../../../core/services/indexed-db.service';
import type { CustomLevel } from '../models/level.model';
import { CustomLevelService } from '../services/custom-level.service';
import { LevelSyncService } from './level-sync.service';
import { LEVEL_SYNC_GATEWAY, parseChanges } from './rest-level-sync-gateway';
import { SyncOutbox } from './sync-outbox';
import { type LevelSyncGateway, type RemoteChanges, SyncError, type UploadResult } from './sync.model';

const CODE = 'familia-do-pedro-2026';
const STORAGE_KEYS = ['pedro-henrique:pedro-maker:sync:v1', 'pedro-henrique:pedro-maker:sync-outbox:v1'];

/** IndexedDB de mentirinha, na memória, com a mesma interface do serviço real. */
class MemoryDatabase {
  readonly stores = new Map<string, Map<IDBValidKey, unknown>>();

  get isSupported(): boolean {
    return true;
  }

  async getAll<TValue>(store: string): Promise<TValue[]> {
    return [...(this.stores.get(store)?.values() ?? [])] as TValue[];
  }

  async put<TValue>(store: string, value: TValue): Promise<void> {
    const bucket = this.stores.get(store) ?? new Map<IDBValidKey, unknown>();
    bucket.set((value as { id: string }).id, value);
    this.stores.set(store, bucket);
  }

  async delete(store: string, key: IDBValidKey): Promise<void> {
    this.stores.get(store)?.delete(key);
  }
}

/** Servidor de mentirinha: guarda o que recebe e devolve o que mandarem devolver. */
class FakeGateway implements LevelSyncGateway {
  readonly uploaded: CustomLevel[] = [];
  readonly removed: string[] = [];
  changes: RemoteChanges = { levels: [], deleted: [], serverTime: '2026-09-29T12:00:00.000Z' };
  conflictWith: CustomLevel | null = null;
  failure: SyncError | null = null;

  async fetchChanges(): Promise<RemoteChanges> {
    this.throwIfFailing();
    return this.changes;
  }

  async upload(_code: string, level: CustomLevel): Promise<UploadResult> {
    this.throwIfFailing();

    if (this.conflictWith?.id === level.id) {
      return { status: 'conflito', level: this.conflictWith };
    }

    this.uploaded.push(level);
    return { status: 'aceita', level };
  }

  async remove(_code: string, id: string): Promise<void> {
    this.throwIfFailing();
    this.removed.push(id);
  }

  private throwIfFailing(): void {
    if (this.failure) {
      throw this.failure;
    }
  }
}

function level(id: string, updatedAt: string, name = `Fase ${id}`): CustomLevel {
  return {
    id,
    name,
    theme: 'vale',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt,
    width: 40,
    height: 15,
    objects: [
      { id: `${id}-s`, type: 'start', x: 2, y: 11 },
      { id: `${id}-p`, type: 'portal', x: 30, y: 11 },
    ],
    completed: false,
    bestStars: 0,
  };
}

describe('Sincronização das fases criadas', () => {
  let database: MemoryDatabase;
  let gateway: FakeGateway;

  function setUp(withGateway = true): { sync: LevelSyncService; levels: CustomLevelService; outbox: SyncOutbox } {
    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: database },
        { provide: LEVEL_SYNC_GATEWAY, useValue: withGateway ? gateway : null },
      ],
    });

    return {
      sync: TestBed.inject(LevelSyncService),
      levels: TestBed.inject(CustomLevelService),
      outbox: TestBed.inject(SyncOutbox),
    };
  }

  beforeEach(() => {
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    database = new MemoryDatabase();
    gateway = new FakeGateway();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  });

  it('fica desligada sem servidor configurado e não tenta nada', async () => {
    const { sync } = setUp(false);

    expect(sync.status()).toBe('desligada');
    expect(sync.connect(CODE)).toBeTrue();
    await sync.syncNow();
    expect(gateway.uploaded).toEqual([]);
  });

  it('recusa código fora do formato e pede código antes da primeira rodada', () => {
    const { sync } = setUp();

    expect(sync.status()).toBe('sem-codigo');
    expect(sync.connect('curto')).toBeFalse();
    expect(sync.connect('tem espaço no meio do código')).toBeFalse();
    expect(sync.generateCode()).toMatch(/^[A-Za-z0-9-]{12,64}$/);
  });

  it('na primeira rodada envia tudo e traz as fases de outros aparelhos', async () => {
    await database.put('maker-levels', level('local', '2026-09-10T10:00:00.000Z'));
    gateway.changes = { ...gateway.changes, levels: [level('remota', '2026-09-20T10:00:00.000Z')] };
    const { sync, levels, outbox } = setUp();

    sync.connect(CODE);
    await sync.syncNow();

    expect(gateway.uploaded.map((uploaded) => uploaded.id)).toEqual(['local']);
    expect((await levels.find('remota'))?.name).toBe('Fase remota');
    expect(outbox.size()).toBe(0);
    expect(sync.status()).toBe('pronta');
    expect(sync.lastSyncedAt()).not.toBeNull();
  });

  it('não troca a fase local por uma versão mais antiga do servidor', async () => {
    await database.put('maker-levels', level('fase', '2026-09-25T10:00:00.000Z', 'Nova'));
    gateway.changes = { ...gateway.changes, levels: [level('fase', '2026-09-01T10:00:00.000Z', 'Velha')] };
    const { sync, levels } = setUp();

    sync.connect(CODE);
    await sync.syncNow();

    expect((await levels.find('fase'))?.name).toBe('Nova');
  });

  it('aceita a versão do servidor quando ele recusa o envio por ter uma mais nova', async () => {
    await database.put('maker-levels', level('fase', '2026-09-10T10:00:00.000Z', 'Minha'));
    gateway.conflictWith = level('fase', '2026-09-28T10:00:00.000Z', 'Do tablet');
    const { sync, levels } = setUp();

    sync.connect(CODE);
    await sync.syncNow();

    expect((await levels.find('fase'))?.name).toBe('Do tablet');
  });

  it('leva a exclusão feita aqui para o servidor', async () => {
    const { sync, levels, outbox } = setUp();
    const saved = await levels.save({ id: null, name: 'Vai sumir', theme: 'vale', width: 40, height: 15, objects: [] });

    sync.connect(CODE);
    await sync.syncNow();
    await levels.remove(saved.id);

    expect(outbox.operations()).toEqual([jasmine.objectContaining({ kind: 'delete', id: saved.id })]);

    await sync.syncNow();

    expect(gateway.removed).toEqual([saved.id]);
    expect(outbox.size()).toBe(0);
  });

  it('apaga a fase excluída em outro aparelho, a menos que ela tenha sido editada aqui depois', async () => {
    await database.put('maker-levels', level('antiga', '2026-09-01T10:00:00.000Z'));
    await database.put('maker-levels', level('editada', '2026-09-29T11:00:00.000Z'));
    const { sync, levels, outbox } = setUp();

    sync.connect(CODE);
    await sync.syncNow();

    gateway.changes = {
      levels: [],
      serverTime: '2026-09-29T13:00:00.000Z',
      deleted: [
        { id: 'antiga', deletedAt: '2026-09-15T10:00:00.000Z' },
        { id: 'editada', deletedAt: '2026-09-15T10:00:00.000Z' },
      ],
    };
    expect(outbox.size()).toBe(0);
    await sync.syncNow();

    expect(await levels.find('antiga')).toBeNull();
    expect(await levels.find('editada')).not.toBeNull();
  });

  it('guarda a fila quando o servidor falha e esvazia na rodada seguinte', async () => {
    const { sync, levels, outbox } = setUp();

    sync.connect(CODE);
    gateway.failure = new SyncError('O servidor respondeu com erro (500).');
    await levels.save({ id: null, name: 'Guardada', theme: 'vale', width: 40, height: 15, objects: [] });
    await sync.syncNow();

    expect(sync.status()).toBe('erro');
    expect(sync.errorMessage()).toBe('O servidor respondeu com erro (500).');
    expect(outbox.size()).toBe(1);

    gateway.failure = null;
    await sync.syncNow();

    expect(sync.status()).toBe('pronta');
    expect(outbox.size()).toBe(0);
    expect(gateway.uploaded.map((uploaded) => uploaded.name)).toEqual(['Guardada']);
  });

  it('só confirma a operação enviada: uma edição feita durante o envio continua na fila', () => {
    const { outbox } = setUp();
    const first = { kind: 'upsert', id: 'fase', at: '2026-09-29T10:00:00.000Z' } as const;
    const second = { kind: 'upsert', id: 'fase', at: '2026-09-29T10:00:05.000Z' } as const;

    outbox.enqueue(first);
    outbox.enqueue(second);
    outbox.acknowledge(first);

    expect(outbox.operations()).toEqual([second]);
  });
});

describe('Leitura da resposta do servidor', () => {
  it('limpa fases estranhas e descarta exclusões mal formadas', () => {
    const changes = parseChanges({
      serverTime: '2026-09-29T12:00:00.000Z',
      levels: [level('boa', '2026-09-20T10:00:00.000Z'), { id: 'sem-tamanho' }, 'lixo'],
      deleted: [{ id: 'x', deletedAt: '2026-09-20T10:00:00.000Z' }, { id: 7 }],
    });

    expect(changes.levels.map((entry) => entry.id)).toEqual(['boa']);
    expect(changes.deleted.map((entry) => entry.id)).toEqual(['x']);
  });

  it('recusa resposta sem a hora do servidor', () => {
    expect(() => parseChanges({ levels: [] })).toThrowError(SyncError);
    expect(() => parseChanges('texto')).toThrowError(SyncError);
  });
});
