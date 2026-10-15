import { SEASON } from '../config/season.config';
import {
  claimableRewards,
  createSeasonProgress,
  grantPass,
  levelInfo,
  markClaimed,
  passPrice,
  rewardStatus,
  seasonPhase,
  totalXpForLevel,
  xpForLevel,
  xpToBuyLevels,
} from './season-pass';

const NOW = new Date('2026-10-20T12:00:00-03:00');
const MAX = SEASON.tiers.length;

describe('season-pass', () => {
  it('sobe de nível quando o XP do nível fecha e para no máximo', () => {
    expect(levelInfo(0, MAX).level).toBe(1);
    expect(levelInfo(xpForLevel(1), MAX)).toEqual(jasmine.objectContaining({ level: 2, xpInLevel: 0 }));
    expect(levelInfo(totalXpForLevel(MAX) * 2, MAX)).toEqual(jasmine.objectContaining({ level: MAX, isMaxLevel: true, percentage: 100 }));
  });

  it('sabe quando a temporada começa, vale e acaba', () => {
    expect(seasonPhase(SEASON, new Date('2026-10-01T00:00:00-03:00'))).toBe('upcoming');
    expect(seasonPhase(SEASON, NOW)).toBe('active');
    expect(seasonPhase(SEASON, new Date(SEASON.endsAt))).toBe('ended');
  });

  it('libera o gratuito pelo nível e tranca os passes sem compra', () => {
    const progress = { ...createSeasonProgress(SEASON.id), xp: totalXpForLevel(3) };

    expect(rewardStatus(progress, SEASON, 3, 'gratuito')).toBe('claimable');
    expect(rewardStatus(progress, SEASON, 3, 'vip')).toBe('locked-pass');
    expect(rewardStatus(progress, SEASON, 4, 'gratuito')).toBe('locked-level');
  });

  it('não deixa resgatar o mesmo prêmio duas vezes', () => {
    const progress = { ...createSeasonProgress(SEASON.id), xp: totalXpForLevel(2) };
    const claimed = markClaimed(progress, SEASON, 1, 'gratuito', NOW);

    expect(claimed).not.toBeNull();
    expect(claimed && markClaimed(claimed, SEASON, 1, 'gratuito', NOW)).toBeNull();
  });

  it('o Luxo inclui o VIP e quem já tem o VIP paga só a diferença', () => {
    const fresh = createSeasonProgress(SEASON.id);
    const vip = grantPass(fresh, SEASON, 'vip', NOW);

    expect(passPrice(fresh, 'luxo')).toBe(490);
    expect(vip && passPrice(vip, 'luxo')).toBe(291);
    expect(grantPass(fresh, SEASON, 'luxo', NOW)?.passes).toEqual(['vip', 'luxo']);
    expect(vip && grantPass(vip, SEASON, 'vip', NOW)).toBeNull();
  });

  it('libera retroativamente os prêmios do passe nos níveis já alcançados', () => {
    const progress = grantPass({ ...createSeasonProgress(SEASON.id), xp: totalXpForLevel(5) }, SEASON, 'vip', NOW);

    expect(progress ? claimableRewards(progress, SEASON).filter((entry) => entry.pass === 'vip').length : 0).toBe(5);
  });

  it('calcula o XP para comprar níveis sem passar do máximo', () => {
    const progress = { ...createSeasonProgress(SEASON.id), xp: totalXpForLevel(MAX - 1) };

    expect(xpToBuyLevels(progress, SEASON, 5)).toBe(xpForLevel(MAX - 1));
  });
});
