import { RUN_REWARDS } from '../config/economy.config';
import { findLevel } from '../config/regions.config';
import { SEASON } from '../config/season.config';
import type { AventuraState, RunResult } from '../models/aventura-state.model';
import { generateLayout } from '../simulation/level-generator';
import {
  applyRunResult,
  buyCosmetic,
  buyLevels,
  buyPass,
  claimMission,
  claimSeasonReward,
  createInitialState,
  equip,
  seasonProgressOf,
} from './aventura-game';
import { sanitizeState } from './sanitize-state';
import { levelInfo, totalXpForLevel } from './season-pass';

const NOW = new Date('2026-10-20T12:00:00-03:00');

function victory(levelId: string, overrides: Partial<RunResult> = {}): RunResult {
  return {
    attemptId: `tentativa-${levelId}-${Math.random()}`,
    levelId,
    difficulty: 'facil',
    isVictory: true,
    timeMs: 90_000,
    coins: 12,
    goldBars: 0,
    diamonds: 0,
    hearts: 0,
    crowns: 1,
    ramps: 1,
    damageTaken: 1,
    score: 500,
    ...overrides,
  };
}

function rich(state: AventuraState, diamonds: number, coins = 0): AventuraState {
  return { ...state, wallet: { ...state.wallet, diamonds, coins } };
}

describe('aventura-game', () => {
  it('aplica a vitória: moedas, diamantes da primeira vitória, XP, recorde e missão', () => {
    const outcome = applyRunResult(createInitialState(NOW), victory('1-1'), NOW);

    expect(outcome).not.toBeNull();

    if (!outcome) {
      return;
    }

    expect(outcome.state.wallet.coins).toBe(12);
    expect(outcome.state.wallet.diamonds).toBe(RUN_REWARDS.firstWinDiamonds);
    expect(outcome.state.levels['1-1']?.wins).toBe(1);
    expect(outcome.summary.isFirstWin).toBeTrue();
    expect(outcome.summary.xpGained).toBeGreaterThan(0);
    expect(outcome.summary.completedMissions.map((mission) => mission.id)).toContain('diaria-completar-fase');
  });

  it('não paga duas vezes o mesmo resultado', () => {
    const result = victory('1-1');
    const first = applyRunResult(createInitialState(NOW), result, NOW);

    expect(first && applyRunResult(first.state, result, NOW)).toBeNull();
  });

  it('recusa resultado com mais moedas do que a pista tem', () => {
    const level = findLevel('1-1');
    const totalCoins = level ? generateLayout(level).totals.coins : 0;

    expect(applyRunResult(createInitialState(NOW), victory('1-1', { coins: totalCoins + 1 }), NOW)).toBeNull();
    expect(applyRunResult(createInitialState(NOW), victory('1-1', { coins: -5 }), NOW)).toBeNull();
    expect(applyRunResult(createInitialState(NOW), victory('9-9'), NOW)).toBeNull();
  });

  it('recusa vitória em tempo impossível e fase ainda trancada', () => {
    expect(applyRunResult(createInitialState(NOW), victory('1-1', { timeMs: 1000 }), NOW)).toBeNull();
    expect(applyRunResult(createInitialState(NOW), victory('1-2'), NOW)).toBeNull();
  });

  it('credita barra de ouro como 10 moedas e diamante na carteira de diamantes', () => {
    const outcome = applyRunResult(createInitialState(NOW), victory('1-1', { coins: 5, goldBars: 1, diamonds: 2 }), NOW);

    expect(outcome?.state.wallet.coins).toBe(5 + 10);
    expect(outcome?.state.wallet.diamonds).toBe(2 + RUN_REWARDS.firstWinDiamonds);
    expect(applyRunResult(createInitialState(NOW), victory('1-1', { diamonds: 3 }), NOW)).toBeNull();
  });

  it('paga mais XP nas dificuldades maiores', () => {
    const easy = applyRunResult(createInitialState(NOW), victory('1-1'), NOW);
    const hard = applyRunResult(createInitialState(NOW), victory('1-1', { difficulty: 'dificil' }), NOW);

    expect(hard?.summary.xpGained).toBe(Math.round((easy?.summary.xpGained ?? 0) * 1.5));
  });

  it('recalcula a pontuação em vez de confiar no número da tela', () => {
    const outcome = applyRunResult(createInitialState(NOW), victory('1-1', { score: 9_999_999 }), NOW);

    expect(outcome?.state.levels['1-1']?.bestScore).toBeLessThan(9_999_999);
  });

  it('a derrota ainda guarda as moedas pegas e um pouco de XP, sem contar vitória', () => {
    const outcome = applyRunResult(createInitialState(NOW), victory('1-1', { isVictory: false }), NOW);

    expect(outcome?.state.wallet.coins).toBe(12);
    expect(outcome?.state.levels['1-1']?.wins).toBe(0);
    expect(outcome?.summary.xpGained).toBe(RUN_REWARDS.defeatXp);
  });

  it('resgata a missão completa uma vez só e soma XP de temporada', () => {
    const played = applyRunResult(createInitialState(NOW), victory('1-1'), NOW);

    if (!played) {
      fail('A vitória deveria ter sido aplicada.');
      return;
    }

    const claimed = claimMission(played.state, 'diaria-completar-fase', NOW);

    expect(claimed).not.toBeNull();
    expect(claimed && claimMission(claimed, 'diaria-completar-fase', NOW)).toBeNull();
    expect(claimed && seasonProgressOf(claimed).xp).toBeGreaterThan(seasonProgressOf(played.state).xp);
  });

  it('entrega o prêmio da trilha e recusa o mesmo prêmio de novo', () => {
    const base = createInitialState(NOW);
    const state = { ...base, seasons: { [SEASON.id]: { ...seasonProgressOf(base), xp: totalXpForLevel(10) } } };
    const withCar = claimSeasonReward(state, 10, 'gratuito', NOW);

    expect(withCar?.inventory.owned).toContain('suv-dourado');
    expect(withCar && claimSeasonReward(withCar, 10, 'gratuito', NOW)).toBeNull();
    expect(claimSeasonReward(state, 10, 'vip', NOW)).toBeNull();
  });

  it('troca diamantes pelos passes e níveis, recusando sem saldo', () => {
    const poor = createInitialState(NOW);

    expect(buyPass(poor, 'vip', NOW)).toBeNull();

    const vip = buyPass(rich(poor, 500), 'vip', NOW);

    expect(vip?.wallet.diamonds).toBe(301);
    expect(vip && seasonProgressOf(vip).passes).toEqual(['vip']);

    const levels = vip && buyLevels(vip, 2, NOW);

    expect(levels && levelInfo(seasonProgressOf(levels).xp, SEASON.tiers.length).level).toBe(3);
    expect(levels?.wallet.diamonds).toBe(301 - 2 * SEASON.levelPriceInDiamonds);
  });

  it('compra e veste cosméticos da loja, sem comprar duas vezes', () => {
    const bought = buyCosmetic(rich(createInitialState(NOW), 0, 1000), 'agasalho-vermelho', NOW);

    expect(bought?.wallet.coins).toBe(400);
    expect(bought && buyCosmetic(bought, 'agasalho-vermelho', NOW)).toBeNull();
    expect(bought && equip(bought, 'agasalho-vermelho')?.inventory.equipped.outfit).toBe('agasalho-vermelho');
    expect(equip(createInitialState(NOW), 'lambo-gold')).toBeNull();
  });

  it('sobrevive a ida e volta pelo armazenamento', () => {
    const played = applyRunResult(createInitialState(NOW), victory('1-1'), NOW);
    const restored = played && sanitizeState(JSON.parse(JSON.stringify(played.state)) as unknown, NOW);

    expect(restored).toEqual(played?.state ?? null);
  });
});
