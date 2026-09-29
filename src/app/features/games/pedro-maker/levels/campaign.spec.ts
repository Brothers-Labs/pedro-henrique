import { CAMPAIGN_LEVELS, campaignLevelById, nextCampaignLevel } from './campaign';
import { analyzeReachability } from './level-reachability';
import { findStructuralProblems } from './level-validation';

describe('Campanha do Pedro Maker', () => {
  it('tem cinco mundos de dez fases e a fase secreta do Vale', () => {
    expect(CAMPAIGN_LEVELS.filter((level) => level.kind !== 'secret').length).toBe(50);
    expect(CAMPAIGN_LEVELS.filter((level) => level.kind === 'boss').length).toBe(5);
    expect(campaignLevelById('1-S')?.kind).toBe('secret');
  });

  it('encadeia a próxima fase atravessando os mundos e pulando a secreta', () => {
    expect(nextCampaignLevel('1-1')?.id).toBe('1-2');
    expect(nextCampaignLevel('1-10')?.id).toBe('2-1');
    expect(nextCampaignLevel('5-10')).toBeUndefined();
  });

  for (const level of CAMPAIGN_LEVELS) {
    describe(`fase ${level.id}`, () => {
      const blueprint = level.build();

      it('não tem problema estrutural', () => {
        expect(findStructuralProblems(blueprint)).toEqual([]);
      });

      it('tem o portal alcançável e três cristais alcançáveis', () => {
        const report = analyzeReachability(blueprint);
        const crystals = blueprint.objects.filter(
          (object) =>
            object.type === 'crystal' ||
            (object.type === 'surprise' && object.properties?.contents === 'crystal'),
        );

        expect(report.isPortalReachable).withContext('portal').toBeTrue();
        expect(crystals.length).withContext('cristais').toBe(3);
        expect(report.unreachableCrystals).withContext('cristais fora de alcance').toBe(0);
      });

      if (level.kind === 'boss') {
        it('traz o chefão do mundo', () => {
          expect(blueprint.boss).toBeDefined();
          expect(blueprint.objects.some((object) => object.type === 'boss')).toBeTrue();
        });
      }
    });
  }

  it('gera sempre a mesma fase para o mesmo id', () => {
    const first = campaignLevelById('3-6')?.build();
    const second = campaignLevelById('3-6')?.build();

    expect(first?.objects.length).toBeGreaterThan(0);
    expect(first).toEqual(second);
  });
});
