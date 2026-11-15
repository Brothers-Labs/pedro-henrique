import { MULTI_COIN_BLOCK_COUNT, PLAYER_PHYSICS, SURPRISE_COIN_COUNT, TILE_SIZE } from '../../config/physics.config';
import { SKELETON_PLATFORM_CELLS, skeletonWallColumn } from '../../levels/skeleton-platform';
import type { LevelObject, LevelObjectType, PlatformAxis, PowerUpKind, SurpriseContent } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import type { PhysicsBody, PlatformSurface, WorldArea } from './physics-body';
import type { Player } from './player';
import type { Scheduler } from './scheduler';
import { COLLISION, type TileGrid } from './tile-grid';
import type { VisualEventQueue } from './visual-events';

export interface BlockHost {
  readonly effects: VisualEventQueue;
  readonly scheduler: Scheduler;
  playSound(cue: MakerSoundCue): void;
  /** Nota do bloco musical, na escala pentatônica; 0 é a mais grave. */
  playNote(degree: number): void;
  addCoins(amount: number, x: number, y: number): void;
  spawnCollectible(kind: 'heart' | 'crystal' | 'power-up', x: number, y: number, extra: SpawnExtra): void;
  /** Sorteio do Lucky Block; quem tem o dado é a partida, para a mesma fase sortear igual. */
  pickLuckyPowerUp(): PowerUpKind;
}

export interface SpawnExtra {
  readonly powerUp?: PowerUpKind;
  readonly crystalIndex?: number;
}

export type InteractiveKind = 'brick' | 'surprise' | 'spring' | 'crumble' | 'note' | 'invisible-grass' | 'ceiling-spring';

/** Bloco que reage ao Pedro. A tela lê os momentos para animar. */
export interface InteractiveBlock {
  readonly id: number;
  readonly kind: InteractiveKind;
  readonly cellX: number;
  readonly cellY: number;
  readonly contents?: SurpriseContent;
  readonly powerUp?: PowerUpKind;
  readonly crystalIndex?: number;
  /** Surpresa já aberta, tábua frágil já pisada ou grama invisível que já apareceu. */
  isUsed: boolean;
  isBroken: boolean;
  /** Plataforma frágil que desabou e ainda não voltou. */
  isHidden: boolean;
  /** Moedas que ainda saem do bloco de moedas. */
  coinsLeft: number;
  /** Última cabeçada ou impulso de mola, para o pulinho do bloco na tela. */
  bumpedAt: number;
  crumbleStartedAt: number;
}

/**
 * `shuttle` vai e volta sem parar entre `start` e `end`; `skeleton` espera o
 * herói pisar e então segue até `end`, a parede. Lá treme, se desmancha e,
 * um tempinho depois, volta montada em `start`, esperando de novo.
 */
export type MovingPlatformKind = 'shuttle' | 'skeleton';

export interface MovingPlatform extends PlatformSurface {
  readonly kind: MovingPlatformKind;
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  previousX: number;
  previousY: number;
  readonly axis: PlatformAxis;
  readonly start: number;
  readonly end: number;
  velocity: number;
  /** A de esqueleto desmanchada: não segura ninguém nem aparece na tela. */
  isHidden: boolean;
  /**
   * Só a de esqueleto usa: segundos até ela se desmanchar, depois de chegar à
   * parede, ou até voltar montada, já desmanchada. Zero quando não há nada marcado.
   */
  vanishCountdown: number;
}

export type Hazard = WorldArea;

export const MOVING_PLATFORM_WIDTH = TILE_SIZE * 2;
export const MOVING_PLATFORM_HEIGHT = TILE_SIZE / 2;

/** Folga além da célula dos espinhos: sólidos, só seriam tocados com uma sobreposição. */
const SPIKE_REACH = 2;

const MOVING_SPEED = 90;
/** Mais devagar que a de vai e volta: a criança tem tempo de ver aonde a de esqueleto está indo. */
const SKELETON_SPEED = 70;
/** Tempo tremendo na parede antes de se desmanchar: dá para descer com calma. */
export const SKELETON_VANISH_DELAY_SECONDS = 1.2;
/** Tempo desmanchada antes de voltar montada no começo do caminho. */
export const SKELETON_RESPAWN_SECONDS = 3;
/** Uns três blocos de altura: o cogumelo quica bem à vista, mas abaixo do quique do herói. */
const ENEMY_NOTE_BOUNCE_VELOCITY = 720;
/** Duas oitavas da escala pentatônica: agudo o bastante sem chegar a apitar. */
const NOTE_BLOCK_DEGREES = 10;
const CRUMBLE_DELAY_MS = 450;
const CRUMBLE_RESPAWN_MS = 3000;

/** Folga em volta do herói que conta como encostar: parado em cima ou de lado, ele já está a 0 pixel do bloco. */
const INVISIBLE_GRASS_TOUCH_REACH = 2;

const INTERACTIVE_KINDS: ReadonlySet<LevelObjectType> = new Set<LevelObjectType>([
  'brick',
  'surprise',
  'spring',
  'crumble',
  'note',
  'invisible-grass',
  'ceiling-spring',
]);

function isInteractiveKind(type: LevelObjectType): type is InteractiveKind {
  return INTERACTIVE_KINDS.has(type);
}

/**
 * Blocos que reagem ao Pedro.
 *
 * Quebrável, surpresa, as molas e grama invisível ocupam a grade como
 * sólidos; a plataforma frágil, como chão de mão única. A reação vem do lado
 * do contato: cabeçada por baixo quebra ou abre (e a mola do teto lança para
 * baixo), pisar em cima faz a mola saltar, o bloco musical quicar e a
 * plataforma frágil tremer. O goomba também quica no bloco musical. A grama
 * invisível aparece com qualquer encostada, por cima, por baixo ou de lado.
 */
export class BlockSystem {
  readonly interactive: InteractiveBlock[] = [];
  readonly platforms: MovingPlatform[] = [];
  readonly hazards: Hazard[] = [];
  /** Espinhos machucam como inimigo, sem mandar o Pedro de volta ao checkpoint. */
  readonly spikes: Hazard[] = [];
  /** Células de lava e de água, para a tela desenhar. */
  readonly lavaCells: { readonly x: number; readonly y: number }[] = [];
  readonly waterCells: { readonly x: number; readonly y: number }[] = [];

  private readonly byCell = new Map<number, InteractiveBlock>();
  private readonly waterKeys = new Set<number>();

  constructor(
    objects: readonly LevelObject[],
    crystalIndexOf: ReadonlyMap<LevelObject, number>,
    private readonly grid: TileGrid,
    private readonly host: BlockHost,
  ) {
    for (const object of objects) {
      if (isInteractiveKind(object.type)) {
        this.addInteractive(object, object.type, crystalIndexOf.get(object));
      } else if (object.type === 'moving-platform') {
        this.addMovingPlatform(object);
      } else if (object.type === 'skeleton-platform') {
        this.addSkeletonPlatform(object);
      } else if (object.type === 'lava') {
        const x = object.x * TILE_SIZE;
        const y = object.y * TILE_SIZE;

        this.lavaCells.push({ x: object.x, y: object.y });
        // A lava queima a partir de um pouco abaixo da superfície: encostar de raspão não conta.
        this.hazards.push({ x: x + 4, y: y + 14, width: TILE_SIZE - 8, height: TILE_SIZE - 14 });
      } else if (object.type === 'spikes') {
        this.addSpikes(object);
      } else if (object.type === 'water') {
        this.waterCells.push({ x: object.x, y: object.y });
        this.waterKeys.add(this.key(object.x, object.y));
      }
    }
  }

  blockAt(cellX: number, cellY: number): InteractiveBlock | undefined {
    return this.byCell.get(this.key(cellX, cellY));
  }

  isWaterAtPoint(worldX: number, worldY: number): boolean {
    const cellX = Math.floor(worldX / TILE_SIZE);
    const cellY = Math.floor(worldY / TILE_SIZE);

    return this.grid.contains(cellX, cellY) && this.waterKeys.has(this.key(cellX, cellY));
  }

  touchesHazard(body: PhysicsBody): boolean {
    return this.hazards.some((hazard) => overlapsHazard(body, hazard));
  }

  spikesTouching(body: PhysicsBody): Hazard | undefined {
    return this.spikes.find((spikes) => overlapsHazard(body, spikes));
  }

  /** Move as plataformas antes dos corpos, que viajam de carona nelas. */
  update(seconds: number): void {
    for (const platform of this.platforms) {
      platform.previousX = platform.x;
      platform.previousY = platform.y;

      this.slide(platform, seconds);

      if (platform.kind === 'skeleton') {
        this.countDownVanishing(platform, seconds);
      }

      platform.deltaX = platform.x - platform.previousX;
      platform.deltaY = platform.y - platform.previousY;
    }
  }

  /** O herói está em cima de uma plataforma de esqueleto parada: ela acorda e sai andando. */
  wakePlatform(riding: PlatformSurface | null): void {
    const platform = this.platforms.find((candidate) => candidate === riding);

    if (platform?.kind !== 'skeleton' || platform.isHidden || platform.velocity !== 0 || platform.x >= platform.end) {
      return;
    }

    platform.velocity = SKELETON_SPEED;
    this.host.playSound('button');
    this.host.effects.burst('dust', platform.x + platform.width / 2, platform.y, 6);
  }

  /** Cabeçada por baixo: o tijolo quebra, a surpresa abre, a mola do teto lança para baixo. */
  handleHeadHit(player: Player, cellX: number, cellY: number, now: number): void {
    const block = this.blockAt(cellX, cellY);

    if (block?.kind === 'ceiling-spring') {
      this.launchDown(player, block, now);
      return;
    }

    if (block?.kind === 'note') {
      block.bumpedAt = now;
      this.playNoteOf(block);
      return;
    }

    if (!block || block.isBroken || block.isHidden || (block.kind !== 'brick' && block.kind !== 'surprise')) {
      return;
    }

    if (block.kind === 'brick') {
      this.breakBrick(block);
      return;
    }

    const centerX = (block.cellX + 0.5) * TILE_SIZE;
    const centerY = (block.cellY + 0.5) * TILE_SIZE;

    block.bumpedAt = now;

    if (block.isUsed) {
      return;
    }

    if (block.contents === 'multi-coins') {
      this.releaseOneCoin(block, centerX, centerY - TILE_SIZE);
      return;
    }

    block.isUsed = true;
    this.releaseContents(block, centerX, centerY - TILE_SIZE);
  }

  /** Quebra de uma vez os tijolos que a área alcança: o rabo do guaxinim ou o herói gigante. */
  breakBricksIn(area: WorldArea): void {
    const firstColumn = Math.floor(area.x / TILE_SIZE);
    const lastColumn = Math.ceil((area.x + area.width) / TILE_SIZE) - 1;
    const firstRow = Math.floor(area.y / TILE_SIZE);
    const lastRow = Math.ceil((area.y + area.height) / TILE_SIZE) - 1;

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        // Fora da grade a chave da célula cairia numa célula de verdade do outro lado.
        const block = this.grid.contains(column, row) ? this.blockAt(column, row) : undefined;

        // O tijolo escondido virou moeda do botão P: não há o que quebrar ali.
        if (block?.kind === 'brick' && !block.isBroken && !block.isHidden) {
          this.breakBrick(block);
        }
      }
    }
  }

  /**
   * A grama invisível que o herói encosta aparece e fica à mostra até o fim da
   * partida: a criança entende onde estava o chão escondido e pode usá-lo de novo.
   */
  revealInvisibleGrassTouching(body: PhysicsBody): void {
    const reach = INVISIBLE_GRASS_TOUCH_REACH;
    const firstColumn = Math.floor((body.x - reach) / TILE_SIZE);
    const lastColumn = Math.floor((body.x + body.width + reach) / TILE_SIZE);
    const firstRow = Math.floor((body.y - reach) / TILE_SIZE);
    const lastRow = Math.floor((body.y + body.height + reach) / TILE_SIZE);

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        // Fora da grade a chave da célula cairia numa célula de verdade do outro lado.
        const block = this.grid.contains(column, row) ? this.blockAt(column, row) : undefined;

        if (block?.kind === 'invisible-grass' && !block.isUsed) {
          this.reveal(block);
        }
      }
    }
  }

  /** Pisou em cima: a mola lança, a plataforma frágil começa a tremer. */
  handleLanding(player: Player, row: number, fromColumn: number, toColumn: number, now: number): void {
    for (let column = fromColumn; column <= toColumn; column += 1) {
      const block = this.blockAt(column, row);

      if (block?.kind === 'spring') {
        this.launch(player, block, now);
        return;
      }

      if (block?.kind === 'note') {
        this.bounceOnNote(player, block, now);
        return;
      }

      if (block?.kind === 'crumble') {
        this.startCrumbling(block, now);
      }
    }
  }

  /** O inimigo que pousou num bloco musical quica nele, como o herói, só que sem segurar pulo nenhum. */
  bounceEnemyOnNote(body: PhysicsBody, now: number): void {
    if (body.landedRow < 0) {
      return;
    }

    for (let column = body.landedFromColumn; column <= body.landedToColumn; column += 1) {
      const block = this.blockAt(column, body.landedRow);

      if (block?.kind === 'note') {
        body.vy = -ENEMY_NOTE_BOUNCE_VELOCITY;
        block.bumpedAt = now;
        this.playNoteOf(block);
        this.host.effects.burst('sparkle', (block.cellX + 0.5) * TILE_SIZE, block.cellY * TILE_SIZE, 4);
        return;
      }
    }
  }

  /** A de vai e volta inverte no fim do caminho; a de esqueleto para na parede e começa a tremer. */
  private slide(platform: MovingPlatform, seconds: number): void {
    const isHorizontal = platform.axis === 'horizontal';
    const position = (isHorizontal ? platform.x : platform.y) + platform.velocity * seconds;
    const clamped = Math.min(platform.end, Math.max(platform.start, position));

    if (clamped !== position) {
      if (platform.kind === 'shuttle') {
        platform.velocity = -platform.velocity;
      } else {
        platform.velocity = 0;
        platform.vanishCountdown = SKELETON_VANISH_DELAY_SECONDS;
      }
    }

    if (isHorizontal) {
      platform.x = clamped;
    } else {
      platform.y = clamped;
    }
  }

  /** Na parede, a de esqueleto se desmancha; desmanchada, volta montada no começo, sem ninguém em cima. */
  private countDownVanishing(platform: MovingPlatform, seconds: number): void {
    if (platform.vanishCountdown <= 0) {
      return;
    }

    platform.vanishCountdown -= seconds;

    if (platform.vanishCountdown > 0) {
      return;
    }

    if (platform.isHidden) {
      this.reassemble(platform);
    } else {
      this.fallApart(platform);
    }
  }

  private fallApart(platform: MovingPlatform): void {
    platform.isHidden = true;
    platform.vanishCountdown = SKELETON_RESPAWN_SECONDS;
    this.host.playSound('break');
    this.host.effects.burst('poof', platform.x + platform.width / 2, platform.y, 16);
  }

  /** Volta de uma vez, sem deslizar: a tela não pode mostrar a ponte atravessando a fase. */
  private reassemble(platform: MovingPlatform): void {
    platform.isHidden = false;
    platform.vanishCountdown = 0;
    platform.x = platform.start;
    platform.previousX = platform.start;
    this.host.effects.burst('sparkle', platform.x + platform.width / 2, platform.y, 10);
  }

  private breakBrick(block: InteractiveBlock): void {
    block.isBroken = true;
    this.grid.setCollision(block.cellX, block.cellY, COLLISION.empty);
    this.host.playSound('break');
    this.host.effects.burst('poof', (block.cellX + 0.5) * TILE_SIZE, (block.cellY + 0.5) * TILE_SIZE, 14);
    this.host.effects.shake('leve');
  }

  private reveal(block: InteractiveBlock): void {
    block.isUsed = true;
    this.host.playSound('secret');
    this.host.effects.burst('sparkle', (block.cellX + 0.5) * TILE_SIZE, (block.cellY + 0.5) * TILE_SIZE, 10);
  }

  private addInteractive(object: LevelObject, kind: InteractiveKind, crystalIndex: number | undefined): void {
    const block: InteractiveBlock = {
      id: this.interactive.length + 1,
      kind,
      cellX: object.x,
      cellY: object.y,
      contents: object.properties?.contents ?? (kind === 'surprise' ? 'coins' : undefined),
      powerUp: object.properties?.powerUp,
      crystalIndex,
      isUsed: false,
      isBroken: false,
      isHidden: false,
      coinsLeft: object.properties?.contents === 'multi-coins' ? MULTI_COIN_BLOCK_COUNT : 0,
      bumpedAt: Number.NEGATIVE_INFINITY,
      crumbleStartedAt: Number.NEGATIVE_INFINITY,
    };

    this.interactive.push(block);
    this.byCell.set(this.key(object.x, object.y), block);
    this.grid.setCollision(object.x, object.y, kind === 'crumble' ? COLLISION.oneWay : COLLISION.solid);
  }

  /** Sólidos para quem pisa ou esbarra; a área de contato passa um pouco da célula. */
  private addSpikes(object: LevelObject): void {
    this.grid.setCollision(object.x, object.y, COLLISION.solid);
    this.spikes.push({
      x: object.x * TILE_SIZE - SPIKE_REACH,
      y: object.y * TILE_SIZE - SPIKE_REACH,
      width: TILE_SIZE + SPIKE_REACH * 2,
      height: TILE_SIZE + SPIKE_REACH * 2,
    });
  }

  private addMovingPlatform(object: LevelObject): void {
    const axis = object.properties?.axis ?? 'horizontal';
    const range = (object.properties?.range ?? 3) * TILE_SIZE;
    const x = object.x * TILE_SIZE;
    const y = object.y * TILE_SIZE;
    const isHorizontal = axis === 'horizontal';

    this.platforms.push({
      kind: 'shuttle',
      x,
      y,
      width: MOVING_PLATFORM_WIDTH,
      deltaX: 0,
      deltaY: 0,
      previousX: x,
      previousY: y,
      axis,
      start: isHorizontal ? x : y - range,
      end: isHorizontal ? x + range : y,
      velocity: isHorizontal ? MOVING_SPEED : -MOVING_SPEED,
      isHidden: false,
      vanishCountdown: 0,
    });
  }

  /** Parada até alguém pisar; o caminho acaba na primeira parede sólida à direita, ou no fim da fase. */
  private addSkeletonPlatform(object: LevelObject): void {
    const x = object.x * TILE_SIZE;
    const y = object.y * TILE_SIZE;
    const width = SKELETON_PLATFORM_CELLS * TILE_SIZE;
    const wall = skeletonWallColumn(object, this.grid.width, (column, row) => this.grid.collisionAt(column, row) === COLLISION.solid);

    this.platforms.push({
      kind: 'skeleton',
      x,
      y,
      width,
      deltaX: 0,
      deltaY: 0,
      previousX: x,
      previousY: y,
      axis: 'horizontal',
      start: x,
      end: Math.max(x, wall * TILE_SIZE - width),
      velocity: 0,
      isHidden: false,
      vanishCountdown: 0,
    });
  }

  private releaseContents(block: InteractiveBlock, x: number, y: number): void {
    switch (block.contents) {
      case 'heart':
        this.host.spawnCollectible('heart', x, y, {});
        return;
      case 'crystal':
        this.host.spawnCollectible('crystal', x, y, { crystalIndex: block.crystalIndex });
        return;
      case 'power-up':
        this.host.spawnCollectible('power-up', x, y, { powerUp: block.powerUp ?? 'super-jump' });
        return;
      case 'lucky':
        this.host.spawnCollectible('power-up', x, y, { powerUp: this.host.pickLuckyPowerUp() });
        this.host.effects.burst('sparkle', x, y + TILE_SIZE / 2, 14);
        this.host.effects.floatingText(x, y - TILE_SIZE / 2, '🍀 SORTE!', '#ffe066');
        return;
      case 'multi-coins':
        this.releaseOneCoin(block, x, y);
        return;
      case 'coins':
      case undefined:
        this.host.addCoins(SURPRISE_COIN_COUNT, x, y);
        this.host.effects.coinFountain(x, y + TILE_SIZE / 2, SURPRISE_COIN_COUNT);
        return;
    }
  }

  /** Uma moeda por cabeçada; a última esvazia o bloco. */
  private releaseOneCoin(block: InteractiveBlock, x: number, y: number): void {
    block.coinsLeft -= 1;
    block.isUsed = block.coinsLeft <= 0;
    this.host.addCoins(1, x, y);
    this.host.effects.coinFountain(x, y + TILE_SIZE / 2, 1);
  }

  private launch(player: Player, block: InteractiveBlock, now: number): void {
    player.bounce(PLAYER_PHYSICS.springVelocity, false);
    block.bumpedAt = now;
    this.host.playSound('spring');
    this.host.effects.burst('sparkle', (block.cellX + 0.5) * TILE_SIZE, block.cellY * TILE_SIZE, 8);
  }

  /** A mola do teto empurra para baixo, já na queda mais rápida. */
  private launchDown(player: Player, block: InteractiveBlock, now: number): void {
    player.pushDown(PLAYER_PHYSICS.maxFallSpeed);
    block.bumpedAt = now;
    this.host.playSound('spring');
    this.host.effects.burst('sparkle', (block.cellX + 0.5) * TILE_SIZE, (block.cellY + 1) * TILE_SIZE, 8);
  }

  /** Diferente da mola, o quique pode ser cortado: soltar o pulo vira um saltinho. */
  private bounceOnNote(player: Player, block: InteractiveBlock, now: number): void {
    player.bounce(PLAYER_PHYSICS.noteBlockVelocity, true);
    block.bumpedAt = now;
    this.playNoteOf(block);
    this.host.effects.burst('sparkle', (block.cellX + 0.5) * TILE_SIZE, block.cellY * TILE_SIZE, 6);
  }

  /**
   * Quanto mais alto o bloco, mais aguda a nota: uma escadinha de blocos
   * musicais toca a escala. Passando de duas oitavas, a escala recomeça.
   */
  private playNoteOf(block: InteractiveBlock): void {
    this.host.playNote((this.grid.height - 1 - block.cellY) % NOTE_BLOCK_DEGREES);
  }

  private startCrumbling(block: InteractiveBlock, now: number): void {
    if (block.isUsed) {
      return;
    }

    block.isUsed = true;
    block.crumbleStartedAt = now;

    this.host.scheduler.after(now, CRUMBLE_DELAY_MS, () => {
      block.isHidden = true;
      this.grid.setCollision(block.cellX, block.cellY, COLLISION.empty);
      this.host.effects.burst('dust', (block.cellX + 0.5) * TILE_SIZE, (block.cellY + 0.25) * TILE_SIZE, 8);

      this.host.scheduler.after(now + CRUMBLE_DELAY_MS, CRUMBLE_RESPAWN_MS, () => {
        block.isUsed = false;
        block.isHidden = false;
        this.grid.setCollision(block.cellX, block.cellY, COLLISION.oneWay);
      });
    });
  }

  private key(cellX: number, cellY: number): number {
    return cellY * this.grid.width + cellX;
  }
}

function overlapsHazard(body: PhysicsBody, hazard: Hazard): boolean {
  return (
    body.x < hazard.x + hazard.width &&
    body.x + body.width > hazard.x &&
    body.y < hazard.y + hazard.height &&
    body.y + body.height > hazard.y
  );
}
