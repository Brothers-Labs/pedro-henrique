import { DEFAULT_LOOK, paletteFor } from '../../config/character.config';
import { heroDefinition, isHeroId } from '../../config/hero.config';
import { EDITOR_PIECES } from '../../config/object-catalog';
import { TILE_SIZE } from '../../config/physics.config';
import { DIFFICULTY_RULES } from '../../config/rules.config';
import { LevelBuilder } from '../../levels/level-builder';
import { sanitizeLevelObject } from '../../levels/level-validation';
import type { ItemType } from '../../models/level.model';
import type { HeroId } from '../../models/progress.model';
import { IDLE_INPUT } from '../input/input-snapshot';
import { characterParts } from '../render/models/character-parts';
import { CollectibleSystem, coinValue } from './collectibles';
import { CANNON_RELOAD_MS, CannonSystem } from './cannons';
import { Enemy } from './enemy';
import { GameSimulation } from './game-simulation';

describe('Novos recursos do Pedro Maker', () => {
  for (const value of [25, 100, 250, 500, 1000]) {
    it(`preserva, coleta e contabiliza a moeda gigante de ${value}`, () => {
      const type = `coin-${value}` as ItemType;
      expect(EDITOR_PIECES.find((piece) => piece.type === type)?.category).toBe('itens');
      const object = sanitizeLevelObject({ id: 'coin', type, x: 3, y: 4 }, 40, 15);
      expect(object).not.toBeNull();
      const onCollected = jasmine.createSpy('onCollected');
      const system = new CollectibleSystem(object ? [object] : [], new Map(), { onCollected });
      expect(system.coinCount).toBe(value);
      expect(coinValue(type)).toBe(value);
      system.update(16, 3.5 * TILE_SIZE, 4.5 * TILE_SIZE, 0);
      expect(onCollected).toHaveBeenCalledTimes(1);
      expect(system.items.length).toBe(0);
    });
  }

  it('oferece Wario com roupa amarela, macacão roxo e modelo próprio', () => {
    expect(isHeroId('wario')).toBeTrue();
    if (!isHeroId('wario')) return;
    expect(heroDefinition('wario').name).toBe('Wario');
    const palette = paletteFor(DEFAULT_LOOK, 'wario' as HeroId);
    const parts = characterParts(palette);
    expect(palette.cap).toBe('#f7cf24');
    expect(parts.leg.some((part) => part.color === '#7b35b5')).toBeTrue();
  });

  it('encerra as balas disparadas ao atingir paredes ou o alcance máximo', () => {
    const wallBullet = new Enemy(1, 'bullet', 8, 10, 1, () => false, 0, 1, true);
    wallBullet.body.blockedLeft = true;
    wallBullet.step(100, 0, 0);
    expect(wallBullet.isDefeated).toBeTrue();
    const farBullet = new Enemy(2, 'bullet', 8, 10, 1, () => false, 0, 1, true);
    farBullet.body.x += TILE_SIZE * 13;
    farBullet.step(100, 0, 0);
    expect(farBullet.isDefeated).toBeTrue();
    const standalone = new Enemy(3, 'bullet', 8, 10, 1, () => false, 0);
    standalone.body.blockedLeft = true;
    standalone.step(100, 0, 0);
    expect(standalone.isDefeated).toBeFalse();
  });

  it('coloca o canhão nos blocos, bloqueia a grade e dispara novamente após a derrota da bala', () => {
    expect(EDITOR_PIECES.find((piece) => piece.id === 'cannon')?.category).toBe('blocos');
    const cannon = sanitizeLevelObject({ id: 'cannon', type: 'cannon', x: 8, y: 10 }, 40, 15);
    expect(cannon).not.toBeNull();
    const blueprint = new LevelBuilder(40, 15).ground(0, 39, 12).add('start', 2, 11).add('portal', 38, 11)
      .build({ id: 'cannon-test', name: 'Canhão', theme: 'vale', targetTimeSeconds: 60 });
    const simulation = new GameSimulation({ blueprint: { ...blueprint, objects: [...blueprint.objects, ...(cannon ? [cannon] : [])] }, hero: 'pedro', rules: DIFFICULTY_RULES.aventura, isTouch: false, listener: () => {} });
    expect(simulation.grid.isSolidCell(8, 10)).toBeTrue();
    simulation.step(IDLE_INPUT);
    const first = simulation.enemies.find((enemy) => enemy.kind === 'bullet');
    expect(first).toBeDefined();
    first?.defeat(simulation.clockMs);
    for (let step = 0; step < 200; step += 1) simulation.step(IDLE_INPUT);
    expect(simulation.enemies.some((enemy) => enemy.kind === 'bullet' && !enemy.isDefeated)).toBeTrue();
    expect(simulation.enemies.length).toBeLessThan(5);
  });
});

describe('Disparos dos canhões', () => {
  const cannon = { id: 'cannon', type: 'cannon', x: 8, y: 10 } as const;
  const cannonCenterX = (cannon.x + 0.5) * TILE_SIZE;

  function shooter() {
    return jasmine.createSpy('shoot').and.callFake((x: number, y: number, direction: 1 | -1) => {
      const bullet = new Enemy(1, 'bullet', x, y, 1, () => false, 0, 1, true);
      bullet.direction = direction;
      return bullet;
    });
  }

  it('espera fora da distância ativa e dispara ao entrar no limite', () => {
    const system = new CannonSystem([cannon, { id: 'coin', type: 'coin', x: 3, y: 10 }]);
    const shoot = shooter();
    system.update(0, cannonCenterX + 1001, shoot);
    system.update(100, cannonCenterX - 1001, shoot);
    expect(shoot).not.toHaveBeenCalled();
    system.update(200, cannonCenterX + 1000, shoot);
    expect(shoot).toHaveBeenCalledOnceWith(9, 10, 1);
  });

  for (const [offset, direction] of [[-1, -1], [1, 1], [0, 1]] as const) {
    it(`dispara pela boca correta com o herói no deslocamento ${offset}`, () => {
      const system = new CannonSystem([cannon]);
      const shoot = shooter();
      system.update(0, cannonCenterX + offset, shoot);
      expect(shoot).toHaveBeenCalledOnceWith(cannon.x + direction, cannon.y, direction);
    });
  }

  it('mantém apenas uma bala viva mesmo depois de completar várias recargas', () => {
    const system = new CannonSystem([cannon]);
    const shoot = shooter();
    system.update(0, cannonCenterX, shoot);
    for (let reload = 1; reload <= 5; reload += 1) {
      system.update(reload * CANNON_RELOAD_MS, cannonCenterX, shoot);
    }
    expect(shoot).toHaveBeenCalledTimes(1);
    shoot.calls.first().returnValue.defeat(5 * CANNON_RELOAD_MS);
    system.update(5 * CANNON_RELOAD_MS, cannonCenterX, shoot);
    expect(shoot).toHaveBeenCalledTimes(2);
  });

  it('aguarda a recarga completa após a derrota e aceita o instante exato do limite', () => {
    const system = new CannonSystem([cannon]);
    const shoot = shooter();
    const firstShotAt = 100;
    system.update(firstShotAt, cannonCenterX, shoot);
    shoot.calls.first().returnValue.defeat(firstShotAt + 1);
    system.update(firstShotAt + CANNON_RELOAD_MS - 1, cannonCenterX, shoot);
    expect(shoot).toHaveBeenCalledTimes(1);
    system.update(firstShotAt + CANNON_RELOAD_MS, cannonCenterX - 1, shoot);
    expect(shoot).toHaveBeenCalledTimes(2);
    expect(shoot.calls.mostRecent().args).toEqual([7, 10, -1]);
  });

  it('recarrega cada canhão de forma independente', () => {
    const system = new CannonSystem([cannon, { ...cannon, id: 'second', x: 12 }]);
    const shoot = shooter();
    system.update(0, cannonCenterX, shoot);
    expect(shoot).toHaveBeenCalledTimes(2);
    shoot.calls.first().returnValue.defeat(1);
    system.update(CANNON_RELOAD_MS, cannonCenterX, shoot);
    expect(shoot).toHaveBeenCalledTimes(3);
    expect(shoot.calls.mostRecent().args).toEqual([9, 10, 1]);
  });
});
