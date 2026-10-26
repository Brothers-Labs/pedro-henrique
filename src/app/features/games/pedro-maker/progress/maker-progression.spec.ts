import { lookOption, paletteFor } from '../config/character.config';
import { heroDefinition } from '../config/hero.config';
import { XP_RULES, xpForAdventurerLevel } from '../config/rules.config';
import { campaignLevelById } from '../levels/campaign';
import type { CampaignLevel } from '../models/campaign.model';
import type { LevelRunResult, MakerProgress } from '../models/progress.model';
import {
  adventurerLevelFor,
  applyCustomLevelSaved,
  applyLevelResult,
  applySecretFound,
  chooseHero,
  createMakerProgress,
  equipLook,
  isLevelUnlocked,
  lookAvailability,
  missionForToday,
  starsFor,
  type CampaignRunContext,
} from './maker-progression';

const TODAY = '2026-09-28';

function level(id: string): CampaignLevel {
  const found = campaignLevelById(id);

  if (!found) {
    throw new Error(`Fase ${id} não existe.`);
  }

  return found;
}

function run(overrides: Partial<LevelRunResult> = {}): LevelRunResult {
  return {
    timeMs: 200_000,
    coinsCollected: 10,
    coinsTotal: 40,
    crystalsFound: [false, false, false],
    enemiesDefeated: 2,
    bossDefeated: false,
    ...overrides,
  };
}

function campaign(levelId: string, overrides: Partial<CampaignRunContext> = {}): CampaignRunContext {
  return { source: 'campanha', levelId, isBoss: false, targetTimeSeconds: 90, ...overrides };
}

describe('Progressão do Pedro Maker', () => {
  let fresh: MakerProgress;

  beforeEach(() => {
    fresh = createMakerProgress(TODAY);
  });

  describe('estrelas', () => {
    it('dá uma estrela só por concluir', () => {
      expect(starsFor(run(), [false, false, false])).toBe(1);
    });

    it('dá a segunda estrela a partir de 70% das moedas', () => {
      expect(starsFor(run({ coinsCollected: 28 }), [false, true, false])).toBe(2);
      expect(starsFor(run({ coinsCollected: 27 }), [false, true, false])).toBe(1);
    });

    it('conta como completa uma fase sem moedas nem cristais', () => {
      expect(starsFor(run({ coinsTotal: 0, coinsCollected: 0, crystalsFound: [] }), [])).toBe(3);
    });
  });

  describe('nível do aventureiro', () => {
    it('começa no nível 1 e sobe ao atingir o XP exigido', () => {
      expect(adventurerLevelFor(0).level).toBe(1);
      expect(adventurerLevelFor(xpForAdventurerLevel(1)).level).toBe(2);
      expect(adventurerLevelFor(xpForAdventurerLevel(1) - 1).percentage).toBeLessThan(100);
    });

    it('ignora XP negativo ou quebrado', () => {
      expect(adventurerLevelFor(-50).level).toBe(1);
    });
  });

  describe('desbloqueio', () => {
    it('abre só a 1-1 no começo', () => {
      expect(isLevelUnlocked(fresh, level('1-1'))).toBeTrue();
      expect(isLevelUnlocked(fresh, level('1-2'))).toBeFalse();
      expect(isLevelUnlocked(fresh, level('2-1'))).toBeFalse();
      expect(isLevelUnlocked(fresh, level('1-S'))).toBeFalse();
    });

    it('abre a fase seguinte ao concluir a anterior', () => {
      const { progress } = applyLevelResult(fresh, campaign('1-1'), run(), TODAY);

      expect(isLevelUnlocked(progress, level('1-2'))).toBeTrue();
    });

    it('abre o mundo seguinte ao vencer o chefão e a fase secreta pela porta', () => {
      const afterBoss = applyLevelResult(
        fresh,
        campaign('1-10', { isBoss: true }),
        run({ bossDefeated: true }),
        TODAY,
      );

      expect(isLevelUnlocked(afterBoss.progress, level('2-1'))).toBeTrue();
      expect(afterBoss.reward.worldCompleted).toBeTrue();
      expect(isLevelUnlocked(applySecretFound(fresh, '1-S').progress, level('1-S'))).toBeTrue();
    });
  });

  describe('recompensas', () => {
    it('dá o XP de primeira vitória e depois só o de treino', () => {
      const first = applyLevelResult(fresh, campaign('1-1'), run(), TODAY);
      const second = applyLevelResult(first.progress, campaign('1-1'), run(), TODAY);

      expect(first.reward.xpGained).toBe(XP_RULES.levelCompleted);
      // A segunda fase do dia também fecha a missão diária.
      expect(second.reward.xpGained).toBe(XP_RULES.levelReplayed + XP_RULES.dailyMission);
      expect(second.reward.missionCompleted).toBeTrue();
    });

    it('soma cristais entre partidas e dá o bônus uma única vez', () => {
      const first = applyLevelResult(fresh, campaign('1-1'), run({ crystalsFound: [true, true, false] }), TODAY);
      const second = applyLevelResult(
        first.progress,
        campaign('1-1'),
        run({ crystalsFound: [false, false, true], coinsCollected: 40 }),
        TODAY,
      );
      const third = applyLevelResult(
        second.progress,
        campaign('1-1'),
        run({ crystalsFound: [true, true, true], coinsCollected: 40 }),
        '2026-09-29',
      );

      expect(second.progress.levels['1-1']?.crystals).toEqual([true, true, true]);
      expect(second.reward.stars).toBe(3);
      expect(second.reward.xpGained).toBe(
        XP_RULES.levelReplayed + XP_RULES.allCrystals + XP_RULES.threeStars + XP_RULES.dailyMission,
      );
      expect(third.reward.xpGained).toBe(XP_RULES.levelReplayed);
    });

    it('nunca piora o recorde nem as estrelas', () => {
      const good = applyLevelResult(fresh, campaign('1-1'), run({ coinsCollected: 40, timeMs: 60_000 }), TODAY);
      const worse = applyLevelResult(good.progress, campaign('1-1'), run({ coinsCollected: 1, timeMs: 99_000 }), TODAY);

      expect(worse.progress.levels['1-1']?.stars).toBe(2);
      expect(worse.progress.levels['1-1']?.bestTimeMs).toBe(60_000);
      expect(worse.progress.levels['1-1']?.bestCoins).toBe(40);
    });

    it('limita as moedas de fases criadas no editor', () => {
      const result = applyLevelResult(fresh, { source: 'minha' }, run({ coinsCollected: 500 }), TODAY);

      expect(result.reward.coinsGained).toBe(50);
      expect(result.progress.levels).toEqual({});
    });

    it('desbloqueia conquistas uma vez só', () => {
      const first = applyLevelResult(fresh, campaign('1-1'), run({ timeMs: 30_000 }), TODAY);
      const ids = first.reward.unlockedAchievements.map((achievement) => achievement.id);

      expect(ids).toContain('primeira-aventura');
      expect(ids).toContain('velocista');

      const again = applyLevelResult(first.progress, campaign('1-2'), run({ timeMs: 30_000 }), TODAY);

      expect(again.reward.unlockedAchievements.map((achievement) => achievement.id)).not.toContain(
        'primeira-aventura',
      );
    });

    it('registra a primeira fase salva no editor', () => {
      const saved = applyCustomLevelSaved(fresh);

      expect(saved.unlockedAchievements.map((achievement) => achievement.id)).toEqual(['arquiteto']);
      expect(applyCustomLevelSaved(saved.progress).unlockedAchievements).toEqual([]);
    });
  });

  describe('missão do dia', () => {
    it('recomeça em um dia novo', () => {
      const { progress } = applyLevelResult(fresh, campaign('1-1'), run(), TODAY);

      expect(missionForToday(progress, TODAY).levelsCompleted).toBe(1);
      expect(missionForToday(progress, '2026-09-29').levelsCompleted).toBe(0);
    });
  });

  describe('visual do personagem', () => {
    it('não compra sem moedas e compra quando há moedas suficientes', () => {
      const cap = lookOption('bone-laranja');

      if (!cap) {
        fail('Opção de boné inexistente.');
        return;
      }

      expect(lookAvailability(fresh, cap)).toBe('comprar');
      expect(equipLook(fresh, cap)).toBe(fresh);

      const rich = { ...fresh, coins: 100 };
      const bought = equipLook(rich, cap);

      expect(bought.coins).toBe(100 - cap.price);
      expect(bought.look.cap).toBe(cap.id);
      expect(lookAvailability(bought, cap)).toBe('equipado');
    });

    it('bloqueia a opção antes do nível exigido', () => {
      const golden = lookOption('bone-dourado');

      expect(golden ? lookAvailability({ ...fresh, coins: 999 }, golden) : null).toBe('bloqueado');
    });
  });

  describe('heróis', () => {
    it('começa com o Pedro e troca para o Gui de graça', () => {
      const withGui = chooseHero(fresh, 'gui');

      expect(fresh.hero).toBe('pedro');
      expect(withGui.hero).toBe('gui');
      expect(withGui.coins).toBe(fresh.coins);
      expect(withGui.look).toBe(fresh.look);
    });

    it('devolve o mesmo estado ao escolher o herói que já joga', () => {
      expect(chooseHero(fresh, 'pedro')).toBe(fresh);
    });

    it('veste o Pedro com o visual escolhido e o Gui sempre com a roupa dele', () => {
      const look = { cap: 'bone-roxo', shirt: 'camiseta-rosa', backpack: 'mochila-estrela' };
      const guiOutfit = heroDefinition('gui').outfit;

      if (!guiOutfit) {
        fail('O Gui deveria ter roupa própria.');
        return;
      }

      expect(paletteFor(look, 'pedro')).toEqual({
        hero: 'pedro',
        cap: '#7b52d3',
        shirt: '#ff6fae',
        backpack: '#ffc629',
        backpackStyle: 'star',
      });
      expect(paletteFor(look, 'gui')).toEqual({ hero: 'gui', ...guiOutfit });
    });

    it('veste o Mario e o Luigi com a roupa deles, sem mochila, qualquer que seja o visual do Pedro', () => {
      const look = { cap: 'bone-roxo', shirt: 'camiseta-rosa', backpack: 'mochila-estrela' };

      expect(paletteFor(look, 'mario')).toEqual(jasmine.objectContaining({ hero: 'mario', cap: '#e52521', backpackStyle: 'none' }));
      expect(paletteFor(look, 'luigi')).toEqual(jasmine.objectContaining({ hero: 'luigi', cap: '#1f9e3a', backpackStyle: 'none' }));
    });
  });
});
