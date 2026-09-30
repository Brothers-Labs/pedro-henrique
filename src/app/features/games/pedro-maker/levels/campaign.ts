import type { CampaignLevel, World, WorldId } from '../models/campaign.model';
import type { LevelBlueprint } from '../models/level.model';
import { buildBossArena } from './campaign/boss-arena';
import { buildCavernaDosCristais } from './campaign/caverna-dos-cristais';
import {
  buildAreiaQuente,
  buildCamaraDourada,
  buildOasisEscondido,
  buildPiramidePequena,
} from './campaign/deserto-dourado';
import { buildFlorestaSaltitante } from './campaign/floresta-saltitante';
import { buildJardimSecreto } from './campaign/jardim-secreto';
import {
  buildLagoCongelado,
  buildPalacioDeGelo,
  buildPrimeiraNeve,
  buildTrilhaDoPinheiro,
} from './campaign/montanha-congelada';
import { buildPrimeirosPassos } from './campaign/primeiros-passos';
import {
  buildEscadaDeNuvens,
  buildJardimDeEstrelas,
  buildLuaSaltitante,
  buildObservatorioEstelar,
} from './campaign/reino-das-estrelas';
import {
  buildForjaSecreta,
  buildPedrasQuentes,
  buildPontesDeBasalto,
  buildRioDeLava,
} from './campaign/vulcao-flamejante';
import { generateLevel } from './level-generator';
import { seedFromText } from './seeded-random';
import { WORLD_ENEMIES, WORLD_LEVEL_NAMES, WORLDS } from './worlds.data';

export const LEVELS_PER_WORLD = 10;
export const BOSS_LEVEL_NUMBER = 10;

/** Fase em que fica a porta secreta de cada mundo. */
export const SECRET_ENTRANCES: Readonly<Record<WorldId, string>> = {
  1: '1-2',
  2: '2-2',
  3: '3-3',
  4: '4-2',
  5: '5-2',
};

/** Fase secreta de cada mundo, liberada pela porta dourada da fase de entrada. */
const SECRET_LEVELS: Readonly<Record<WorldId, { readonly name: string; readonly build: () => LevelBlueprint }>> = {
  1: { name: 'Jardim Secreto', build: buildJardimSecreto },
  2: { name: 'Câmara Dourada', build: buildCamaraDourada },
  3: { name: 'Palácio de Gelo', build: buildPalacioDeGelo },
  4: { name: 'Forja Secreta', build: buildForjaSecreta },
  5: { name: 'Observatório Estelar', build: buildObservatorioEstelar },
};

/**
 * Fases desenhadas à mão: as três primeiras de cada mundo. As fases 4 a 9 são
 * geradas com semente fixa e as fases 10 são as arenas de chefão.
 */
const HANDCRAFTED: Readonly<Record<string, () => LevelBlueprint>> = {
  '1-1': buildPrimeirosPassos,
  '1-2': buildFlorestaSaltitante,
  '1-3': buildCavernaDosCristais,
  '2-1': buildAreiaQuente,
  '2-2': buildOasisEscondido,
  '2-3': buildPiramidePequena,
  '3-1': buildPrimeiraNeve,
  '3-2': buildLagoCongelado,
  '3-3': buildTrilhaDoPinheiro,
  '4-1': buildPedrasQuentes,
  '4-2': buildRioDeLava,
  '4-3': buildPontesDeBasalto,
  '5-1': buildEscadaDeNuvens,
  '5-2': buildJardimDeEstrelas,
  '5-3': buildLuaSaltitante,
};

/**
 * Campanha completa: cinco mundos, dez fases cada e uma fase secreta por mundo.
 *
 * As três primeiras fases de cada mundo e todas as arenas de chefão são
 * desenhadas à mão.
 * As outras nascem do gerador com uma semente derivada do próprio id — por
 * isso a 3-6 é sempre a mesma 3-6, em qualquer aparelho — e ficam mais longas
 * e desafiadoras conforme o mundo e a posição.
 */
export const CAMPAIGN_LEVELS: readonly CampaignLevel[] = WORLDS.flatMap((world) => [
  ...Array.from({ length: LEVELS_PER_WORLD }, (_, index) => campaignLevel(world, index + 1)),
  secretLevel(world),
]);

const LEVELS_BY_ID = new Map(CAMPAIGN_LEVELS.map((level) => [level.id, level]));

export function campaignLevelById(id: string): CampaignLevel | undefined {
  return LEVELS_BY_ID.get(id);
}

export function levelsOfWorld(worldId: WorldId): readonly CampaignLevel[] {
  return CAMPAIGN_LEVELS.filter((level) => level.worldId === worldId);
}

/** Próxima fase da ordem da campanha, sem contar a secreta. */
export function nextCampaignLevel(id: string): CampaignLevel | undefined {
  const ordered = CAMPAIGN_LEVELS.filter((level) => level.kind !== 'secret');
  const index = ordered.findIndex((level) => level.id === id);

  return index >= 0 ? ordered[index + 1] : undefined;
}

function campaignLevel(world: World, number: number): CampaignLevel {
  const id = `${world.id}-${number}`;

  if (number === BOSS_LEVEL_NUMBER) {
    return {
      id,
      worldId: world.id,
      number,
      name: world.boss.name,
      kind: 'boss',
      build: () => buildBossArena(world),
    };
  }

  const name = WORLD_LEVEL_NAMES[world.id][number - 1] ?? `Fase ${id}`;

  return {
    id,
    worldId: world.id,
    number,
    name,
    kind: 'normal',
    build: HANDCRAFTED[id] ?? (() => generateCampaignLevel(world, number, id, name)),
  };
}

function generateCampaignLevel(world: World, number: number, id: string, name: string): LevelBlueprint {
  return generateLevel({
    id,
    name,
    seed: seedFromText(`pedro-maker:${id}`),
    // O Vale alterna com a floresta para as fases seguidas não parecerem iguais.
    theme: world.id === 1 && number % 2 === 0 ? 'floresta' : world.theme,
    difficulty: Math.min(5, world.id - 1 + Math.ceil(number / 4)),
    width: 110 + number * 6 + world.id * 8,
    enemies: WORLD_ENEMIES[world.id],
  });
}

function secretLevel(world: World): CampaignLevel {
  const secret = SECRET_LEVELS[world.id];

  return {
    id: `${world.id}-S`,
    worldId: world.id,
    number: 0,
    name: secret.name,
    kind: 'secret',
    build: secret.build,
  };
}
