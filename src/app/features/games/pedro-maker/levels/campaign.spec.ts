import { CAMPAIGN_LEVELS, campaignLevelById, nextCampaignLevel, SECRET_ENTRANCES } from './campaign';
import { analyzeReachability } from './level-reachability';
import { findStructuralProblems } from './level-validation';

describe('Campanha do Pedro Maker', () => {
  it('tem seis mundos de dez fases e uma fase secreta por mundo', () => {
    expect(CAMPAIGN_LEVELS.filter((level) => level.kind !== 'secret').length).toBe(60);
    expect(CAMPAIGN_LEVELS.filter((level) => level.kind === 'boss').length).toBe(6);

    for (const world of [1, 2, 3, 4, 5, 6] as const) {
      expect(campaignLevelById(`${world}-S`)?.kind).withContext(`mundo ${world}`).toBe('secret');
    }
  });

  it('esconde uma porta secreta na fase de entrada de cada mundo', () => {
    for (const [world, entrance] of Object.entries(SECRET_ENTRANCES)) {
      const blueprint = campaignLevelById(entrance)?.build();

      expect(blueprint?.objects.some((object) => object.type === 'secret-door'))
        .withContext(`mundo ${world}, fase ${entrance}`)
        .toBeTrue();
    }
  });

  it('dá um chefão com desenho próprio a cada mundo', () => {
    const looks = [1, 2, 3, 4, 5, 6].map((world) => campaignLevelById(`${world}-10`)?.build().boss?.look);

    expect(new Set(looks).size).toBe(6);
  });

  it('leva o mundo do Dia das Bruxas no cenário dele, com os inimigos novos', () => {
    const handcrafted = ['6-1', '6-2', '6-3'].map((id) => campaignLevelById(id)?.build());
    const enemies = new Set(handcrafted.flatMap((blueprint) => blueprint?.objects.map((object) => object.type) ?? []));

    expect(handcrafted.every((blueprint) => blueprint?.theme === 'dia-das-bruxas')).toBeTrue();
    expect(enemies).toContain('living-pumpkin');
    expect(enemies).toContain('witch');
    expect(enemies).toContain('king-cactus');
    expect(campaignLevelById('6-10')?.build().boss?.name).toBe('Rei Abóbora');
  });

  it('encadeia a próxima fase atravessando os mundos e pulando a secreta', () => {
    expect(nextCampaignLevel('1-1')?.id).toBe('1-2');
    expect(nextCampaignLevel('1-10')?.id).toBe('2-1');
    expect(nextCampaignLevel('5-10')?.id).toBe('6-1');
    expect(nextCampaignLevel('6-10')).toBeUndefined();
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
