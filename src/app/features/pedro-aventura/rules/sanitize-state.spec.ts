import { createInitialState } from './aventura-game';
import { sanitizeState } from './sanitize-state';

const NOW = new Date('2026-10-20T12:00:00-03:00');

describe('sanitizeState', () => {
  it('começa do zero quando o dado não é um objeto', () => {
    expect(sanitizeState('lixo', NOW)).toEqual(createInitialState(NOW));
    expect(sanitizeState(null, NOW)).toEqual(createInitialState(NOW));
  });

  it('descarta o que não reconhece e mantém o resto', () => {
    const state = sanitizeState(
      {
        wallet: { coins: 120.9, diamonds: -4, transactions: [{ id: 'x' }], appliedIds: ['a', 'a'] },
        levels: { '1-1': { bestStars: 9, wins: 2, attempts: 3, bestTimeMs: 'rápido' }, '99-1': { wins: 1 } },
        seasons: { 'temporada-1': { xp: 500, passes: ['vip', 'ouro'], claimedRewards: ['1:gratuito', '42:vip'] } },
        missions: { 'diaria-moedas': { period: '2026-10-20', value: 30, isClaimed: 'sim' }, inventada: { period: 'x' } },
        inventory: { owned: ['lambo-gold', 'carro-falso'], equipped: { vehicle: 'lambo-gold', outfit: 'rex' } },
        settings: { quality: 'ultra', musicVolume: 3, effectsVolume: 0.3, touchControls: 'sempre' },
      },
      NOW,
    );

    expect(state.wallet).toEqual(jasmine.objectContaining({ coins: 120, diamonds: 0, transactions: [], appliedIds: ['a'] }));
    expect(Object.keys(state.levels)).toEqual(['1-1']);
    expect(state.levels['1-1']).toEqual({ bestStars: 3, bestTimeMs: null, bestScore: 0, wins: 2, attempts: 3 });
    expect(state.seasons['temporada-1']).toEqual({ seasonId: 'temporada-1', xp: 500, passes: ['vip'], claimedRewards: ['1:gratuito'] });
    expect(state.missions).toEqual({ 'diaria-moedas': { period: '2026-10-20', value: 30, isClaimed: false } });
    expect(state.inventory.owned).toContain('lambo-gold');
    expect(state.inventory.owned).not.toContain('carro-falso');
    expect(state.inventory.equipped).toEqual({ outfit: 'moletom-coroa', dog: 'rex', vehicle: 'lambo-gold' });
    expect(state.settings).toEqual({ quality: 'auto', musicVolume: 1, effectsVolume: 0.3, touchControls: 'sempre', difficulty: 'facil' });
  });
});
