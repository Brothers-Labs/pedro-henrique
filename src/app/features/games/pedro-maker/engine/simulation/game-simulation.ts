import { heroDefinition, nextHero } from '../../config/hero.config';
import { POWER_UP_LABELS } from '../../config/object-catalog';
import {
  BUBBLE_PHYSICS,
  DOUBLE_CHERRY,
  EXTRA_LIFE,
  GIGA_PHYSICS,
  HAMMER_PHYSICS,
  MAGNET_MUSHROOM_RADIUS,
  MAGNET_RADIUS,
  PLAYER_PHYSICS,
  POW_BLOCK,
  POWER_UP_DURATION_MS,
  RACCOON_SUIT_PHYSICS,
  SURPRISE_COIN_COUNT,
  TILE_SIZE,
  VIEW_HEIGHT,
} from '../../config/physics.config';
import { SeededRandom, seedFromText } from '../../levels/seeded-random';
import {
  CLASSIC_POWER_UPS,
  COIN_MULTIPLIER_KINDS,
  COIN_MULTIPLIERS,
  type EnemyKind,
  isEnemyKind,
  isGiantCoinType,
  type LevelBlueprint,
  type LevelObject,
  type PowerUpKind,
} from '../../models/level.model';
import type { HeroId, LevelRunResult } from '../../models/progress.model';
import type { GameSessionEvent, GameSessionListener, MakerSoundCue } from '../../models/session.model';
import type { DifficultyRules } from '../../models/settings.model';
import { IDLE_INPUT, type InputSnapshot } from '../input/input-snapshot';
import { BlockSystem, type BlockHost, type SpawnExtra } from './blocks';
import { CannonSystem } from './cannons';
import { ClimbChainSystem } from './climb-chains';
import { crusherCenterX, CrusherSystem } from './crushers';
import { FireBarSystem } from './fire-bars';
import { FireTrapSystem } from './fire-traps';
import { type PSwitchHost, PSwitchSystem } from './p-switch';
import { Boss, type BossHost } from './boss';
import { type Collectible, CollectibleSystem, type CollectibleHost, coinValue, MEGA_COIN } from './collectibles';
import { Enemy, ENEMY_DEFEAT_MS, WALKING_BOMB } from './enemy';
import { type BallElement, type Fireball, FireballSystem } from './fireballs';
import { type LockHost, LockSystem } from './locks';
import {
  bottom,
  centerX,
  centerY,
  isAreaClear,
  overlaps,
  type PhysicsBody,
  type PhysicsWorld,
  stepBody,
  type WorldArea,
} from './physics-body';
import { Player, type PlayerHost, type PlayerSurroundings, SUIT_POWER_UPS } from './player';
import { Scheduler } from './scheduler';
import { SlideSystem } from './slides';
import { cellOf, COLLISION, TileGrid } from './tile-grid';
import { type Chest, type DoorKind, TriggerSystem, type TriggerHost } from './triggers';
import { VisualEventQueue } from './visual-events';

/** Um passo fixo de física: 60 por segundo em qualquer tela, de 60 ou 120 Hz. */
export const STEP_MS = 1000 / 60;

/** A batida da prensa no chão só treme a tela com o herói a menos de dez blocos dela. */
const CRUSHER_SHAKE_DISTANCE = TILE_SIZE * 10;

/** Distância do Pedro além da qual os inimigos esperam parados. */
const ENEMY_ACTIVE_DISTANCE = 1000;

/** Distância, em células, a partir da qual o chefão acorda. */
const BOSS_WAKE_DISTANCE = 11;

/** O que o botão de ação faz com cada traje, na dica do mascote. */
const ACTION_TIPS: Readonly<Partial<Record<PowerUpKind, string>>> = {
  'fire-flower': 'para soltar bolas de fogo!',
  'ice-flower': 'para soltar bolas de gelo!',
  'bubble-flower': 'para soprar bolhas! Elas voam reto e prendem os inimigos.',
  'raccoon-leaf': 'para girar o rabo! E segure o pulo no ar para voar.',
  'propeller-mushroom': 'para girar a hélice e subir bem alto! Segure o pulo para descer devagar.',
  hammer: 'para dar marteladas! Elas derrubam qualquer inimigo e batem nos blocos.',
  'penguin-suit': 'para soltar bolas de gelo! No gelo o pinguim não escorrega, e na água ele nada ligeiro.',
};

/** Dica do mascote para os poderes que mudam o jeito de se mexer. */
const MOVEMENT_TIPS: Readonly<Partial<Record<PowerUpKind, string>>> = {
  'cat-mushroom': 'Pule numa parede e continue indo para o lado dela: você escala!',
  'leaf-mushroom': 'Segure o pulo enquanto cai para planar como uma folha!',
  'giga-mushroom': 'Você ficou gigante! Esbarre nos inimigos e nos tijolos!',
  'turbo-mushroom': 'Turbo ligado! Corra bem rápido antes que acabe!',
  'magnet-mushroom': 'Ímã ligado! As moedas vêm voando até você!',
  'reverse-mushroom': 'Cogumelo Reverso! Agora a esquerda vai para a direita e a direita vai para a esquerda!',
  'coin-x2': 'Moeda ×2! Cada moeda que você pegar agora vale o dobro!',
  'coin-x4': 'Moeda ×4! Cada moeda que você pegar agora vale quatro!',
  'coin-x1000': 'Moeda ×1000! Corra pegar moedas: cada uma vale mil!',
  'coin-x9999': 'Moeda ×9999! A mais forte de todas: cada moeda vale 9999!',
  'mini-mushroom': 'Você ficou pequenininho! Passe pelos buraquinhos e pule bem levinho!',
  'tall-mushroom': 'Você ficou bem alto! Alcança lá em cima, mas o músculo é fraco: o pulo fica baixinho.',
  'wing-cap': 'Chapéu de Voar! Segure o pulo no ar para voar à vontade, e solte para planar!',
  boot: 'Com a Bota, os espinhos não machucam e o pisão derruba até o espinhudo!',
};

/** O som de cada bola lançada pelas flores. */
const BALL_SOUNDS: Readonly<Record<BallElement, MakerSoundCue>> = {
  fire: 'fireball',
  ice: 'iceball',
  bubble: 'bubble',
};

/** Amigos que entram junto com o Jogador 1: o Jogador 2 e o Jogador 3. */
export const MAX_PARTNERS = 2;

/**
 * Até onde um amigo pode se afastar do Jogador 1, em pixels. A câmera segue o
 * Jogador 1; quem fica para trás além disso volta para perto dele num estalo,
 * antes de sumir da tela.
 */
export const PARTNER_LEASH = { x: TILE_SIZE * 8, y: TILE_SIZE * 6 } as const;

/** Distância entre os heróis quando a turma aparece junta: no começo, numa porta ou no checkpoint. */
const PARTNER_GAP = TILE_SIZE * 0.75;

/** Os amigos pegam moedas, cristais e corações para a turma; cogumelos e flores ficam para o Jogador 1. */
const isTeamCollectible = (item: Collectible): boolean => item.kind !== 'power-up';

const VICTORY_DELAY_MS = 1300;
const DEFEAT_DELAY_MS = 700;
/** O baú do chefão é o tesouro da fase: chove moeda. */
const BOSS_CHEST_COINS = 100;
/** Baú de moedas colocado no editor. */
const COIN_CHEST_COINS = 25;
/** Moedas que a porta dourada dá na primeira passagem. */
const GOLDEN_DOOR_COINS = 10;
/** Tempo em que os slimes do Rei Slime não machucam: nascem colados no herói que pisou. */
const SPLIT_GRACE_MS = 600;
/** Espinhudos do mesmo Rei Cacto soltos ao mesmo tempo: o bastante para o desafio, sem lotar a tela. */
const MAX_CACTUS_SPROUTS = 2;
/** O espinhudo do Rei Cacto é um filhote: menor que o espinhudo comum. */
const CACTUS_SPROUT_SCALE = 0.7;
/** O pulinho com que o espinhudo sai do Rei Cacto. */
const CACTUS_SPROUT_HOP_VELOCITY = 420;
/** A chuva da Moeda Gigantesca: dois anéis em volta dela, em blocos a partir do centro. */
const MEGA_COIN_RINGS = [
  { radius: 1.7, count: 8 },
  { radius: 2.8, count: 12 },
] as const;

export interface SimulationOptions {
  readonly blueprint: LevelBlueprint;
  readonly hero: HeroId;
  readonly rules: DifficultyRules;
  readonly isTouch: boolean;
  readonly listener: GameSessionListener;
  /**
   * Heróis dos amigos que jogam junto, na ordem: o Jogador 2 e o Jogador 3.
   * Sem amigos (ou sem a lista), é a partida de sempre, de uma criança só.
   */
  readonly partners?: readonly HeroId[];
}

/**
 * A fase em andamento, sem tela nenhuma.
 *
 * Monta o mundo a partir da planta, liga os sistemas entre si e cuida das
 * regras da partida: corações, moedas, cristais, checkpoint, vitória e o
 * "quase!" quando os corações acabam. O que o Angular precisa saber sai pelo
 * `listener`; o que a tela precisa mostrar fica no estado público e na fila de
 * efeitos.
 *
 * Há dois relógios: `clockMs` anima e agenda e nunca para enquanto a partida
 * roda; `runTimeMs` é o tempo que vale para o resultado e para no portal.
 */
export class GameSimulation implements PlayerHost, BlockHost, CollectibleHost, TriggerHost, BossHost, PSwitchHost, LockHost {
  readonly effects = new VisualEventQueue();
  readonly scheduler = new Scheduler();
  readonly grid: TileGrid;
  readonly player: Player;
  /**
   * Os amigos do Jogador 1: o Jogador 2 e o Jogador 3. Andam, pulam, pisam
   * nos inimigos, batem nos blocos e pegam moedas para a turma. Não perdem
   * coração: quem se machuca, cai ou fica longe volta para perto do Jogador 1.
   * Portas, bandeiras e o portal são com o Jogador 1, que leva a turma.
   */
  readonly partners: readonly Player[];
  /**
   * Clones do Cogumelo Cereja: apertam os mesmos botões do Jogador 1, pisam
   * nos inimigos, batem nos blocos e pegam moedas para a turma. Não têm poder
   * nenhum nem coração: quem se machuca, cai ou fica para trás some num estalo.
   */
  readonly clones: Player[] = [];
  readonly blocks: BlockSystem;
  readonly collectibles: CollectibleSystem;
  readonly triggers: TriggerSystem;
  readonly slides: SlideSystem;
  readonly cannons: CannonSystem;
  readonly fireBars: FireBarSystem;
  readonly fireTraps: FireTrapSystem;
  readonly pSwitches: PSwitchSystem;
  readonly locks: LockSystem;
  readonly crushers: CrusherSystem;
  readonly climbChains: ClimbChainSystem;
  readonly fireballs = new FireballSystem();
  readonly enemies: Enemy[] = [];
  boss: Boss | null = null;

  clockMs = 0;
  isFinished = false;
  isDefeated = false;

  private readonly world: PhysicsWorld;
  private readonly random: SeededRandom;
  private runTimeMs = 0;
  private hearts: number;
  /** Corações a mais dos Cogumelos 1UP pegos nesta partida, além do máximo da fase. */
  private extraHearts = 0;
  private currentHero: HeroId;
  private coins = 0;
  private readonly coinsTotal: number;
  private readonly crystalsFound: boolean[];
  private enemiesDefeated = 0;
  private respawnX = 0;
  private respawnY = 0;
  private bossDefeated = false;
  private bossWakeX = 0;
  private bossGroundY = 0;
  private nextEnemyId = 1;
  /** Espinhudos que cada Rei Cacto já soltou. */
  private readonly cactusSprouts = new Map<Enemy, readonly Enemy[]>();

  constructor(private readonly options: SimulationOptions) {
    const { blueprint } = options;

    this.currentHero = options.hero;

    const crystalIndexOf = indexCrystals(blueprint.objects);

    this.random = new SeededRandom(seedFromText(blueprint.id));
    this.hearts = options.rules.hearts;
    this.crystalsFound = Array.from({ length: crystalIndexOf.size }, () => false);
    this.grid = TileGrid.fromBlueprint(blueprint);
    this.blocks = new BlockSystem(blueprint.objects, crystalIndexOf, this.grid, this);
    this.collectibles = new CollectibleSystem(blueprint.objects, crystalIndexOf, this);
    this.triggers = new TriggerSystem(blueprint.objects, options.isTouch, this);
    this.slides = new SlideSystem(blueprint.objects, this.grid);
    this.world = { grid: this.grid, platforms: this.blocks.platforms };
    this.coinsTotal = this.collectibles.coinCount + countSurpriseCoins(blueprint.objects) * SURPRISE_COIN_COUNT;
    this.player = this.createPlayer(blueprint.objects);
    this.partners = (options.partners ?? [])
      .slice(0, MAX_PARTNERS)
      .map((hero) => new Player(this.respawnX, this.respawnY, this, heroDefinition(hero).abilities));
    this.createEnemies(blueprint.objects);
    this.cannons = new CannonSystem(blueprint.objects);
    this.fireBars = new FireBarSystem(blueprint.objects);
    this.fireTraps = new FireTrapSystem(blueprint.objects, this.grid);
    this.pSwitches = new PSwitchSystem(blueprint.objects, this.grid, this.blocks, this.collectibles, this);
    this.locks = new LockSystem(blueprint.objects, this.grid, this);
    // Depois das portas e correntes: a prensa desce só até o primeiro bloco firme embaixo dela.
    this.crushers = new CrusherSystem(blueprint.objects, this.grid);
    this.climbChains = new ClimbChainSystem(blueprint.objects);
    this.createBoss(blueprint.objects);
    // Por último: portas trancadas e prensas já marcaram na grade onde não cabe ninguém.
    this.gatherPartners(this.respawnX, this.respawnY);
  }

  get blueprint(): LevelBlueprint {
    return this.options.blueprint;
  }

  /** Herói em cena: começa o escolhido e muda a cada Cogumelo Troca-Personagem. */
  get hero(): HeroId {
    return this.currentHero;
  }

  /** Avisa a tela de que a fase está de pé, com o placar inicial. */
  announceReady(): void {
    this.emit({ type: 'ready' });
    this.emitHud();
  }

  /** `partnerInputs` traz a entrada de cada amigo, na ordem de `partners`. */
  step(input: InputSnapshot, partnerInputs: readonly InputSnapshot[] = []): void {
    const seconds = STEP_MS / 1000;

    this.clockMs += STEP_MS;
    this.scheduler.run(this.clockMs);

    if (this.isFinished || this.isDefeated) {
      return;
    }

    this.runTimeMs += STEP_MS;

    // O Start do controle de um amigo também pausa: a pausa é da turma toda.
    if (input.pausePressed || partnerInputs.some((partnerInput) => partnerInput.pausePressed)) {
      this.emit({ type: 'pause-requested' });
    }

    const player = this.player;
    const body = player.body;

    player.control(this.clockMs, STEP_MS, input, this.surroundingsOf(body));
    this.blocks.update(seconds);

    if (player.isActive) {
      stepBody(body, this.world, seconds, true);
      this.reactToPlayerCollisions();
      this.catchSlide();
      this.throwBall(input);
      this.spinTail(input);
      this.launchPropeller(input);
      this.swingHammer(input);
      this.crushBricksAsGiant();
    }

    this.stepPartners(partnerInputs, seconds);
    this.stepClones(input, seconds);

    this.cannons.update(this.clockMs, centerX(body), (x, y, direction) => {
      const bullet = this.addEnemy('bullet', x, y, 1, true);
      bullet.direction = direction;
      return bullet;
    });
    this.updateEnemies(seconds);
    this.settleColorBlocks();
    this.updateFireballs(seconds);
    this.updateBoss(seconds);
    this.pSwitches.update(this.clockMs, player);
    this.locks.update(this.clockMs, body, player.isActive);
    this.updateCrushers();
    this.collectibles.update(STEP_MS, centerX(body), centerY(body), this.magnetRadius());
    this.triggers.update(this.clockMs, centerX(body), centerY(body), input.actionPressed);
    this.checkHazards();
    this.checkFireBars();
    this.checkFireTraps();
    this.checkPartners();
    this.checkClones();
  }

  /* Comandos vindos da tela ------------------------------------------------------ */

  /** Volta ao último checkpoint com os corações cheios — os do Cogumelo 1UP também. */
  retryFromCheckpoint(): void {
    this.hearts = this.maxHearts;
    this.isDefeated = false;
    this.player.clearPowerUps();
    this.player.placeFeetAt(this.respawnX, this.respawnY);
    this.player.revive(this.clockMs, this.options.rules.invincibilityMs);
    this.gatherPartners(this.respawnX, this.respawnY);
    this.dismissClones();
    this.effects.flash();
    this.emitHud();
  }

  /* Montagem ------------------------------------------------------------------------ */

  private createPlayer(objects: readonly LevelObject[]): Player {
    const start = objects.find((object) => object.type === 'start');

    if (!start) {
      throw new Error('A fase não tem ponto de início.');
    }

    this.respawnX = (start.x + 0.5) * TILE_SIZE;
    this.respawnY = (start.y + 1) * TILE_SIZE;

    return new Player(this.respawnX, this.respawnY, this, heroDefinition(this.currentHero).abilities);
  }

  private createEnemies(objects: readonly LevelObject[]): void {
    for (const object of objects) {
      if (isEnemyKind(object.type)) {
        this.addEnemy(object.type, object.x, object.y, 1);
      }
    }
  }

  private addEnemy(kind: EnemyKind, cellX: number, cellY: number, scale: number, isProjectile = false): Enemy {
    const enemy = new Enemy(
      this.nextEnemyId,
      kind,
      cellX,
      cellY,
      this.options.rules.enemySpeed,
      (worldX, worldY) => this.grid.isGroundAtPoint(worldX, worldY),
      this.random.next() * Math.PI * 2,
      scale,
      isProjectile,
    );

    this.nextEnemyId += 1;
    this.enemies.push(enemy);

    return enemy;
  }

  private createBoss(objects: readonly LevelObject[]): void {
    const definition = this.options.blueprint.boss;
    const marker = objects.find((object) => object.type === 'boss');

    if (!definition || !marker) {
      return;
    }

    const arenaLeft = Math.max(0, marker.x - 22) * TILE_SIZE;
    let arenaRightCell = marker.x;

    while (arenaRightCell < this.grid.width - 1 && !this.grid.isSolidCell(arenaRightCell, marker.y)) {
      arenaRightCell += 1;
    }

    this.boss = new Boss(definition, marker.x, marker.y, arenaLeft, arenaRightCell * TILE_SIZE, this);
    this.bossWakeX = (marker.x - BOSS_WAKE_DISTANCE) * TILE_SIZE;
    this.bossGroundY = (marker.y + 1) * TILE_SIZE;
    this.triggers.closePortal();
  }

  /* Passo a passo ------------------------------------------------------------------- */

  /** O que fica em volta de um herói neste passo: gelo embaixo, água em volta, corrente na mão. */
  private surroundingsOf(body: PhysicsBody): PlayerSurroundings {
    const isInWater = this.blocks.isWaterAtPoint(centerX(body), centerY(body));

    return {
      isOnIce: this.grid.isIceAtPoint(centerX(body), bottom(body) + 4),
      isInWater,
      isAtWaterSurface: isInWater && !this.blocks.isWaterAtPoint(centerX(body), body.y),
      climbChain: this.climbChains.gripOf(body),
    };
  }

  /** Cabeçada e pouso valem para qualquer herói da turma: o amigo também abre bloco surpresa. */
  private reactToPlayerCollisions(player: Player = this.player): void {
    const body = player.body;

    if (body.headHitColumn >= 0) {
      this.blocks.handleHeadHit(player, body.headHitColumn, body.headHitRow, this.clockMs);
      this.pSwitches.handleHeadHit(body.headHitColumn, body.headHitRow);
    }

    if (body.landedRow >= 0) {
      this.blocks.handleLanding(player, body.landedRow, body.landedFromColumn, body.landedToColumn, this.clockMs);
    }

    this.blocks.revealInvisibleGrassTouching(body);
    this.blocks.wakePlatform(body.riding);
  }

  /** Depois de todo mundo andar: o bloco colorido que acendeu só fica firme onde não há ninguém. */
  private settleColorBlocks(): void {
    this.blocks.solidifyWaitingColorBlocks(this.isAnyoneIn);
  }

  /** Função fixa, e não criada a cada passo: herói, amigo, clone ou inimigo ocupando a área. */
  private readonly isAnyoneIn = (area: WorldArea): boolean =>
    (this.player.isActive && overlaps(this.player.body, area)) ||
    this.partners.some((partner) => partner.isActive && overlaps(partner.body, area)) ||
    this.clones.some((clone) => overlaps(clone.body, area)) ||
    this.enemies.some((enemy) => !enemy.isDefeated && overlaps(enemy.body, area));

  private updateEnemies(seconds: number): void {
    const playerBody = this.player.body;
    const playerX = centerX(playerBody);
    const playerY = centerY(playerBody);
    const fallLimit = this.grid.heightPx + TILE_SIZE * 5;

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      const body = enemy.body;

      if ((enemy.isDefeated && this.clockMs - enemy.defeatedAt > ENEMY_DEFEAT_MS) || body.y > fallLimit) {
        this.enemies.splice(index, 1);
        continue;
      }

      if (enemy.isDefeated) {
        continue;
      }

      if (enemy.isProjectile || Math.abs(centerX(body) - playerX) < ENEMY_ACTIVE_DISTANCE) {
        enemy.step(this.clockMs, playerX, playerY);
        stepBody(body, this.world, seconds, true);
        this.reactToEnemyLanding(enemy);
        this.sproutSpiky(enemy);
      } else {
        enemy.standStill();
        body.previousX = body.x;
        body.previousY = body.y;
      }

      if (enemy.takeExplosion(this.clockMs)) {
        this.explodeBomb(enemy);
        continue;
      }

      if (!this.player.isActive || this.clockMs < enemy.harmlessUntil || !overlaps(playerBody, body)) {
        continue;
      }

      if (enemy.isFrozen) {
        this.onFrozenEnemyContact(enemy);
      } else if (enemy.isHarmful) {
        this.onEnemyContact(enemy);
      }
    }
  }

  /** Pousou num escorregador: a descida começa. */
  private catchSlide(player: Player = this.player): void {
    if (player.isSliding) {
      return;
    }

    const ramp = this.slides.rampLandedOn(player.body);

    if (ramp) {
      player.startSliding(ramp);
      this.playSound('slide');
    }
  }

  /** Com uma flor, o botão de ação lança fogo ou gelo — menos na frente de uma porta, onde ele abre a porta. */
  private throwBall(input: InputSnapshot): void {
    const player = this.player;
    const element = player.flowerElement;

    if (!input.actionPressed || !element || this.triggers.nearDoor || !this.fireballs.canThrow) {
      return;
    }

    const body = player.body;
    const x = centerX(body) + player.facing * body.width;
    // A bolha sai rente ao chão, para pegar até os inimigos baixinhos; as bolas, da mão.
    const y = element === 'bubble' ? bottom(body) - BUBBLE_PHYSICS.size / 2 - BUBBLE_PHYSICS.groundGap : centerY(body) - 6;

    this.playSound(BALL_SOUNDS[element]);

    // Colado na parede, a bola nasceria dentro do bloco e o atravessaria: ela se desfaz ali mesmo.
    if (this.grid.isSolidCell(cellOf(x), cellOf(y))) {
      this.effects.burst(element, x, y, 6);
      return;
    }

    this.fireballs.throw(x, y, player.facing, element, this.clockMs);
  }

  /** Com a Folha do Guaxinim, o botão de ação gira o rabo: derruba inimigos e quebra tijolos dos dois lados. */
  private spinTail(input: InputSnapshot): void {
    const player = this.player;

    if (!input.actionPressed || this.triggers.nearDoor || !player.startTailSpin(this.clockMs)) {
      return;
    }

    const body = player.body;
    const reach = RACCOON_SUIT_PHYSICS.tailReach;
    const area: WorldArea = { x: body.x - reach, y: body.y, width: body.width + reach * 2, height: body.height };
    // Filtra antes de derrotar: o Rei Slime derrotado solta slimes novos, que não levam o mesmo golpe.
    const targets = this.enemies.filter((enemy) => !enemy.isDefeated && !enemy.isHidden && overlaps(area, enemy.body));

    this.playSound('tailSpin');
    this.effects.burst('dust', centerX(body), bottom(body) - 10, 8);
    this.blocks.breakBricksIn(area);
    this.pSwitches.breakBricksIn(area);

    for (const enemy of targets) {
      this.defeatEnemy(enemy);
    }
  }

  /** Com o Cogumelo de Voar, o botão de ação gira a hélice e lança o herói para cima. */
  private launchPropeller(input: InputSnapshot): void {
    const player = this.player;

    if (!input.actionPressed || this.triggers.nearDoor || !player.launchPropeller(this.clockMs)) {
      return;
    }

    const body = player.body;

    this.playSound('propeller');
    this.effects.burst('dust', centerX(body), bottom(body), 10);
    this.effects.burst('sparkle', centerX(body), body.y, 6);
  }

  /**
   * Com o Martelo Gigante, o botão de ação dá uma martelada na frente do
   * herói: derruba qualquer inimigo ao alcance — até os que não se pisam nem se
   * apagam com fogo; na Bomb-omb, acende o pavio —, acerta o chefão e bate nos
   * blocos como uma cabeçada.
   */
  private swingHammer(input: InputSnapshot): void {
    const player = this.player;
    const now = this.clockMs;

    if (!input.actionPressed || this.triggers.nearDoor || !player.startHammerSwing(now)) {
      return;
    }

    const area = hammerArea(player);
    // Filtra antes de derrotar: o Rei Slime derrotado solta slimes novos, que não levam a mesma martelada.
    const targets = this.enemies.filter((enemy) => !enemy.isDefeated && !enemy.isHidden && overlaps(area, enemy.body));

    this.playSound('hammer');
    this.effects.burst('dust', area.x + area.width / 2, area.y + area.height, 10);
    this.effects.shake('leve');
    this.blocks.strikeBlocksIn(area, now);
    this.pSwitches.breakBricksIn(area);

    for (const enemy of targets) {
      this.stompEnemy(enemy);
    }

    const boss = this.boss;

    if (boss?.isAwake && overlaps(area, boss.body)) {
      boss.takeHit(now);
    }
  }

  /** Gigante, o herói quebra os tijolos em que esbarra de lado ou de cabeça; os de baixo dos pés ficam, para ele não afundar. */
  private crushBricksAsGiant(): void {
    if (!this.player.hasPowerUp('giga-mushroom')) {
      return;
    }

    const body = this.player.body;
    const reach = GIGA_PHYSICS.brickReach;

    const area: WorldArea = {
      x: body.x - reach,
      y: body.y - reach,
      width: body.width + reach * 2,
      height: body.height + reach - 1,
    };

    this.blocks.breakBricksIn(area);
    this.pSwitches.breakBricksIn(area);
  }

  private updateFireballs(seconds: number): void {
    this.fireballs.update(this.world, seconds, this.clockMs, (fireball) => this.extinguish(fireball));

    for (const fireball of [...this.fireballs.fireballs]) {
      const body = fireball.body;

      // A água apaga o fogo e o gelo; a bolha passa por ela.
      if (fireball.element !== 'bubble' && this.blocks.isWaterAtPoint(centerX(body), centerY(body))) {
        this.fireballs.remove(fireball);
        this.effects.burst('bubble', centerX(body), centerY(body), 6);
        continue;
      }

      // Escondido no cano ou sumido, o inimigo não está ali para ser atingido.
      const target = this.enemies.find((enemy) => !enemy.isDefeated && !enemy.isHidden && overlaps(body, enemy.body));

      if (target) {
        this.fireballs.remove(fireball);
        this.extinguish(fireball);
        this.hitWithBall(target, fireball.element);
      }
    }
  }

  private extinguish(fireball: Fireball): void {
    this.effects.burst(fireball.element, centerX(fireball.body), centerY(fireball.body), 6);
  }

  /**
   * O fogo derrota (e acende o pavio da Bomb-omb); o gelo congela; a bolha
   * prende o inimigo e estoura com ele. A bolinha de lava resiste ao fogo e ao
   * gelo; o ferro da bala, do thwomp e do Bolão não cabe na bolha.
   */
  private hitWithBall(enemy: Enemy, element: BallElement): void {
    if (element === 'fire') {
      if (enemy.explodesWhenStomped) {
        this.lightBomb(enemy);
      } else if (!enemy.isFireproof) {
        this.defeatEnemy(enemy);
      }

      return;
    }

    if (element === 'bubble') {
      this.trapInBubble(enemy);
      return;
    }

    if (enemy.canBeFrozen) {
      enemy.freezeInIce(this.clockMs);
      this.playSound('freeze');
      this.effects.burst('ice', centerX(enemy.body), centerY(enemy.body), 12);
    }
  }

  private trapInBubble(enemy: Enemy): void {
    const x = centerX(enemy.body);
    const y = centerY(enemy.body);

    this.effects.burst('bubble', x, y, 14);

    if (enemy.isFireproof && enemy.kind !== 'lava-bubble') {
      return;
    }

    this.defeatEnemy(enemy);
    this.effects.floatingText(x, y - 30, '🫧 PRESO NA BOLHA!', '#a5f3fc');
  }

  private updateBoss(seconds: number): void {
    const boss = this.boss;

    if (!boss) {
      return;
    }

    if (boss.isGone) {
      this.boss = null;
      return;
    }

    const playerX = centerX(this.player.body);

    if (boss.mode === 'waiting' && !this.bossDefeated && playerX >= this.bossWakeX) {
      boss.wake(this.clockMs);
      this.emitBoss(boss.hitPoints);
    }

    boss.step(this.clockMs, playerX);
    stepBody(boss.body, this.world, seconds, true);

    if (boss.isAwake && this.player.isActive && overlaps(this.player.body, boss.body)) {
      this.onBossContact(boss);
    }
  }

  /**
   * Prensas esmagadoras: a casa fica firme enquanto a prensa espera lá em
   * cima; descendo, ela esmaga o herói (que perde um coração e é jogado para
   * o lado) e qualquer inimigo que estiver embaixo. Perto do herói, a batida no
   * chão treme a tela.
   */
  private updateCrushers(): void {
    if (!this.crushers.hasCrushers) {
      return;
    }

    const now = this.clockMs;
    const playerBody = this.player.body;
    const livingEnemies = this.enemies.filter((enemy) => !enemy.isDefeated);

    this.crushers.update(now, [
      playerBody,
      ...this.partners.map((partner) => partner.body),
      ...this.clones.map((clone) => clone.body),
      ...livingEnemies.map((enemy) => enemy.body),
    ]);

    for (const crusher of this.crushers.crushers) {
      if (!this.crushers.slammedBetween(crusher, now - STEP_MS, now)) {
        continue;
      }

      const x = crusherCenterX(crusher);

      this.effects.burst('dust', x, (crusher.cellY + crusher.dropCells + 1) * TILE_SIZE, 10 * crusher.widthCells);

      if (Math.abs(x - centerX(playerBody)) < CRUSHER_SHAKE_DISTANCE) {
        this.effects.shake('leve');
        this.playSound('break');
      }
    }

    for (const enemy of livingEnemies) {
      if (!enemy.isHidden && this.crushers.crushing(now, enemy.body)) {
        this.defeatEnemy(enemy);
      }
    }

    if (this.player.isActive) {
      const crusher = this.crushers.crushing(now, playerBody);

      if (crusher) {
        this.hurtPlayer(crusherCenterX(crusher));
      }
    }
  }

  /** Encostar numa bola do bastão de fogo machuca; a estrela e o Giga passam sem dor (o `hurtPlayer` cuida disso). */
  private checkFireBars(): void {
    if (!this.player.isActive) {
      return;
    }

    const bar = this.fireBars.touching(this.clockMs, this.player.body);

    if (bar) {
      this.hurtPlayer(bar.x);
    }
  }

  /** A coluna de fogo da armadilha queima como o bastão de fogo; apagada, a armadilha é só um bloco. */
  private checkFireTraps(): void {
    if (!this.player.isActive || !this.fireTraps.hasTraps) {
      return;
    }

    const trap = this.fireTraps.touching(this.clockMs, this.player.body);

    if (trap) {
      this.hurtPlayer((trap.cellX + 0.5) * TILE_SIZE);
    }
  }

  private checkHazards(): void {
    const player = this.player;

    if (!player.isActive) {
      return;
    }

    const fellOut = player.body.y > this.grid.heightPx + TILE_SIZE;

    if (!fellOut && !this.blocks.touchesHazard(player.body)) {
      // Com a Bota, pisar e esbarrar nos espinhos não machuca.
      const spikes = player.hasPowerUp('boot') ? undefined : this.blocks.spikesTouching(player.body);

      if (spikes) {
        this.hurtPlayer(spikes.x + spikes.width / 2);
      }

      return;
    }

    this.loseHeart();

    if (!this.isDefeated) {
      player.placeFeetAt(this.respawnX, this.respawnY);
      player.revive(this.clockMs, this.options.rules.invincibilityMs);
      this.dismissClones();
      this.effects.flash();
    }
  }

  /* Amigos do Jogador 1 --------------------------------------------------------------- */

  /** Cada amigo anda com a própria entrada, bate nos blocos e pega o que é da turma. */
  private stepPartners(inputs: readonly InputSnapshot[], seconds: number): void {
    this.partners.forEach((partner, index) => {
      if (!partner.isActive) {
        return;
      }

      const body = partner.body;

      partner.control(this.clockMs, STEP_MS, inputs[index] ?? IDLE_INPUT, this.surroundingsOf(body));
      stepBody(body, this.world, seconds, true);
      this.reactToPlayerCollisions(partner);
      this.catchSlide(partner);
      this.collectibles.update(0, centerX(body), centerY(body), 0, isTeamCollectible);
    });
  }

  /**
   * Perigos dos amigos, depois de tudo se mexer. Ninguém perde coração por
   * eles: o amigo que cai, se machuca ou fica para trás volta para perto do
   * Jogador 1, piscando como quem acabou de voltar ao checkpoint.
   */
  private checkPartners(): void {
    for (const partner of this.partners) {
      if (partner.isActive && (this.isPartnerLost(partner.body) || this.isTeammateHurt(partner))) {
        this.bringPartnerBack(partner);
      }
    }
  }

  /**
   * Um amigo ou clone encostou num perigo neste passo: lava, espinho, fogo,
   * prensa, inimigo de lado ou chefão bravo. Piscando, nada o machuca. O pisão
   * nos inimigos e no chefão cansado já é contado aqui.
   */
  private isTeammateHurt(teammate: Player): boolean {
    const now = this.clockMs;
    const body = teammate.body;

    if (teammate.isInvincible(now)) {
      return false;
    }

    return (
      this.blocks.touchesHazard(body) ||
      Boolean(this.blocks.spikesTouching(body)) ||
      Boolean(this.fireBars.touching(now, body)) ||
      Boolean(this.fireTraps.touching(now, body)) ||
      Boolean(this.crushers.crushing(now, body)) ||
      this.partnerMeetsEnemies(teammate) ||
      this.partnerMeetsBoss(teammate)
    );
  }

  /** Caiu da fase ou ficou longe demais do Jogador 1, fora da câmera. */
  private isPartnerLost(body: PhysicsBody): boolean {
    const leader = this.player.body;

    return (
      body.y > this.grid.heightPx + TILE_SIZE ||
      Math.abs(centerX(body) - centerX(leader)) > PARTNER_LEASH.x ||
      Math.abs(bottom(body) - bottom(leader)) > PARTNER_LEASH.y
    );
  }

  /** Pisão do amigo derruba o inimigo, como o do Jogador 1; esbarrar de lado manda o amigo de volta. Diz se ele se machucou. */
  private partnerMeetsEnemies(partner: Player): boolean {
    const body = partner.body;

    // Cópia: o Rei Slime derrotado solta slimes novos no meio da conta.
    for (const enemy of [...this.enemies]) {
      if (enemy.isDefeated || this.clockMs < enemy.harmlessUntil || !overlaps(body, enemy.body)) {
        continue;
      }

      const isStomp = body.impactVelocityY > 0 && bottom(body) <= enemy.body.y + PLAYER_PHYSICS.stompTolerance;

      if (enemy.isFrozen) {
        if (isStomp) {
          this.effects.burst('ice', centerX(enemy.body), centerY(enemy.body), 16);
          this.defeatEnemy(enemy);
          partner.bounce(PLAYER_PHYSICS.stompBounceVelocity, true);
        }

        continue;
      }

      if (!enemy.isHarmful) {
        continue;
      }

      if (isStomp && canStomp(partner, enemy)) {
        this.stompEnemy(enemy);
        partner.bounce(PLAYER_PHYSICS.stompBounceVelocity, true);
        continue;
      }

      return true;
    }

    return false;
  }

  /** O amigo também pode pisar no chefão cansado: a turma vence junta. */
  private partnerMeetsBoss(partner: Player): boolean {
    const boss = this.boss;
    const body = partner.body;

    if (!boss?.isAwake || !overlaps(body, boss.body)) {
      return false;
    }

    const isStomp = body.impactVelocityY > 0 && bottom(body) <= boss.body.y + PLAYER_PHYSICS.stompTolerance * 1.5;

    if (isStomp) {
      partner.bounce(PLAYER_PHYSICS.stompBounceVelocity * 1.15, true);
      boss.takeHit(this.clockMs);
      return false;
    }

    return boss.isHarmful;
  }

  /** Um estalo de fumaça onde o amigo estava, e ele reaparece junto do Jogador 1. */
  private bringPartnerBack(partner: Player): void {
    const from = partner.body;
    const leader = this.player.body;

    this.effects.burst('poof', centerX(from), centerY(from), 10);
    partner.placeFeetAt(centerX(leader), bottom(leader));
    partner.revive(this.clockMs, this.options.rules.invincibilityMs);
    this.effects.burst('sparkle', centerX(leader), centerY(leader), 10);
  }

  /**
   * Põe a turma junta num lugar: o Jogador 2 logo atrás do Jogador 1, o 3
   * atrás dele. Sem espaço ali (uma parede, a borda da fase), o amigo fica no
   * mesmo lugar do Jogador 1 — os heróis não se empurram.
   */
  private gatherPartners(feetX: number, feetY: number): void {
    this.partners.forEach((partner, index) => {
      partner.placeFeetAt(this.feetXBeside(partner.body, feetX, feetY, -(index + 1) * PARTNER_GAP), feetY);
      partner.revive(this.clockMs, 0);
    });
  }

  /**
   * Onde pôr os pés de um herói a `offset` pixels de `feetX`: ali, se o corpo
   * dele couber; se não couber (uma parede, a borda da fase), no próprio `feetX`.
   */
  private feetXBeside(body: PhysicsBody, feetX: number, feetY: number, offset: number): number {
    const x = feetX + offset;
    const spot: WorldArea = { x: x - body.width / 2, y: feetY - body.height, width: body.width, height: body.height };

    return spot.x >= 0 && this.hasRoomFor(spot) ? x : feetX;
  }

  /* Clones do Cogumelo Cereja ---------------------------------------------------------- */

  /** Cada clone obedece aos botões do Jogador 1, bate nos blocos e pega o que é da turma. */
  private stepClones(input: InputSnapshot, seconds: number): void {
    for (const clone of this.clones) {
      const body = clone.body;

      clone.control(this.clockMs, STEP_MS, input, this.surroundingsOf(body));
      stepBody(body, this.world, seconds, true);
      this.reactToPlayerCollisions(clone);
      this.catchSlide(clone);
      this.collectibles.update(0, centerX(body), centerY(body), 0, isTeamCollectible);
    }
  }

  /** O clone que se machuca, cai ou fica para trás some num estalo de fumaça; não volta. */
  private checkClones(): void {
    // Cópia: o clone some da lista no meio da conta.
    for (const clone of [...this.clones]) {
      if (this.isPartnerLost(clone.body) || this.isTeammateHurt(clone)) {
        this.removeClone(clone);
      }
    }
  }

  /**
   * Cogumelo Cereja: um clone aparece ao lado do Jogador 1, olhando para o
   * mesmo lado, até o teto de clones. Nasce piscando, para não se machucar
   * no mesmo instante em que aparece.
   */
  private spawnClone(x: number, y: number): void {
    if (this.clones.length >= DOUBLE_CHERRY.maxClones) {
      this.effects.floatingText(x, y - 30, '🍒 JÁ TEM CLONE DEMAIS!', '#ffc9c9');
      return;
    }

    const leader = this.player;
    const feetY = bottom(leader.body);
    const clone = new Player(centerX(leader.body), feetY, this, heroDefinition(this.currentHero).abilities);
    const offset = -leader.facing * DOUBLE_CHERRY.spawnGap * (this.clones.length + 1);

    clone.placeFeetAt(this.feetXBeside(clone.body, centerX(leader.body), feetY, offset), feetY);
    clone.facing = leader.facing;
    clone.revive(this.clockMs, this.options.rules.invincibilityMs);
    this.clones.push(clone);
    this.effects.burst('sparkle', centerX(clone.body), centerY(clone.body), 16);
    this.effects.floatingText(x, y - 30, '🍒 CLONE!', '#ff6b6b');

    if (this.clones.length === 1) {
      this.emit({ type: 'mascot', text: 'Cogumelo Cereja! Apareceu um clone seu: ele faz tudo o que você fizer!' });
    }
  }

  private removeClone(clone: Player): void {
    const index = this.clones.indexOf(clone);

    if (index >= 0) {
      this.clones.splice(index, 1);
      this.effects.burst('poof', centerX(clone.body), centerY(clone.body), 12);
    }
  }

  /** Na volta ao checkpoint os clones vão embora: o Cogumelo Cereja tem de ser pego de novo. */
  private dismissClones(): void {
    for (const clone of [...this.clones]) {
      this.removeClone(clone);
    }
  }

  /** Pela porta ou pelo cano, os clones passam juntos com o Jogador 1. */
  private gatherClones(feetX: number, feetY: number): void {
    this.clones.forEach((clone, index) => {
      clone.placeFeetAt(this.feetXBeside(clone.body, feetX, feetY, -this.player.facing * DOUBLE_CHERRY.spawnGap * (index + 1)), feetY);
    });
  }

  /* Contatos --------------------------------------------------------------------------- */

  private onEnemyContact(enemy: Enemy): void {
    const body = this.player.body;
    const isStomp = body.impactVelocityY > 0 && bottom(body) <= enemy.body.y + PLAYER_PHYSICS.stompTolerance;

    // Com a Super Estrela ou gigante, encostar já derruba qualquer inimigo.
    if (this.player.defeatsEnemiesOnTouch) {
      this.defeatEnemy(enemy);
      return;
    }

    if (isStomp && canStomp(this.player, enemy)) {
      this.stompEnemy(enemy);
      this.player.bounce(PLAYER_PHYSICS.stompBounceVelocity, true);
      return;
    }

    this.hurtPlayer(centerX(enemy.body));
  }

  /** O bloco de gelo não machuca: um pisão (ou a estrela, ou o gigante) o quebra com o inimigo dentro. */
  private onFrozenEnemyContact(enemy: Enemy): void {
    const body = this.player.body;
    const isStomp = body.impactVelocityY > 0 && bottom(body) <= enemy.body.y + PLAYER_PHYSICS.stompTolerance;

    if (!isStomp && !this.player.defeatsEnemiesOnTouch) {
      return;
    }

    this.effects.burst('ice', centerX(enemy.body), centerY(enemy.body), 16);
    this.defeatEnemy(enemy);

    if (isStomp) {
      this.player.bounce(PLAYER_PHYSICS.stompBounceVelocity, true);
    }
  }

  /** O pisão derruba o inimigo; na Bomb-omb, acende o pavio. */
  private stompEnemy(enemy: Enemy): void {
    if (enemy.explodesWhenStomped) {
      this.lightBomb(enemy);
      return;
    }

    this.defeatEnemy(enemy);
  }

  private lightBomb(bomb: Enemy): void {
    if (!bomb.lightFuse(this.clockMs)) {
      return;
    }

    this.playSound('button');
    this.effects.burst('fire', centerX(bomb.body), bomb.body.y, 6);
    this.effects.floatingText(centerX(bomb.body), bomb.body.y - 24, '💣 CORRE!', '#ffb703');
  }

  /**
   * O pavio da Bomb-omb acabou: a explosão quebra os tijolos e derruba os
   * inimigos em volta, e machuca o herói que ficou perto. O amigo pego na
   * explosão volta para perto do Jogador 1, como em qualquer perigo.
   */
  private explodeBomb(bomb: Enemy): void {
    const x = centerX(bomb.body);
    const y = centerY(bomb.body);
    const radius = WALKING_BOMB.blastRadius;
    const blast: WorldArea = { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 };
    // Filtra antes de derrotar: o Rei Slime derrotado solta slimes novos, que não levam a mesma explosão.
    const caught = this.enemies.filter((enemy) => enemy !== bomb && !enemy.isDefeated && !enemy.isHidden && overlaps(blast, enemy.body));

    this.defeatEnemy(bomb);
    this.playSound('explosion');
    this.effects.burst('fire', x, y, 30);
    this.effects.burst('poof', x, y, 20);
    this.effects.shake('forte');
    this.effects.floatingText(x, y - 40, '💥 BUM!', '#ff8a1f');
    this.blocks.breakBricksIn(blast);
    this.pSwitches.breakBricksIn(blast);

    for (const enemy of caught) {
      this.defeatEnemy(enemy);
    }

    if (this.player.isActive && overlaps(this.player.body, blast)) {
      this.hurtPlayer(x);
    }

    for (const partner of this.partners) {
      if (partner.isActive && !partner.isInvincible(this.clockMs) && overlaps(partner.body, blast)) {
        this.bringPartnerBack(partner);
      }
    }

    for (const clone of [...this.clones]) {
      if (!clone.isInvincible(this.clockMs) && overlaps(clone.body, blast)) {
        this.removeClone(clone);
      }
    }
  }

  private defeatEnemy(enemy: Enemy): void {
    enemy.defeat(this.clockMs);
    this.enemiesDefeated += 1;
    this.playSound('enemyHit');
    this.effects.burst('poof', centerX(enemy.body), centerY(enemy.body), 12);

    if (enemy.kind === 'king-slime') {
      this.splitKingSlime(enemy);
    }

    this.cactusSprouts.delete(enemy);
  }

  /** O Rei Slime derrotado vira dois slimes, que saem cada um para um lado. */
  private splitKingSlime(king: Enemy): void {
    const cellX = Math.floor(centerX(king.body) / TILE_SIZE);
    const cellY = Math.floor((bottom(king.body) - 1) / TILE_SIZE);

    for (const direction of [-1, 1] as const) {
      const slime = this.addEnemy('slime', cellX, cellY, 1);

      slime.direction = direction;
      slime.harmlessUntil = this.clockMs + SPLIT_GRACE_MS;
    }
  }

  /**
   * O Rei Cacto solta um espinhudo pequeno, que sai pulando para o lado em que
   * ele olha. Nasce sem machucar por um instante, como os slimes do Rei Slime.
   */
  private sproutSpiky(king: Enemy): void {
    if (!king.takeSprout()) {
      return;
    }

    const sprouts = (this.cactusSprouts.get(king) ?? []).filter((sprout) => !sprout.isDefeated && this.enemies.includes(sprout));

    if (sprouts.length >= MAX_CACTUS_SPROUTS) {
      this.cactusSprouts.set(king, sprouts);
      return;
    }

    const cellX = Math.floor(centerX(king.body) / TILE_SIZE);
    const cellY = Math.floor((bottom(king.body) - 1) / TILE_SIZE);
    const spiky = this.addEnemy('spiky', cellX, cellY, CACTUS_SPROUT_SCALE);

    spiky.direction = king.direction;
    spiky.harmlessUntil = this.clockMs + SPLIT_GRACE_MS;
    spiky.body.vy = -CACTUS_SPROUT_HOP_VELOCITY;
    this.cactusSprouts.set(king, [...sprouts, spiky]);
    this.effects.burst('dust', centerX(king.body), centerY(king.body), 8);
  }

  /** A pancada do thwomp no chão treme a tela e levanta poeira. */
  private reactToEnemyLanding(enemy: Enemy): void {
    if (enemy.bouncesOnNoteBlocks) {
      this.blocks.bounceEnemyOnNote(enemy.body, this.clockMs);
    }

    if (!enemy.takeLanding()) {
      return;
    }

    this.effects.shake('leve');
    this.effects.burst('dust', centerX(enemy.body), bottom(enemy.body), 14);
    this.playSound('break');
  }

  private onBossContact(boss: Boss): void {
    const body = this.player.body;
    const isStomp = body.impactVelocityY > 0 && bottom(body) <= boss.body.y + PLAYER_PHYSICS.stompTolerance * 1.5;

    if (isStomp) {
      // Pisar no chefão nunca machuca o Pedro; só conta quando ele está cansado.
      this.player.bounce(PLAYER_PHYSICS.stompBounceVelocity * 1.15, true);
      boss.takeHit(this.clockMs);
      return;
    }

    if (boss.isHarmful) {
      this.hurtPlayer(centerX(boss.body));
    }
  }

  /** Até onde o ímã puxa moedas neste passo; 0 sem ímã. O Cogumelo Ímã alcança mais longe. */
  private magnetRadius(): number {
    if (this.player.hasPowerUp('magnet-mushroom')) {
      return MAGNET_MUSHROOM_RADIUS;
    }

    return this.player.hasPowerUp('magnet') ? MAGNET_RADIUS : 0;
  }

  private hurtPlayer(sourceX: number): void {
    const now = this.clockMs;
    const player = this.player;
    const x = centerX(player.body);

    if (player.isInvincible(now) || player.defeatsEnemiesOnTouch || !player.isActive) {
      return;
    }

    if (player.hasShield) {
      player.losePowerUp('shield');
      player.makeInvincible(now, 1000);
      this.effects.burst('sparkle', x, centerY(player.body), 16);
      this.effects.floatingText(x, player.body.y - 30, '🛡️ PROTEGIDO!');
      this.playSound('powerup');
      this.emit({ type: 'power-up-ended', kind: 'shield' });
      this.emitHud();
      return;
    }

    const knockbackDirection = Math.sign(x - sourceX) || 1;

    if (player.isBig) {
      this.shrinkPlayer(knockbackDirection);
      return;
    }

    this.loseHeart();

    if (!this.isDefeated) {
      player.showHitPose(now, knockbackDirection);
      player.makeInvincible(now, this.options.rules.invincibilityMs);
    }
  }

  /** Grande, o Pedro não perde coração: perde o cogumelo (e o traje) e volta ao tamanho normal. */
  private shrinkPlayer(knockbackDirection: number): void {
    const now = this.clockMs;
    const player = this.player;
    const body = player.body;

    for (const kind of [...SUIT_POWER_UPS, 'mushroom'] as const) {
      if (player.hasPowerUp(kind)) {
        player.losePowerUp(kind);
        this.emit({ type: 'power-up-ended', kind });
      }
    }

    player.showHitPose(now, knockbackDirection);
    player.makeInvincible(now, this.options.rules.invincibilityMs);
    this.playSound('damage');
    this.effects.burst('poof', centerX(body), centerY(body), 14);
    this.effects.floatingText(centerX(body), body.y - 30, '🍄 ENCOLHEU!');
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
      this.scheduler.after(this.clockMs, DEFEAT_DELAY_MS, () => this.emit({ type: 'defeated' }));
    }
  }

  /* Anfitrião dos sistemas ------------------------------------------------------------ */

  playSound(cue: MakerSoundCue): void {
    this.emit({ type: 'sound', cue });
  }

  playNote(degree: number): void {
    this.emit({ type: 'note', degree });
  }

  onPowerUpEnded(kind: PowerUpKind): void {
    this.emit({ type: 'power-up-ended', kind });
  }

  hasRoomFor(area: WorldArea): boolean {
    return isAreaClear(this.grid, area);
  }

  /** Moedas ganhas por qualquer caminho passam pela moeda de multiplicação ativa. */
  addCoins(amount: number, x: number, y: number): void {
    const gained = amount * this.coinMultiplier();

    this.coins += gained;
    this.playSound('coin');
    this.effects.floatingText(x, y - 20, `+${gained}`, '#ffe066');
    this.emitHud();
  }

  /**
   * Quanto cada moeda vale agora: 1 sem moeda de multiplicação, ou a mais forte
   * das que estiverem ativas. Elas não se somam nem se multiplicam entre si,
   * para o número continuar sendo o que a criança leu na moeda.
   */
  coinMultiplier(): number {
    return COIN_MULTIPLIER_KINDS.reduce(
      (strongest, kind) => (this.player.hasPowerUp(kind) ? Math.max(strongest, COIN_MULTIPLIERS[kind]) : strongest),
      1,
    );
  }

  spawnCollectible(kind: 'heart' | 'crystal' | 'power-up', x: number, y: number, extra: SpawnExtra): void {
    this.collectibles.spawn(kind, x, y, extra, this.clockMs);
  }

  pickLuckyPowerUp(): PowerUpKind {
    return this.random.pick(CLASSIC_POWER_UPS);
  }

  /**
   * O bloco POW treme a tela: todos os inimigos à vista caem de uma vez — os
   * que voam também, para a criança ver a tela limpinha. Os escondidos no cano
   * ficam, e a Bomb-omb cai sem explodir.
   */
  onPowBlock(x: number, y: number): void {
    // Filtra antes de derrotar: o Rei Slime derrotado solta slimes novos, que não levam o mesmo POW.
    const onScreen = this.enemies.filter(
      (enemy) =>
        !enemy.isDefeated &&
        !enemy.isHidden &&
        Math.abs(centerX(enemy.body) - x) <= POW_BLOCK.reach &&
        Math.abs(centerY(enemy.body) - y) <= VIEW_HEIGHT,
    );

    for (const enemy of onScreen) {
      this.defeatEnemy(enemy);
    }
  }

  onCollected(item: Collectible): void {
    const { x, y } = item;

    if (isGiantCoinType(item.kind)) {
      this.collectGiantCoin(item);
      return;
    }

    switch (item.kind) {
      case 'coin': {
        const multiplier = this.coinMultiplier();

        this.coins += multiplier;
        this.playSound('coin');
        this.effects.burst('coin', x, y, 5);

        if (multiplier > 1) {
          this.effects.floatingText(x, y - 20, `+${multiplier}`, '#ffe066');
        }

        break;
      }
      case 'big-coin':
        this.addCoins(coinValue(item.kind), x, y);
        this.effects.burst('coin', x, y, 14);
        break;
      case 'huge-coin':
        this.collectGiantCoin(item);
        break;
      case 'mega-coin':
        this.burstMegaCoin(item);
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
        this.hearts = Math.min(this.maxHearts, this.hearts + 1);
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
    this.respawnX = feetX;
    this.respawnY = feetY;
    this.playSound('checkpoint');
    this.emit({ type: 'checkpoint' });
  }

  onDoor(destinationFeetX: number, destinationFeetY: number, kind?: DoorKind): void {
    this.playSound(kind === 'pipe' ? 'spring' : 'button');
    this.effects.flash();

    if (kind === 'pipe') {
      // A fumacinha sai da boca do cano de chegada, onde o herói aparece.
      this.effects.burst('poof', destinationFeetX, destinationFeetY - 60, 10);
    }

    this.player.placeFeetAt(destinationFeetX, destinationFeetY);
    this.gatherPartners(destinationFeetX, destinationFeetY);
    this.gatherClones(destinationFeetX, destinationFeetY);
  }

  onGoldenDoorOpened(x: number, y: number): void {
    this.effects.burst('coin', x, y, 12);
    this.addCoins(GOLDEN_DOOR_COINS, x, y);
  }

  onSecretDoor(secretLevel: string | null): void {
    const body = this.player.body;

    this.playSound('secret');
    this.effects.floatingText(centerX(body), body.y - 40, '🌟 SEGREDO!', '#ffe066');
    this.emit({ type: 'secret-found', secretLevel });
  }

  onPortal(portalX: number, portalY: number): void {
    this.isFinished = true;
    this.player.celebrate(this.clockMs, portalX, portalY);
    this.playSound('victory');
    this.effects.burst('confetti', portalX, portalY, 50);
    this.effects.burst('sparkle', portalX, portalY, 30);

    const result = this.result();
    this.scheduler.after(this.clockMs, VICTORY_DELAY_MS, () => this.emit({ type: 'completed', result }));
  }

  onChestOpened(chest: Chest, x: number, y: number): void {
    if (chest.kind === 'coins') {
      this.effects.burst('coin', x, y, 20);
      this.addCoins(COIN_CHEST_COINS, x, y);
      return;
    }

    this.effects.burst('coin', x, y, 40);
    this.addCoins(BOSS_CHEST_COINS, x, y);
    this.playSound('victory');
    this.triggers.openPortal(this.clockMs);
    this.emit({ type: 'mascot', text: 'Um baú cheio de moedas! O portal abriu!' });
  }

  onMascotTip(text: string): void {
    this.emit({ type: 'mascot', text });
  }

  onFlowerSpeech(text: string): void {
    this.emit({ type: 'flower-speech', text });
  }

  onKeysChanged(): void {
    this.emitHud();
  }

  onLockTip(text: string): void {
    this.emit({ type: 'mascot', text });
  }

  /** Uma alavanca foi puxada: além das correntes, as prensas esmagadoras sobem e ficam lá em cima. */
  onLeverPulled(now: number): void {
    const raised = this.crushers.raiseAll(now);

    if (raised === 0) {
      return;
    }

    for (const crusher of this.crushers.crushers) {
      this.effects.floatingText(crusherCenterX(crusher), crusher.cellY * TILE_SIZE - TILE_SIZE / 2, '⬆️ SUBIU!', '#ffe066');
    }

    this.playSound('secret');
    this.onLockTip(raised === 1 ? 'A alavanca levantou a prensa! Pode passar embaixo dela.' : 'A alavanca levantou as prensas! Pode passar embaixo delas.');
  }

  onPSwitch(isActive: boolean, durationMs: number): void {
    this.emit(isActive ? { type: 'p-switch', durationMs } : { type: 'p-switch-ended' });
  }

  spawnMinion(worldX: number, worldY: number): void {
    const kind = this.options.blueprint.boss?.minion ?? 'slime';
    const cellX = Math.min(this.grid.width - 2, Math.max(1, Math.floor(worldX / TILE_SIZE)));
    const cellY = Math.max(1, Math.floor(worldY / TILE_SIZE));
    const minion = this.addEnemy(kind, cellX, cellY, 0.8);

    this.effects.burst('poof', centerX(minion.body), centerY(minion.body), 10);
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
        enemy.defeat(this.clockMs);
      }
    }

    this.triggers.dropChest(x, this.bossGroundY, this.clockMs);
  }

  /* Auxiliares ------------------------------------------------------------------------ */

  /** As moedas gigantes somam o valor estampado e soltam uma chuva de brilho. */
  private collectGiantCoin(item: Collectible): void {
    const { x, y } = item;

    this.addCoins(coinValue(item.kind), x, y);
    this.effects.burst('coin', x, y, 30);
    this.effects.burst('sparkle', x, y, 16);
  }

  /**
   * A Moeda Gigantesca vale 10 na hora e estoura em moedas comuns, em dois
   * anéis em volta dela. Moeda que cairia dentro de um bloco não aparece: vai
   * direto para o placar, para nenhuma ficar impossível de pegar.
   */
  private burstMegaCoin(item: Collectible): void {
    const { x, y } = item;
    let buried = 0;

    this.addCoins(MEGA_COIN.directValue, x, y);
    this.effects.burst('coin', x, y, 40);
    this.effects.burst('sparkle', x, y, 24);
    this.effects.shake('leve');
    this.effects.floatingText(x, y - 50, '🪙 CHUVA DE MOEDAS!', '#ffe066');

    for (const ring of MEGA_COIN_RINGS) {
      for (let index = 0; index < ring.count; index += 1) {
        const angle = (index / ring.count) * Math.PI * 2 + ring.radius;
        const coinX = x + Math.cos(angle) * ring.radius * TILE_SIZE;
        const coinY = y + Math.sin(angle) * ring.radius * TILE_SIZE;

        if (this.grid.collisionAt(cellOf(coinX), cellOf(coinY)) !== COLLISION.empty || coinY < 0 || coinX < 0 || coinX >= this.grid.widthPx) {
          buried += 1;
        } else {
          this.collectibles.spawn('coin', coinX, coinY, {}, this.clockMs);
        }
      }
    }

    if (buried > 0) {
      this.coins += buried * this.coinMultiplier();
    }
  }

  private activatePowerUp(kind: PowerUpKind, x: number, y: number): void {
    this.playSound('powerup');
    this.effects.burst('sparkle', x, y, 16);

    // O cogumelo de vida (das fases antigas) não fica com o Pedro: enche os corações na hora.
    if (kind === 'one-up') {
      this.hearts = this.maxHearts;
      this.effects.floatingText(x, y - 30, '💚 VIDA CHEIA!', '#8ce99a');
      return;
    }

    if (kind === 'extra-life-mushroom') {
      this.gainExtraLife(x, y);
      return;
    }

    if (kind === 'swap-mushroom') {
      this.swapHero(x, y);
      return;
    }

    if (kind === 'pedrere-mushroom') {
      this.becomeHero('pedrere', x, y, '🤸');
      return;
    }

    if (kind === 'double-cherry') {
      this.spawnClone(x, y);
      return;
    }

    this.player.grantPowerUp(kind, this.clockMs);

    const { emoji, label } = POWER_UP_LABELS[kind];
    this.effects.floatingText(x, y - 30, `${emoji} ${label.toUpperCase()}!`, '#ffffff');
    this.emit({ type: 'power-up', kind, durationMs: POWER_UP_DURATION_MS[kind] });

    const actionTip = ACTION_TIPS[kind];

    if (actionTip) {
      const button = this.options.isTouch ? 'Toque em AÇÃO' : 'Aperte E';
      this.emit({ type: 'mascot', text: `${button} ${actionTip}` });
    }

    const movementTip = MOVEMENT_TIPS[kind];

    if (movementTip) {
      this.emit({ type: 'mascot', text: movementTip });
    }
  }

  /**
   * Cogumelo 1UP: um coração a mais, além do máximo da fase, até o teto de
   * `EXTRA_LIFE`. No teto, o cogumelo ainda devolve um coração perdido.
   */
  private gainExtraLife(x: number, y: number): void {
    this.extraHearts = Math.min(EXTRA_LIFE.maxExtraHearts, this.extraHearts + 1);
    this.hearts = Math.min(this.maxHearts, this.hearts + 1);
    this.effects.burst('confetti', x, y, 20);
    this.effects.floatingText(x, y - 30, '🆙 1UP! +1 VIDA', '#7ed957');
  }

  /** Corações cheios desta partida: os da fase mais os do Cogumelo 1UP. */
  private get maxHearts(): number {
    return this.options.rules.hearts + this.extraHearts;
  }

  /** O troca-personagem não fica com o herói: na hora ele vira o próximo da turma, com os poderes que já tinha. */
  private swapHero(x: number, y: number): void {
    this.becomeHero(nextHero(this.currentHero), x, y, '🔄');
  }

  /**
   * O herói vira `id` na hora, com os poderes que já tinha. Serve ao
   * troca-personagem e ao Cogumelo Pedrerê, que sempre traz o Pedro do
   * Pedro Pedrerê — mesmo quem já é ele ganha a festa de novo.
   */
  private becomeHero(id: HeroId, x: number, y: number, emoji: string): void {
    const hero = heroDefinition(id);

    this.currentHero = hero.id;
    this.player.changeAbilities(hero.abilities);

    // O clone é uma cópia do herói em cena: troca junto com ele.
    for (const clone of this.clones) {
      clone.changeAbilities(hero.abilities);
    }
    this.effects.burst('sparkle', x, y, 24);
    this.effects.floatingText(x, y - 30, `${emoji} VIROU ${hero.name.toUpperCase()}!`, '#e2c6ff');
    this.emit({ type: 'mascot', text: `Agora você é ${hero.name}!` });
  }

  private result(): LevelRunResult {
    return {
      timeMs: Math.round(this.runTimeMs),
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
        maxHearts: this.maxHearts,
        coins: this.coins,
        crystalsFound: this.crystalsFound.filter(Boolean).length,
        crystalsTotal: this.crystalsFound.length,
        hasShield: this.player.hasShield,
        keys: this.locks.keyCount,
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

/** O pisão derruba quem se pisa; com a Bota, também o espinhudo, a planta e os outros que não se pisam. */
function canStomp(player: Player, enemy: Enemy): boolean {
  return enemy.canBeStomped || (player.hasPowerUp('boot') && !enemy.isHidden);
}

/** Onde a martelada pega: na frente do herói, para o lado em que ele olha, da altura da cabeça até os pés. */
function hammerArea(player: Player): WorldArea {
  const body = player.body;
  const { reach, headroom } = HAMMER_PHYSICS;

  return {
    x: player.facing === 1 ? body.x + body.width : body.x - reach,
    y: body.y - headroom,
    width: reach,
    // Um pixel acima dos pés: a linha do chão embaixo do herói não entra na conta.
    height: body.height + headroom - 1,
  };
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
