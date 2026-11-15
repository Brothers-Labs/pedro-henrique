import { PLAYER_PHYSICS, TILE_SIZE } from '../../config/physics.config';
import type { LevelObject } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import type { BlockSystem, InteractiveBlock } from './blocks';
import type { Collectible, CollectibleSystem } from './collectibles';
import type { PhysicsBody, WorldArea } from './physics-body';
import type { Player } from './player';
import { COLLISION, type TileGrid } from './tile-grid';
import type { VisualEventQueue } from './visual-events';

export const P_SWITCH = {
  /** Dez segundos com tijolo virado moeda e moeda virada tijolo. */
  durationMs: 10_000,
  /** Nos últimos segundos o relógio avisa com um bipe por segundo. */
  warningMs: 3_000,
} as const;

/** Área do botão dentro da célula: a metade de baixo, onde ele fica no chão. */
const BUTTON_INSET_X = 8;
const BUTTON_TOP = TILE_SIZE * 0.45;

export interface PSwitchHost {
  readonly effects: VisualEventQueue;
  playSound(cue: MakerSoundCue): void;
  /** O efeito do P-switch começou (ou foi renovado por outro botão) ou acabou. */
  onPSwitch(isActive: boolean, durationMs: number): void;
}

export interface PSwitchButton {
  readonly id: number;
  readonly cellX: number;
  readonly cellY: number;
  /** Quando foi apertado; o botão fica amassado até o fim da partida. */
  pressedAt: number;
  isPressed: boolean;
}

/** Uma moeda da fase e o tijolo que ela vira enquanto o P-switch vale. */
interface CoinBrick {
  readonly coin: Collectible;
  readonly brick: InteractiveBlock;
}

/** Um tijolo da fase e a moeda que ele vira. */
interface BrickCoin {
  readonly brick: InteractiveBlock;
  readonly coin: Collectible;
}

/**
 * O botão azul P.
 *
 * Encostar nele aperta: por dez segundos, os tijolos viram moedas e as moedas
 * soltas viram tijolos. Quando o tempo acaba, tudo volta, menos o que mudou de
 * vez: a moeda pega some (e o tijolo dela não volta) e o tijolo quebrado não
 * volta a ser moeda. Apertar outro botão enquanto vale recomeça os dez segundos.
 *
 * Nada fica preso dentro de um bloco: a moeda que o herói está tocando não
 * vira tijolo, e o tijolo que voltaria em cima dele espera ele sair.
 */
export class PSwitchSystem {
  readonly buttons: PSwitchButton[];
  /** Os tijolos que as moedas viram, criados de antemão para a tela já saber quantos desenhar. */
  readonly coinBricks: readonly InteractiveBlock[];

  private readonly pairs: readonly CoinBrick[];
  private brickCoins: BrickCoin[] = [];
  private endsAt = Number.NEGATIVE_INFINITY;
  private lastWarningSecond = Number.POSITIVE_INFINITY;
  private isActiveNow = false;

  constructor(
    objects: readonly LevelObject[],
    private readonly grid: TileGrid,
    private readonly blocks: BlockSystem,
    private readonly collectibles: CollectibleSystem,
    private readonly host: PSwitchHost,
  ) {
    this.buttons = objects
      .filter((object) => object.type === 'p-switch')
      .map((object, index) => ({ id: index + 1, cellX: object.x, cellY: object.y, pressedAt: Number.NEGATIVE_INFINITY, isPressed: false }));

    // Sem botão na fase, nenhuma moeda vira tijolo: não há o que preparar.
    const coins = this.buttons.length > 0 ? collectibles.items.filter((item) => item.kind === 'coin' && item.spawnedAt === null) : [];

    this.pairs = coins.map((coin, index) => ({ coin, brick: hiddenBrick(-(index + 1), coin) }));
    this.coinBricks = this.pairs.map((pair) => pair.brick);
  }

  get isActive(): boolean {
    return this.isActiveNow;
  }

  /** Milissegundos que ainda faltam; zero quando não vale. */
  remainingMs(now: number): number {
    return this.isActiveNow ? Math.max(0, this.endsAt - now) : 0;
  }

  update(now: number, player: Player): void {
    if (player.isActive) {
      this.pressTouched(now, player);
    }

    if (!this.isActiveNow) {
      return;
    }

    if (now >= this.endsAt) {
      this.finish(player.body);
      return;
    }

    this.warn(now);
  }

  /** Cabeçada num tijolo que era moeda: ele quebra, e aquela moeda não volta mais. */
  handleHeadHit(cellX: number, cellY: number): void {
    const pair = this.pairs.find(({ brick }) => brick.cellX === cellX && brick.cellY === cellY && isStanding(brick));

    if (pair) {
      this.breakCoinBrick(pair.brick);
    }
  }

  /** O rabo do guaxinim e o herói gigante também quebram os tijolos que eram moedas. */
  breakBricksIn(area: WorldArea): void {
    for (const { brick } of this.pairs) {
      if (isStanding(brick) && overlapsCell(area, brick.cellX, brick.cellY)) {
        this.breakCoinBrick(brick);
      }
    }
  }

  private pressTouched(now: number, player: Player): void {
    const body = player.body;

    for (const button of this.buttons) {
      if (button.isPressed || !overlapsButton(body, button)) {
        continue;
      }

      button.isPressed = true;
      button.pressedAt = now;

      // Caindo em cima, o herói quica de leve, como num pisão.
      if (body.vy > 0) {
        player.bounce(PLAYER_PHYSICS.stompBounceVelocity, true);
      }

      this.start(now, body, button);
    }
  }

  private start(now: number, body: PhysicsBody, button: PSwitchButton): void {
    const x = (button.cellX + 0.5) * TILE_SIZE;
    const y = (button.cellY + 0.5) * TILE_SIZE;

    this.host.playSound('button');
    this.host.effects.burst('sparkle', x, y, 14);
    this.host.effects.floatingText(x, y - TILE_SIZE, '🅿️ P!', '#5fb8ff');
    this.host.effects.shake('leve');
    this.endsAt = now + P_SWITCH.durationMs;
    this.lastWarningSecond = Number.POSITIVE_INFINITY;
    this.host.onPSwitch(true, P_SWITCH.durationMs);

    // Outro botão com o efeito valendo só renova o tempo: virar de novo desfaria a troca.
    if (this.isActiveNow) {
      return;
    }

    this.isActiveNow = true;
    this.turnBricksIntoCoins(now);
    this.turnCoinsIntoBricks(body);
  }

  private turnBricksIntoCoins(now: number): void {
    for (const brick of this.blocks.interactive) {
      if (brick.kind !== 'brick' || brick.isBroken || brick.isHidden) {
        continue;
      }

      const x = (brick.cellX + 0.5) * TILE_SIZE;
      const y = (brick.cellY + 0.5) * TILE_SIZE;

      brick.isHidden = true;
      this.grid.setCollision(brick.cellX, brick.cellY, COLLISION.empty);
      this.collectibles.spawn('coin', x, y, {}, now);
      this.brickCoins.push({ brick, coin: this.collectibles.items[this.collectibles.items.length - 1] });
    }
  }

  private turnCoinsIntoBricks(body: PhysicsBody): void {
    for (const { coin, brick } of this.pairs) {
      const index = this.collectibles.items.indexOf(coin);

      if (index < 0 || brick.isBroken || overlapsCell(body, brick.cellX, brick.cellY)) {
        continue;
      }

      this.collectibles.items.splice(index, 1);
      brick.isHidden = false;
      this.grid.setCollision(brick.cellX, brick.cellY, COLLISION.solid);
    }
  }

  /** Acabou o tempo: cada coisa volta ao que era, se ainda existe. */
  private finish(body: PhysicsBody): void {
    for (const { coin, brick } of this.pairs) {
      if (!isStanding(brick)) {
        continue;
      }

      brick.isHidden = true;
      this.grid.setCollision(brick.cellX, brick.cellY, COLLISION.empty);
      this.collectibles.items.push(coin);
    }

    this.brickCoins = this.brickCoins.filter((pair) => !this.restoreBrick(pair, body));

    // Só termina de vez quando o último tijolo conseguiu voltar.
    if (this.brickCoins.length > 0) {
      return;
    }

    this.isActiveNow = false;
    this.host.playSound('secret');
    this.host.onPSwitch(false, 0);
  }

  /** Devolve o tijolo; `false` quando o herói ainda está no lugar dele e é preciso esperar. */
  private restoreBrick({ brick, coin }: BrickCoin, body: PhysicsBody): boolean {
    const index = this.collectibles.items.indexOf(coin);

    if (index < 0) {
      // A moeda foi pega: aquele tijolo não existe mais.
      brick.isBroken = true;
      brick.isHidden = false;
      return true;
    }

    if (overlapsCell(body, brick.cellX, brick.cellY)) {
      return false;
    }

    this.collectibles.items.splice(index, 1);
    brick.isHidden = false;
    this.grid.setCollision(brick.cellX, brick.cellY, COLLISION.solid);
    this.host.effects.burst('dust', (brick.cellX + 0.5) * TILE_SIZE, (brick.cellY + 0.5) * TILE_SIZE, 4);

    return true;
  }

  private breakCoinBrick(brick: InteractiveBlock): void {
    brick.isBroken = true;
    brick.isHidden = true;
    this.grid.setCollision(brick.cellX, brick.cellY, COLLISION.empty);
    this.host.playSound('break');
    this.host.effects.burst('poof', (brick.cellX + 0.5) * TILE_SIZE, (brick.cellY + 0.5) * TILE_SIZE, 14);
    this.host.effects.shake('leve');
  }

  /** Um bipe a cada um dos últimos três segundos. */
  private warn(now: number): void {
    const remaining = this.endsAt - now;

    if (remaining > P_SWITCH.warningMs) {
      return;
    }

    const second = Math.ceil(remaining / 1000);

    if (second < this.lastWarningSecond) {
      this.lastWarningSecond = second;
      this.host.playSound('button');
    }
  }
}

function hiddenBrick(id: number, coin: Collectible): InteractiveBlock {
  return {
    id,
    kind: 'brick',
    cellX: Math.floor(coin.x / TILE_SIZE),
    cellY: Math.floor(coin.y / TILE_SIZE),
    isUsed: false,
    isBroken: false,
    isHidden: true,
    coinsLeft: 0,
    bumpedAt: Number.NEGATIVE_INFINITY,
    crumbleStartedAt: Number.NEGATIVE_INFINITY,
  };
}

/** Tijolo de pé: à mostra e inteiro. */
function isStanding(brick: InteractiveBlock): boolean {
  return !brick.isHidden && !brick.isBroken;
}

function overlapsButton(body: PhysicsBody, button: PSwitchButton): boolean {
  const left = button.cellX * TILE_SIZE + BUTTON_INSET_X;
  const right = (button.cellX + 1) * TILE_SIZE - BUTTON_INSET_X;
  const top = button.cellY * TILE_SIZE + BUTTON_TOP;
  const bottom = (button.cellY + 1) * TILE_SIZE;

  return body.x < right && body.x + body.width > left && body.y < bottom && body.y + body.height > top;
}

function overlapsCell(area: WorldArea, cellX: number, cellY: number): boolean {
  const left = cellX * TILE_SIZE;
  const top = cellY * TILE_SIZE;

  return area.x < left + TILE_SIZE && area.x + area.width > left && area.y < top + TILE_SIZE && area.y + area.height > top;
}
