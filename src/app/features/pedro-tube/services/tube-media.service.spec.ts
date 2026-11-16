import { TestBed } from '@angular/core/testing';

import { IndexedDbService, TUBE_MEDIA_STORE } from '../../../core/services/indexed-db.service';
import { MAX_TUBE_MEDIA_BYTES, TubeMediaService } from './tube-media.service';

/** Banco de mentira, com as três operações que o serviço usa. */
class FakeDatabase {
  readonly isSupported = true;
  readonly rows = new Map<string, { id: string; blob: Blob }>();
  failNextGet = false;

  async put(store: string, value: { id: string; blob: Blob }): Promise<void> {
    expect(store).toBe(TUBE_MEDIA_STORE);
    this.rows.set(value.id, value);
  }

  async get(_store: string, id: string): Promise<{ id: string; blob: Blob } | undefined> {
    if (this.failNextGet) {
      this.failNextGet = false;
      throw new Error('banco ocupado');
    }

    return this.rows.get(id);
  }

  async delete(_store: string, id: string): Promise<void> {
    this.rows.delete(id);
  }
}

describe('TubeMediaService', () => {
  let database: FakeDatabase;
  let service: TubeMediaService;

  beforeEach(() => {
    database = new FakeDatabase();
    TestBed.configureTestingModule({ providers: [{ provide: IndexedDbService, useValue: database }] });
    service = TestBed.inject(TubeMediaService);
  });

  it('guarda o arquivo e devolve um endereço para tocar, sempre o mesmo', async () => {
    const id = await service.save(new Blob(['video'], { type: 'video/webm' }));
    const url = await service.urlFor(id);

    expect(service.isSupported).toBeTrue();
    expect(database.rows.has(id)).toBeTrue();
    expect(url).toMatch(/^blob:/);
    expect(await service.urlFor(id)).withContext('não cria outro endereço à toa').toBe(url);
  });

  it('recusa arquivo grande demais', async () => {
    const huge = { size: MAX_TUBE_MEDIA_BYTES + 1, type: 'video/mp4' } as Blob;

    await expectAsync(service.save(huge)).toBeRejectedWithError(/grande demais/);
    expect(database.rows.size).toBe(0);
  });

  it('arquivo que não está no aparelho dá null; uma falha não fica grudada', async () => {
    expect(await service.urlFor('sumiu')).toBeNull();

    const id = await service.save(new Blob(['video'], { type: 'video/webm' }));

    database.failNextGet = true;
    expect(await service.urlFor(id)).toBeNull();
    expect(await service.urlFor(id)).withContext('a segunda tentativa lê o banco de novo').toMatch(/^blob:/);
  });

  it('apagar tira o arquivo do banco e solta o endereço', async () => {
    const id = await service.save(new Blob(['video'], { type: 'video/webm' }));
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();

    await service.urlFor(id);
    await service.remove(id);

    expect(database.rows.has(id)).toBeFalse();
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(await service.urlFor(id)).toBeNull();
  });
});
