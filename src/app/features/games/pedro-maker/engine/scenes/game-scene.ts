import * as Phaser from 'phaser';

import { THEME_PALETTES } from '../../art/palettes';
import { TEXTURES } from '../../art/texture-catalog';
import { POWER_UP_LABELS } from '../../config/object-catalog';
import { PLAYER_PHYSICS, POWER_UP_DURATION_MS, SURPRISE_COIN_COUNT, TILE_SIZE } from '../../config/physics.config';
import type { LevelObject, PowerUpKind } from '../../models/level.model';
import type { LevelRunResult } from '../../models/progress.model';
import type { GameLaunchOptions, GameSessionEvent, MakerSoundCue } from '../../models/session.model';
import { createAnimations } from '../animations';
import { DEPTH, Effects } from '../effects';
import { Boss, type BossHost } from '../entities/boss';
import { Enemy } from '../entities/enemy';
import { Player, type PlayerHost } from '../entities/player';
import { BlockSystem, type BlockHost, type SpawnExtra } from '../level/blocks';
import { type Collectible, CollectibleSystem, type CollectibleHost } from '../level/collectibles';
import { Parallax } from '../level/parallax';
import { buildTerrain, type Terrain } from '../level/terrain';
import { TriggerSystem, type TriggerHost } from '../level/triggers';
import { PlayerInput } from '../player-input';

export const GAME_SCENE_KEY = 'pedro-maker-game';

/** Passo máximo de um quadro: depois de uma aba parada, nada atravessa paredes. */
const MAX_FRAME_MS = 50;

/** Distância além da câmera em que os inimigos continuam acordados. */
const ENEMY_ACTIVE_MARGIN = 240;

/** Quanto a câmera se adianta na direção em que o Pedro olha. */
const LOOK_AHEAD = 140;

/** Distância, em células, a partir da qual o chefão acorda. */
const BOSS_WAKE_DISTANCE = 11;

const VICTORY_DELAY_MS = 1300;
const DEFEAT_DELAY_MS = 700;
const CHEST_COINS = 10;
const DECOR_TEXTURES: Readonly<Partial<Record<LevelObject['type'], string>>> = {
  tree: TEXTURES.tree,
  bush: TEXTURES.bush,
  flower: TEXTURES.flower,
  rock: TEXTURES.rock,
};

/**
 * A fase em andamento.
 *
 * Monta o mundo a partir da planta, liga os sistemas entre si e cuida das
 * regras da partida: corações, moedas, cristais, checkpoint, vitória e o
 * "quase!" quando os corações acabam. Tudo o que a tela precisa saber sai
 * como evento pelo `listener` — a cena nunca toca no Angular.
 *
 * O relógio da partida (`clockMs`) só anda enquanto a cena roda: pausa não
 * conta tempo, não gasta power-up e não encerra invencibilidade.
 */
export class GameScene
  extends Phaser.Scene
  implements PlayerHost, BlockHost, CollectibleHost, TriggerHost, BossHost
{
  // Os campos abaixo nascem em `create`, que o Phaser chama antes de qualquer `update`.
  effects!: Effects;
  private player!: Player;
  private playerInput!: PlayerInput;
  private terrain!: Terrain;
  private blocks!: BlockSystem;
  private collectibles!: CollectibleSystem;
  private triggers!: TriggerSystem;
  private parallax!: Parallax;
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private bossWakeX = 0;
  private petFollower: Phaser.GameObjects.Text | null = null;

  private clockMs = 0;
  private hearts = 0;
  private coins = 0;
  private coinsTotal = 0;
  private crystalsFound: boolean[] = [];
  private enemiesDefeated = 0;
  private respawn = new Phaser.Math.Vector2();
  private isFinished = false;
  private isDefeated = false;
  private bossDefeated = false;
  private lookAhead = 0;
  private readonly playerCenter = new Phaser.Math.Vector2();
  private readonly playerBounds = new Phaser.Geom.Rectangle();
  private bossGroundY = 0;

  constructor(private readonly options: GameLaunchOptions) {
    super({ key: GAME_SCENE_KEY });
  }

  get isTouch(): boolean {
    return this.options.isTouch;
  }

  create(): void {
    try {
      this.buildLevel();
      this.emit({ type: 'ready' });
      this.emitHud();
    } catch (error) {
      console.error('Pedro Maker: a fase não pôde ser montada.', error);
      this.emit({ type: 'error', message: 'Não foi possível montar esta fase.' });
    }
  }

  override update(_time: number, delta: number): void {
    if (this.isFinished || this.isDefeated || !this.player) {
      return;
    }

    const deltaMs = Math.min(delta, MAX_FRAME_MS);
    this.clockMs += deltaMs;

    const input = this.playerInput.read();

    if (input.pausePressed) {
      this.emit({ type: 'pause-requested' });
    }

    const body = this.player.arcadeBody;
    const isOnIce = this.terrain.isIceAt(this.player.x, body.bottom + 4);

    this.player.step(this.clockMs, deltaMs, input, isOnIce);
    this.playerCenter.set(this.player.x, body.center.y);

    this.blocks.update();
    this.updateEnemies();
    this.updateBoss();
    this.collectibles.update(deltaMs, this.playerCenter.x, this.playerCenter.y, this.player.hasPowerUp('magnet'));
    this.triggers.update(deltaMs, this.playerCenter, input.actionPressed);
    this.checkHazards();
    this.updateCamera(deltaMs);
    this.updatePetFollower(deltaMs);
    this.parallax.update(this.cameras.main, deltaMs, this.player.x, this.playerCenter.y);
  }

  /* Comandos vindos da tela ------------------------------------------------------ */

  /** Volta ao último checkpoint com os corações cheios. */
  retryFromCheckpoint(): void {
    if (!this.player) {
      return;
    }

    this.hearts = this.options.rules.hearts;
    this.isDefeated = false;
    this.player.clearPowerUps();
    this.player.placeFeetAt(this.respawn.x, this.respawn.y);
    this.player.revive(this.clockMs, this.options.rules.invincibilityMs);
    this.playerInput.reset();
    this.cameras.main.flash(250, 255, 255, 255);
    this.emitHud();
  }

  /** Esquece o que estava apertado ao voltar da pausa. */
  releaseInput(): void {
    this.playerInput?.reset();
  }

  /* Montagem ------------------------------------------------------------------------ */

  private buildLevel(): void {
    const { blueprint } = this.options;
    const palette = THEME_PALETTES[blueprint.theme];
    const worldWidth = blueprint.width * TILE_SIZE;
    const worldHeight = blueprint.height * TILE_SIZE;

    this.resetRunState();
    createAnimations(this.anims);

    // Sem chão no fundo do mundo: cair num buraco é cair de verdade.
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight + TILE_SIZE * 6);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.effects = new Effects(this, this.options.effectsEnabled);
    this.parallax = new Parallax(this, palette);
    this.terrain = buildTerrain(this, blueprint);

    const crystalIndexOf = indexCrystals(blueprint.objects);
    this.crystalsFound = Array.from({ length: crystalIndexOf.size }, () => false);

    this.blocks = new BlockSystem(this, blueprint.objects, crystalIndexOf, this);
    this.collectibles = new CollectibleSystem(this, blueprint.objects, crystalIndexOf, this);
    this.triggers = new TriggerSystem(this, blueprint.objects, this);
    this.coinsTotal = this.collectibles.coinCount + countSurpriseCoins(blueprint.objects) * SURPRISE_COIN_COUNT;

    this.addDecorations(blueprint.objects);
    this.createPlayer(blueprint.objects);
    this.createEnemies(blueprint.objects);
    this.createBoss(blueprint.objects);
    this.connectPhysics();
    this.setUpCamera(worldWidth, worldHeight);
    this.createPetFollower();

    this.playerInput = new PlayerInput(this.input.keyboard, this.options.input);
  }

  private resetRunState(): void {
    this.clockMs = 0;
    this.hearts = this.options.rules.hearts;
    this.coins = 0;
    this.enemiesDefeated = 0;
    this.enemies = [];
    this.boss = null;
    this.isFinished = false;
    this.isDefeated = false;
    this.bossDefeated = false;
    this.lookAhead = 0;
    this.petFollower = null;
  }

  private addDecorations(objects: readonly LevelObject[]): void {
    for (const object of objects) {
      const texture = DECOR_TEXTURES[object.type];

      if (texture) {
        this.add
          .image(object.x * TILE_SIZE + TILE_SIZE / 2, (object.y + 1) * TILE_SIZE, texture)
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.decor);
      }
    }
  }

  private createPlayer(objects: readonly LevelObject[]): void {
    const start = objects.find((object) => object.type === 'start');

    if (!start) {
      throw new Error('A fase não tem ponto de início.');
    }

    const feetX = start.x * TILE_SIZE + TILE_SIZE / 2;
    const feetY = (start.y + 1) * TILE_SIZE;

    this.respawn.set(feetX, feetY);
    this.player = new Player(this, feetX, feetY, this);
  }

  private createEnemies(objects: readonly LevelObject[]): void {
    const speed = this.options.rules.enemySpeed;

    for (const object of objects) {
      if (object.type === 'slime' || object.type === 'spiky' || object.type === 'bat' || object.type === 'robot' || object.type === 'ghost') {
        this.enemies.push(new Enemy(this, object.type, object.x, object.y, speed, this.isSolidAt));
      }
    }
  }

  private createBoss(objects: readonly LevelObject[]): void {
    const definition = this.options.blueprint.boss;
    const marker = objects.find((object) => object.type === 'boss');

    if (!definition || !marker) {
      return;
    }

    const arenaLeft = Math.max(0, marker.x - 22) * TILE_SIZE;
    let arenaRightCell = marker.x;

    while (arenaRightCell < this.options.blueprint.width - 1 && !this.isSolidAt(arenaRightCell * TILE_SIZE + 1, marker.y * TILE_SIZE + 1)) {
      arenaRightCell += 1;
    }

    this.boss = new Boss(this, definition, marker.x, marker.y, arenaLeft, arenaRightCell * TILE_SIZE, this);
    this.bossWakeX = (marker.x - BOSS_WAKE_DISTANCE) * TILE_SIZE;
    this.bossGroundY = (marker.y + 1) * TILE_SIZE;
    this.triggers.closePortal();
  }

  private connectPhysics(): void {
    const physics = this.physics.add;
    const { layer } = this.terrain;

    physics.collider(this.player, layer);
    physics.collider(this.player, this.blocks.solids, (_player, block) =>
      this.blocks.handlePlayerContact(this.player, block as Phaser.Physics.Arcade.Sprite),
    );
    physics.collider(this.player, this.blocks.movers);

    // O array é lido a cada passo: ajudantes do chefão entram nele depois e já colidem.
    physics.collider(this.enemies, layer);
    physics.collider(this.enemies, this.blocks.solids);
    physics.collider(this.enemies, this.blocks.movers);
    physics.overlap(this.player, this.enemies, (_player, enemy) => this.onEnemyContact(enemy as Enemy));

    if (this.boss) {
      physics.collider(this.boss, layer);
      physics.overlap(this.player, this.boss, () => this.onBossContact());
    }
  }

  private setUpCamera(worldWidth: number, worldHeight: number): void {
    const camera = this.cameras.main;

    camera.setBounds(0, 0, worldWidth, worldHeight);
    camera.startFollow(this.player, true, 0.12, 0.12);
    camera.setDeadzone(200, 150);
    camera.setRoundPixels(true);
  }

  private createPetFollower(): void {
    const emoji = this.options.petEmoji;

    if (!emoji) {
      return;
    }

    this.petFollower = this.add
      .text(this.player.x - 50, this.player.y - 60, emoji, { fontSize: '34px' })
      .setOrigin(0.5)
      .setDepth(DEPTH.player - 1);
  }

  /* Quadro a quadro ------------------------------------------------------------------ */

  private updateEnemies(): void {
    const view = this.cameras.main.worldView;
    const left = view.x - ENEMY_ACTIVE_MARGIN;
    const right = view.right + ENEMY_ACTIVE_MARGIN;
    const fallLimit = this.physics.world.bounds.bottom - TILE_SIZE;

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];

      if (!enemy.active) {
        this.enemies.splice(index, 1);
        continue;
      }

      if (enemy.y > fallLimit) {
        this.enemies.splice(index, 1);
        enemy.destroy();
        continue;
      }

      const isAwake = enemy.x > left && enemy.x < right;
      enemy.arcadeBody.moves = isAwake;

      if (isAwake) {
        enemy.step(this.clockMs, this.playerCenter);
      } else {
        enemy.freeze();
      }
    }
  }

  private updateBoss(): void {
    const boss = this.boss;

    if (!boss?.active) {
      return;
    }

    if (!boss.isAwake && !this.bossDefeated && this.player.x >= this.bossWakeX) {
      boss.wake(this.clockMs);
      this.emitBoss(boss.hitPoints);
    }

    boss.step(this.clockMs, this.player.x);
  }

  private checkHazards(): void {
    if (!this.player.isActive) {
      return;
    }

    const body = this.player.arcadeBody;
    const fellOut = body.top > this.options.blueprint.height * TILE_SIZE + TILE_SIZE;

    this.playerBounds.setTo(body.x, body.y, body.width, body.height);

    const touchesLava = this.blocks.hazards.some((hazard) =>
      Phaser.Geom.Intersects.RectangleToRectangle(hazard, this.playerBounds),
    );

    if (fellOut || touchesLava) {
      this.loseHeart();

      if (!this.isDefeated) {
        this.player.placeFeetAt(this.respawn.x, this.respawn.y);
        this.player.revive(this.clockMs, this.options.rules.invincibilityMs);
        this.cameras.main.flash(200, 255, 255, 255);
      }
    }
  }

  private updateCamera(deltaMs: number): void {
    const target = this.player.flipX ? LOOK_AHEAD : -LOOK_AHEAD;

    this.lookAhead = Phaser.Math.Linear(this.lookAhead, target, Math.min(1, deltaMs / 400));
    this.cameras.main.setFollowOffset(this.lookAhead, 0);
  }

  private updatePetFollower(deltaMs: number): void {
    const pet = this.petFollower;

    if (!pet) {
      return;
    }

    const side = this.player.flipX ? 1 : -1;
    const bob = Math.sin(this.clockMs / 260) * 6;
    const follow = Math.min(1, deltaMs / 160);

    pet.setPosition(
      Phaser.Math.Linear(pet.x, this.player.x + side * 46, follow),
      Phaser.Math.Linear(pet.y, this.player.y - 58 + bob, follow),
    );
  }

  /* Contatos --------------------------------------------------------------------------- */

  private onEnemyContact(enemy: Enemy): void {
    if (!this.player.isActive || !enemy.isHarmful) {
      return;
    }

    const body = this.player.arcadeBody;
    const isStomp = body.velocity.y > 0 && body.bottom <= enemy.arcadeBody.top + PLAYER_PHYSICS.stompTolerance;

    if (isStomp && enemy.canBeStomped) {
      enemy.defeat();
      this.enemiesDefeated += 1;
      this.player.bounce(PLAYER_PHYSICS.stompBounceVelocity, true);
      this.playSound('enemyHit');
      this.effects.burst('poof', enemy.x, enemy.y, 12);
      return;
    }

    this.hurtPlayer(enemy.x);
  }

  private onBossContact(): void {
    const boss = this.boss;

    if (!boss?.isAwake || !this.player.isActive) {
      return;
    }

    const body = this.player.arcadeBody;
    const isStomp = body.velocity.y > 0 && body.bottom <= boss.arcadeBody.top + PLAYER_PHYSICS.stompTolerance * 1.5;

    if (isStomp) {
      // Pisar no chefão nunca machuca o Pedro; só conta quando ele está cansado.
      this.player.bounce(PLAYER_PHYSICS.stompBounceVelocity * 1.15, true);
      boss.takeHit(this.clockMs);
      return;
    }

    if (boss.isHarmful) {
      this.hurtPlayer(boss.x);
    }
  }

  private hurtPlayer(sourceX: number): void {
    const now = this.clockMs;

    if (this.player.isInvincible(now) || !this.player.isActive) {
      return;
    }

    if (this.player.hasShield) {
      this.player.hasShield = false;
      this.player.makeInvincible(now, 1000);
      this.effects.burst('sparkle', this.player.x, this.player.y, 16);
      this.effects.floatingText(this.player.x, this.player.y - 60, '🛡️ PROTEGIDO!');
      this.playSound('powerup');
      this.emit({ type: 'power-up-ended', kind: 'shield' });
      this.emitHud();
      return;
    }

    this.loseHeart();

    if (!this.isDefeated) {
      this.player.showHitPose(now, Math.sign(this.player.x - sourceX) || 1);
      this.player.makeInvincible(now, this.options.rules.invincibilityMs);
    }
  }

  private loseHeart(): void {
    this.hearts = Math.max(0, this.hearts - 1);
    this.playSound('damage');
    this.effects.shake('leve');
    this.emit({ type: 'damage' });
    this.emitHud();

    if (this.hearts === 0) {
      this.isDefeated = true;
      this.player.defeat();
      this.time.delayedCall(DEFEAT_DELAY_MS, () => this.emit({ type: 'defeated' }));
    }
  }

  /* Anfitrião dos sistemas ------------------------------------------------------------ */

  playSound(cue: MakerSoundCue): void {
    this.emit({ type: 'sound', cue });
  }

  onPowerUpEnded(kind: PowerUpKind): void {
    this.emit({ type: 'power-up-ended', kind });
  }

  addCoins(amount: number, x: number, y: number): void {
    this.coins += amount;
    this.playSound('coin');
    this.effects.floatingText(x, y - 20, `+${amount}`, '#ffe066');
    this.emitHud();
  }

  spawnCollectible(kind: 'heart' | 'crystal' | 'power-up', x: number, y: number, extra: SpawnExtra): void {
    this.collectibles.spawn(kind, x, y, extra, true);
  }

  onCollected(item: Collectible): void {
    const { x, y } = item.sprite;

    switch (item.kind) {
      case 'coin':
        this.coins += 1;
        this.playSound('coin');
        this.effects.burst('coin', x, y, 5);
        break;
      case 'crystal':
        if (item.crystalIndex !== undefined) {
          this.crystalsFound[item.crystalIndex] = true;
        }

        this.playSound('crystal');
        this.effects.burst('crystal', x, y, 18);
        this.effects.floatingText(x, y - 30, '💎 CRISTAL!', '#9ee8ff');
        this.emit({ type: 'mascot', text: 'Uau! Você encontrou um cristal!' });
        break;
      case 'heart':
        this.hearts = Math.min(this.options.rules.hearts, this.hearts + 1);
        this.playSound('powerup');
        this.effects.floatingText(x, y - 30, '❤️ +1', '#ff8fa3');
        break;
      case 'power-up':
        this.activatePowerUp(item.powerUp ?? 'super-jump', x, y);
        break;
    }

    this.emitHud();
  }

  onCheckpoint(feetX: number, feetY: number): void {
    this.respawn.set(feetX, feetY);
    this.playSound('checkpoint');
    this.emit({ type: 'checkpoint' });
  }

  onDoor(destinationFeetX: number, destinationFeetY: number): void {
    this.playSound('button');
    this.cameras.main.flash(220, 255, 255, 255);
    this.player.placeFeetAt(destinationFeetX, destinationFeetY);
  }

  onSecretDoor(): void {
    this.playSound('secret');
    this.effects.floatingText(this.player.x, this.player.y - 80, '🌟 SEGREDO!', '#ffe066');
    this.emit({ type: 'secret-found' });
  }

  onPortal(centerX: number, centerY: number): void {
    this.isFinished = true;
    this.player.celebrate();
    this.playSound('victory');
    this.effects.burst('confetti', centerX, centerY, 50);
    this.effects.burst('sparkle', centerX, centerY, 30);

    this.tweens.add({
      targets: this.player,
      x: centerX,
      y: centerY,
      scale: 0.2,
      alpha: 0.3,
      angle: 360,
      duration: 900,
      ease: 'Cubic.easeIn',
    });

    this.time.delayedCall(VICTORY_DELAY_MS, () => this.emit({ type: 'completed', result: this.result() }));
  }

  onChestOpened(x: number, y: number): void {
    this.addCoins(CHEST_COINS, x, y);
    this.playSound('victory');
    this.triggers.openPortal();
    this.emit({ type: 'mascot', text: 'Um baú de tesouro! O portal abriu!' });
  }

  onMascotTip(text: string): void {
    this.emit({ type: 'mascot', text });
  }

  spawnMinion(worldX: number, worldY: number): void {
    const kind = this.options.blueprint.boss?.minion ?? 'slime';
    const cellX = Phaser.Math.Clamp(Math.floor(worldX / TILE_SIZE), 1, this.options.blueprint.width - 2);
    const cellY = Math.max(1, Math.floor(worldY / TILE_SIZE));
    const minion = new Enemy(this, kind, cellX, cellY, this.options.rules.enemySpeed, this.isSolidAt);

    minion.setScale(0.8);
    this.enemies.push(minion);
    this.effects.burst('poof', minion.x, minion.y, 10);
  }

  onHitPointsChanged(hitPoints: number): void {
    this.emitBoss(hitPoints);
  }

  onDefeated(x: number): void {
    this.bossDefeated = true;
    this.enemiesDefeated += 1;
    this.emit({ type: 'boss', boss: null });

    for (const enemy of this.enemies) {
      if (!enemy.isDefeated) {
        enemy.defeat();
      }
    }

    this.triggers.dropChest(x, this.bossGroundY);
  }

  /* Auxiliares ------------------------------------------------------------------------ */

  private readonly isSolidAt = (worldX: number, worldY: number): boolean =>
    this.terrain.isSolidAt(worldX, worldY) || this.blocks.isSolidAt(worldX, worldY);

  private activatePowerUp(kind: PowerUpKind, x: number, y: number): void {
    this.player.grantPowerUp(kind, this.clockMs);
    this.playSound('powerup');
    this.effects.burst('sparkle', x, y, 16);

    const { emoji, label } = POWER_UP_LABELS[kind];
    this.effects.floatingText(x, y - 30, `${emoji} ${label.toUpperCase()}!`, '#ffffff');
    this.emit({ type: 'power-up', kind, durationMs: POWER_UP_DURATION_MS[kind] });
  }

  private result(): LevelRunResult {
    return {
      timeMs: Math.round(this.clockMs),
      coinsCollected: this.coins,
      coinsTotal: this.coinsTotal,
      crystalsFound: [...this.crystalsFound],
      enemiesDefeated: this.enemiesDefeated,
      bossDefeated: this.bossDefeated,
    };
  }

  private emitHud(): void {
    this.emit({
      type: 'hud',
      hud: {
        hearts: this.hearts,
        maxHearts: this.options.rules.hearts,
        coins: this.coins,
        crystalsFound: this.crystalsFound.filter(Boolean).length,
        crystalsTotal: this.crystalsFound.length,
        hasShield: this.player?.hasShield ?? false,
      },
    });
  }

  private emitBoss(hitPoints: number): void {
    const definition = this.options.blueprint.boss;

    if (definition) {
      this.emit({
        type: 'boss',
        boss: { name: definition.name, emoji: definition.emoji, hitPoints, maxHitPoints: definition.hitPoints },
      });
    }
  }

  private emit(event: GameSessionEvent): void {
    this.options.listener(event);
  }
}

/** Índice de cada cristal, na ordem em que aparece na planta da fase. */
function indexCrystals(objects: readonly LevelObject[]): ReadonlyMap<LevelObject, number> {
  const index = new Map<LevelObject, number>();

  for (const object of objects) {
    if (object.type === 'crystal' || (object.type === 'surprise' && object.properties?.contents === 'crystal')) {
      index.set(object, index.size);
    }
  }

  return index;
}

function countSurpriseCoins(objects: readonly LevelObject[]): number {
  return objects.filter(
    (object) => object.type === 'surprise' && (object.properties?.contents ?? 'coins') === 'coins',
  ).length;
}
