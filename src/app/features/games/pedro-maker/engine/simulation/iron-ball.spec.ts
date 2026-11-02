import { TILE_SIZE } from '../../config/physics.config';
import { Enemy, IRON_BALL_CHAIN_LENGTH, withinChain } from './enemy';
import { centerX, centerY } from './physics-body';

/** Avança o Bolão alguns quadros, movendo o corpo pela velocidade que ele pediu. */
function run(ball: Enemy, fromMs: number, toMs: number, heroX: number, heroY: number): void {
  const frameMs = 16;

  for (let now = fromMs; now < toMs; now += frameMs) {
    ball.step(now, heroX, heroY);
    ball.body.x += (ball.body.vx * frameMs) / 1000;
    ball.body.y += (ball.body.vy * frameMs) / 1000;
  }
}

describe('Bolão na Corrente', () => {
  const createBall = (): Enemy => new Enemy(1, 'iron-ball', 10, 6, 1, () => true, 0);

  it('fica preso numa estaca no chão da própria célula', () => {
    const ball = createBall();

    expect(ball.anchor).not.toBeNull();
    expect(ball.anchor?.y).toBe(7 * TILE_SIZE);
    expect(ball.body.y + ball.body.height).toBe(7 * TILE_SIZE);
    expect(new Enemy(2, 'slime', 10, 6, 1, () => true, 0).anchor).toBeNull();
  });

  it('não se pisa nem se queima: é de ferro', () => {
    const ball = createBall();

    expect(ball.canBeStomped).toBeFalse();
    expect(ball.isFireproof).toBeTrue();
  });

  it('treme avisando antes do bote, sem sair do lugar', () => {
    const ball = createBall();
    const heroX = centerX(ball.body) + TILE_SIZE * 2;
    const heroY = centerY(ball.body);

    ball.step(0, heroX, heroY);

    expect(ball.isWindingUp).toBeTrue();

    ball.step(200, heroX, heroY);

    expect(ball.body.vx).toBe(0);
    expect(ball.body.vy).toBe(0);
  });

  it('dá o bote na direção do herói e nunca passa do comprimento da corrente', () => {
    const ball = createBall();
    const homeX = centerX(ball.body);
    const homeY = centerY(ball.body);
    const heroX = homeX + TILE_SIZE * 4;

    run(ball, 0, 1200, heroX, homeY);

    expect(ball.isWindingUp).toBeFalse();
    expect(centerX(ball.body)).toBeGreaterThan(homeX + TILE_SIZE);
    expect(Math.hypot(centerX(ball.body) - homeX, centerY(ball.body) - homeY)).toBeLessThanOrEqual(IRON_BALL_CHAIN_LENGTH + 1);
  });

  it('ignora o herói longe da estaca', () => {
    const ball = createBall();

    ball.step(0, centerX(ball.body) + TILE_SIZE * 10, centerY(ball.body));

    expect(ball.isWindingUp).toBeFalse();
  });

  it('limita qualquer alvo ao alcance da corrente', () => {
    const home = { x: 0, y: 0 };

    expect(withinChain(home, { x: TILE_SIZE, y: 0 })).toEqual({ x: TILE_SIZE, y: 0 });

    const far = withinChain(home, { x: IRON_BALL_CHAIN_LENGTH * 3, y: 0 });

    expect(far.x).toBeCloseTo(IRON_BALL_CHAIN_LENGTH);
    expect(far.y).toBeCloseTo(0);
  });
});
