import type { CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { HOTBAR_SIZE, Inventory, INVENTORY_SIZE } from './inventory';

describe('Inventário do PedroCraft', () => {
  let catalog: CraftCatalog;
  let inventory: Inventory;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  beforeEach(() => {
    inventory = new Inventory(catalog);
  });

  it('começa pela barra e empilha até o limite do item', () => {
    expect(inventory.add('dirt', 70)).toBe(0);
    expect(inventory.slots[0]).toEqual({ item: 'dirt', count: 64, durability: null });
    expect(inventory.slots[1]).toEqual({ item: 'dirt', count: 6, durability: null });
  });

  it('completa a pilha que já existe antes de ocupar espaço novo', () => {
    inventory.add('dirt', 60);
    inventory.add('stick', 1);
    inventory.add('dirt', 10);

    expect(inventory.slots[0]?.count).toBe(64);
    expect(inventory.slots[2]).toEqual({ item: 'dirt', count: 6, durability: null });
  });

  it('dá durabilidade cheia à ferramenta nova e não empilha ferramentas', () => {
    inventory.add('wooden-pickaxe', 2);

    expect(inventory.slots[0]).toEqual({ item: 'wooden-pickaxe', count: 1, durability: 60 });
    expect(inventory.slots[1]).toEqual({ item: 'wooden-pickaxe', count: 1, durability: 60 });
  });

  it('devolve o que não cabe quando a mochila está cheia', () => {
    for (let index = 0; index < INVENTORY_SIZE; index += 1) {
      inventory.add('wooden-pickaxe', 1);
    }

    expect(inventory.roomFor('dirt')).toBe(0);
    expect(inventory.add('dirt', 5)).toBe(5);
  });

  it('conta e tira itens de várias pilhas, só quando há o bastante', () => {
    inventory.add('dirt', 64);
    inventory.add('dirt', 10);

    expect(inventory.count('dirt')).toBe(74);
    expect(inventory.remove('dirt', 100)).toBeFalse();
    expect(inventory.count('dirt')).toBe(74);
    expect(inventory.remove('dirt', 70)).toBeTrue();
    expect(inventory.count('dirt')).toBe(4);
  });

  it('desgasta a ferramenta e esvazia o espaço quando ela quebra', () => {
    inventory.slots[0] = { item: 'wooden-pickaxe', count: 1, durability: 2 };

    expect(inventory.wear(0)).toBeFalse();
    expect(inventory.slots[0]?.durability).toBe(1);
    expect(inventory.wear(0)).toBeTrue();
    expect(inventory.slots[0]).toBeNull();
  });

  it('não desgasta o que não tem durabilidade', () => {
    inventory.add('dirt', 3);

    expect(inventory.wear(0)).toBeFalse();
    expect(inventory.slots[0]?.count).toBe(3);
  });

  describe('toques na tela da mochila', () => {
    it('pega a pilha inteira e solta num espaço vazio', () => {
      inventory.add('dirt', 10);

      inventory.click(0, 'all');
      expect(inventory.cursor?.count).toBe(10);
      expect(inventory.slots[0]).toBeNull();

      inventory.click(HOTBAR_SIZE, 'all');
      expect(inventory.cursor).toBeNull();
      expect(inventory.slots[HOTBAR_SIZE]?.count).toBe(10);
    });

    it('pega metade (arredondando para cima) no toque de "um"', () => {
      inventory.add('dirt', 5);
      inventory.click(0, 'one');

      expect(inventory.cursor?.count).toBe(3);
      expect(inventory.slots[0]?.count).toBe(2);
    });

    it('solta um por vez no toque de "um" e junta com a pilha igual', () => {
      inventory.add('dirt', 4);
      inventory.click(0, 'all');
      inventory.click(5, 'one');
      inventory.click(5, 'one');

      expect(inventory.slots[5]?.count).toBe(2);
      expect(inventory.cursor?.count).toBe(2);
    });

    it('troca a mão com o espaço quando os itens são diferentes', () => {
      inventory.add('dirt', 4);
      inventory.add('stick', 2);
      inventory.click(0, 'all');
      inventory.click(1, 'all');

      expect(inventory.slots[1]?.item).toBe('dirt');
      expect(inventory.cursor?.item).toBe('stick');
    });

    it('junta só até o limite da pilha', () => {
      inventory.slots[0] = { item: 'dirt', count: 60, durability: null };
      inventory.cursor = { item: 'dirt', count: 10, durability: null };
      inventory.click(0, 'all');

      expect(inventory.slots[0]?.count).toBe(64);
      expect(inventory.cursor?.count).toBe(6);
    });

    it('devolve a mão ao fechar e entrega o que não coube', () => {
      for (let index = 0; index < INVENTORY_SIZE; index += 1) {
        inventory.slots[index] = { item: 'wooden-pickaxe', count: 1, durability: 60 };
      }

      inventory.cursor = { item: 'dirt', count: 3, durability: null };

      expect(inventory.returnCursor()).toEqual({ item: 'dirt', count: 3, durability: null });
      expect(inventory.cursor).toBeNull();
    });
  });
});
