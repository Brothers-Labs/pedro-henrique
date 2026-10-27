import { inject, Injectable } from '@angular/core';

import { CraftCatalog } from '../content/craft-catalog';
import { CRAFT_CONTENT_GATEWAY } from '../content/craft-content.gateway';

/**
 * Conteúdo do PedroCraft, carregado uma vez por visita.
 *
 * As telas pedem o catálogo quantas vezes quiserem; a busca acontece só na
 * primeira. Se ela falhar (sem internet, JSON quebrado), a próxima tentativa
 * busca de novo em vez de repetir o erro guardado.
 */
@Injectable({ providedIn: 'root' })
export class CraftContentService {
  private readonly gateway = inject(CRAFT_CONTENT_GATEWAY);
  private pending: Promise<CraftCatalog> | null = null;

  load(): Promise<CraftCatalog> {
    this.pending ??= this.gateway
      .loadContent()
      .then((content) => new CraftCatalog(content))
      .catch((error: unknown) => {
        this.pending = null;
        throw error;
      });

    return this.pending;
  }
}
