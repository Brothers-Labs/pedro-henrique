import { paintItemIcon } from '../art/item-icons';
import type { CraftCatalog } from '../content/craft-catalog';
import type { SlotView } from '../models/craft-session.model';

/** Pixels do ícone na tela: o desenho de 16 ampliado três vezes, sem borrar. */
const ICON_SIZE = 48;

/**
 * Ícones e nomes dos itens para as telas do Angular.
 *
 * Cada ícone é pintado uma vez e vira um endereço de imagem (`data:`), que a
 * barra, a mochila e os avisos usam num `<img>` comum.
 */
export class ItemIconCache {
  private readonly urls = new Map<string, string>();

  constructor(private readonly catalog: CraftCatalog) {}

  url(itemId: string): string {
    const known = this.urls.get(itemId);

    if (known) {
      return known;
    }

    const url = paintItemIcon(this.catalog, itemId, ICON_SIZE).toDataURL('image/png');

    this.urls.set(itemId, url);

    return url;
  }

  name(itemId: string): string {
    return this.catalog.item(itemId).name;
  }

  /** Descrição para leitor de tela: "Tronco de carvalho, 12" ou "Espaço vazio". */
  describe(slot: SlotView | null): string {
    if (!slot) {
      return 'Espaço vazio';
    }

    const name = this.name(slot.item);

    return slot.count > 1 ? `${name}, ${slot.count}` : name;
  }
}
