import { inject, InjectionToken } from '@angular/core';

import { CRAFT_WORLD_STORE, IndexedDbService } from '../../../../core/services/indexed-db.service';
import type { WorldSave } from '../models/world-save.model';

/**
 * Porta dos mundos salvos.
 *
 * Quem lê recebe o JSON cru, como veio guardado: conferir, migrar e limpar é
 * trabalho de `world/world-save.ts`, nunca do adaptador. Assim, trocar o
 * IndexedDB pelo servidor (`docs/pedro-craft-api.md`) não muda regra nenhuma.
 */
export interface WorldSaveGateway {
  list(): Promise<readonly unknown[]>;
  put(save: WorldSave): Promise<void>;
  remove(id: string): Promise<void>;
}

/** Porta em uso. Trocar pelo adaptador do servidor é trocar esta fábrica. */
export const WORLD_SAVE_GATEWAY = new InjectionToken<WorldSaveGateway>('WORLD_SAVE_GATEWAY', {
  providedIn: 'root',
  factory: () => new IndexedDbWorldSaveGateway(inject(IndexedDbService)),
});

/** Os mundos no IndexedDB do aparelho, no store `craft-worlds`, um registro por mundo. */
export class IndexedDbWorldSaveGateway implements WorldSaveGateway {
  constructor(private readonly database: IndexedDbService) {}

  list(): Promise<readonly unknown[]> {
    return this.database.getAll<unknown>(CRAFT_WORLD_STORE);
  }

  put(save: WorldSave): Promise<void> {
    return this.database.put(CRAFT_WORLD_STORE, save);
  }

  remove(id: string): Promise<void> {
    return this.database.delete(CRAFT_WORLD_STORE, id);
  }
}
