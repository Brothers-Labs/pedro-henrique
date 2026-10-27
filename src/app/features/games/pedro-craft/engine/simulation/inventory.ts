import type { CraftCatalog } from '../../content/craft-catalog';

/** Espaços da barra de baixo (1 a 9 no teclado). */
export const HOTBAR_SIZE = 9;

/** Espaços da mochila, além da barra. */
export const BACKPACK_SIZE = 27;

export const INVENTORY_SIZE = HOTBAR_SIZE + BACKPACK_SIZE;

/**
 * Uma pilha de itens num espaço.
 *
 * `durability` só existe em ferramenta e arma: são os usos que ainda restam.
 * Ferramentas não empilham, então cada uma guarda o próprio desgaste.
 */
export interface ItemStack {
  readonly item: string;
  readonly count: number;
  readonly durability: number | null;
}

export type SlotContent = ItemStack | null;

/** Como o toque num espaço mexe na pilha: tudo de uma vez, ou uma unidade. */
export type SlotClick = 'all' | 'one';

/**
 * Inventário do herói: a barra (espaços 0 a 8) e a mochila (9 a 35).
 *
 * Toda regra de pilha mora aqui — juntar, separar, gastar, desgastar — e é
 * a mesma para o jogo e para a tela da mochila. A "mão" (`cursor`) é a pilha
 * que a criança pegou na tela e ainda não soltou.
 */
export class Inventory {
  readonly slots: SlotContent[] = Array.from({ length: INVENTORY_SIZE }, () => null);
  cursor: SlotContent = null;

  constructor(private readonly catalog: CraftCatalog) {}

  /**
   * Guarda itens: primeiro completa pilhas iguais, depois ocupa espaços
   * vazios, sempre começando pela barra. Devolve quanto não coube.
   */
  add(item: string, count: number, durability: number | null = null): number {
    const maxStack = this.catalog.item(item).maxStack;
    let remaining = count;

    if (durability === null) {
      for (let index = 0; index < INVENTORY_SIZE && remaining > 0; index += 1) {
        const slot = this.slots[index];

        if (slot && slot.item === item && slot.count < maxStack) {
          const moved = Math.min(remaining, maxStack - slot.count);

          this.slots[index] = { ...slot, count: slot.count + moved };
          remaining -= moved;
        }
      }
    }

    for (let index = 0; index < INVENTORY_SIZE && remaining > 0; index += 1) {
      if (this.slots[index] === null) {
        const moved = Math.min(remaining, maxStack);

        this.slots[index] = { item, count: moved, durability: durability ?? this.newDurability(item) };
        remaining -= moved;
      }
    }

    return remaining;
  }

  /** Quanto cabe do item sem mexer em nada. */
  roomFor(item: string): number {
    const maxStack = this.catalog.item(item).maxStack;

    return this.slots.reduce((room, slot) => {
      if (slot === null) {
        return room + maxStack;
      }

      return slot.item === item && slot.durability === null ? room + maxStack - slot.count : room;
    }, 0);
  }

  count(item: string): number {
    return this.slots.reduce((total, slot) => total + (slot?.item === item ? slot.count : 0), 0);
  }

  /** Tira itens de onde houver. Só tira se houver o bastante; devolve se tirou. */
  remove(item: string, count: number): boolean {
    if (this.count(item) < count) {
      return false;
    }

    let remaining = count;

    for (let index = INVENTORY_SIZE - 1; index >= 0 && remaining > 0; index -= 1) {
      const slot = this.slots[index];

      if (slot?.item === item) {
        const taken = Math.min(remaining, slot.count);

        this.slots[index] = slot.count === taken ? null : { ...slot, count: slot.count - taken };
        remaining -= taken;
      }
    }

    return true;
  }

  /** Gasta uma unidade do espaço (o bloco colocado, a semente plantada). */
  consume(index: number, count = 1): void {
    const slot = this.slots[index];

    if (!slot) {
      return;
    }

    this.slots[index] = slot.count > count ? { ...slot, count: slot.count - count } : null;
  }

  /** Troca o item de um espaço inteiro (balde vazio vira balde com água). */
  replace(index: number, item: string): void {
    this.slots[index] = { item, count: 1, durability: this.newDurability(item) };
  }

  /**
   * Desgasta a ferramenta do espaço. Devolve `true` quando ela quebrou e o
   * espaço ficou vazio.
   */
  wear(index: number, amount = 1): boolean {
    const slot = this.slots[index];

    if (!slot || slot.durability === null) {
      return false;
    }

    const left = slot.durability - amount;

    this.slots[index] = left > 0 ? { ...slot, durability: left } : null;

    return left <= 0;
  }

  /**
   * Toque num espaço da tela da mochila.
   *
   * Mão vazia: pega a pilha (ou metade, no toque de "um"). Mão cheia num
   * espaço vazio: solta tudo (ou uma unidade). Mesma coisa nos dois: junta.
   * Coisas diferentes: troca a mão com o espaço.
   */
  click(index: number, mode: SlotClick): void {
    const slot = this.slots[index];
    const held = this.cursor;

    if (!held) {
      if (!slot) {
        return;
      }

      const taken = mode === 'one' ? Math.ceil(slot.count / 2) : slot.count;

      this.cursor = { ...slot, count: taken };
      this.slots[index] = slot.count === taken ? null : { ...slot, count: slot.count - taken };
      return;
    }

    if (!slot) {
      const placed = mode === 'one' ? 1 : held.count;

      this.slots[index] = { ...held, count: placed };
      this.cursor = held.count === placed ? null : { ...held, count: held.count - placed };
      return;
    }

    if (this.canMerge(slot, held)) {
      const room = this.catalog.item(slot.item).maxStack - slot.count;
      const moved = Math.min(room, mode === 'one' ? 1 : held.count);

      this.slots[index] = { ...slot, count: slot.count + moved };
      this.cursor = held.count === moved ? null : { ...held, count: held.count - moved };
      return;
    }

    this.slots[index] = held;
    this.cursor = slot;
  }

  /**
   * Devolve a pilha da mão para o inventário (ao fechar a tela). Devolve o que
   * não coube, para quem chamou jogar no chão.
   */
  returnCursor(): SlotContent {
    const held = this.cursor;

    this.cursor = null;

    if (!held) {
      return null;
    }

    const left = this.add(held.item, held.count, held.durability);

    return left > 0 ? { ...held, count: left } : null;
  }

  private canMerge(slot: ItemStack, held: ItemStack): boolean {
    return slot.item === held.item && slot.durability === null && held.durability === null;
  }

  private newDurability(item: string): number | null {
    return this.catalog.item(item).durability;
  }
}
