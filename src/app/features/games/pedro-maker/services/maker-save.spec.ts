import { DEFAULT_LOOK } from '../config/character.config';
import type { LevelObject } from '../models/level.model';
import { sanitizeCustomLevel } from './custom-level.service';
import { reconcile } from './maker-progress.service';

describe('Leitura segura dos saves do Pedro Maker', () => {
  describe('progresso', () => {
    it('recomeça do zero quando o save não é um objeto', () => {
      for (const garbage of [null, 42, 'texto', []]) {
        const progress = reconcile(garbage);

        expect(progress.levels).toEqual({});
        expect(progress.coins).toBe(0);
        expect(progress.look).toEqual(DEFAULT_LOOK);
        expect(progress.hero).toBe('pedro');
      }
    });

    it('mantém o herói escolhido e volta ao Pedro quando o herói não existe ou falta no save antigo', () => {
      expect(reconcile({ hero: 'gui' }).hero).toBe('gui');
      expect(reconcile({ hero: 'mario' }).hero).toBe('mario');
      expect(reconcile({ hero: 'bowser' }).hero).toBe('pedro');
      expect(reconcile({ hero: 7 }).hero).toBe('pedro');
      expect(reconcile({ coins: 10 }).hero).toBe('pedro');
    });

    it('mantém o que é válido e descarta só o que não faz sentido', () => {
      const progress = reconcile({
        coins: 120,
        totalXp: -30,
        levels: {
          '1-1': { completed: true, stars: 9, crystals: [true, 'sim', false], bestTimeMs: 61000, bestCoins: 20, timesCompleted: 2 },
          '9-9': { completed: true, stars: 3 },
        },
        secretsFound: ['1-S', 'inventada'],
        achievements: ['primeira-aventura', 'conquista-que-nao-existe'],
        look: { cap: 'bone-inexistente', shirt: 'camiseta-azul' },
      });

      expect(progress.coins).toBe(120);
      expect(progress.totalXp).toBe(0);
      expect(Object.keys(progress.levels)).toEqual(['1-1']);
      expect(progress.levels['1-1']?.stars).toBe(3);
      expect(progress.levels['1-1']?.crystals).toEqual([true, false, false]);
      expect(progress.secretsFound).toEqual(['1-S']);
      expect(progress.achievements).toEqual(['primeira-aventura']);
      expect(progress.look.cap).toBe(DEFAULT_LOOK.cap);
      expect(progress.look.shirt).toBe('camiseta-azul');
    });
  });

  describe('fase criada', () => {
    const valid = {
      id: 'fase-1',
      name: '  Minha   fase  ',
      theme: 'gelo',
      createdAt: '2026-09-28T10:00:00.000Z',
      updatedAt: '2026-09-28T10:00:00.000Z',
      width: 40,
      height: 15,
      objects: [
        { id: 'a', type: 'ground', x: 0, y: 14 },
        { id: 'b', type: 'monstro-inventado', x: 1, y: 14 },
        { id: 'c', type: 'coin', x: 99, y: 3 },
        { id: 'd', type: 'power-up', x: 5, y: 10, properties: { powerUp: 'voar-para-sempre', text: 42 } },
      ],
      completed: true,
      bestStars: 7,
    };

    it('limpa objetos inválidos sem perder a fase', () => {
      const level = sanitizeCustomLevel(valid);

      expect(level?.name).toBe('Minha fase');
      expect(level?.objects.map((object) => object.id)).toEqual(['a', 'd']);
      expect(level?.objects[1]?.properties).toBeUndefined();
      expect(level?.bestStars).toBe(3);
    });

    it('descarta a fase com tamanho impossível e troca tema desconhecido', () => {
      expect(sanitizeCustomLevel({ ...valid, width: 5 })).toBeNull();
      expect(sanitizeCustomLevel({ ...valid, height: 2.5 })).toBeNull();
      expect(sanitizeCustomLevel({ ...valid, id: 7 })).toBeNull();
      expect(sanitizeCustomLevel({ ...valid, theme: 'lua' })?.theme).toBe('vale');
    });

    it('guarda o Castelo do Rei Slime, a grama invisível e o castelo final, e descarta desenho de portal inventado', () => {
      const level = sanitizeCustomLevel({
        ...valid,
        theme: 'castelo-rei-slime',
        objects: [
          { id: 'grama', type: 'invisible-grass', x: 3, y: 14 },
          { id: 'castelo', type: 'portal', x: 30, y: 13, properties: { portalLook: 'castle' } },
          { id: 'foguete', type: 'portal', x: 32, y: 13, properties: { portalLook: 'foguete' } },
        ],
      });

      expect(level?.theme).toBe('castelo-rei-slime');
      expect(level?.objects).toEqual([
        { id: 'grama', type: 'invisible-grass', x: 3, y: 14 },
        { id: 'castelo', type: 'portal', x: 30, y: 13, properties: { portalLook: 'castle' } },
        { id: 'foguete', type: 'portal', x: 32, y: 13 },
      ]);
    });

    it('guarda a plataforma de esqueleto e a mola de cabeça pra baixo', () => {
      const objects: readonly LevelObject[] = [
        { id: 'ossos', type: 'skeleton-platform', x: 8, y: 11 },
        { id: 'mola', type: 'ceiling-spring', x: 12, y: 6 },
      ];

      expect(sanitizeCustomLevel({ ...valid, objects })?.objects).toEqual(objects);
    });
  });
});
