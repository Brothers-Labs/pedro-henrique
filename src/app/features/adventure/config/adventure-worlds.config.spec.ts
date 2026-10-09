import { ADVENTURE_CURIOSITIES, curiosityById } from './adventure-curiosities.config';
import { ADVENTURE_WORLDS } from './adventure-worlds.config';

/**
 * Integridade do catálogo.
 *
 * O catálogo é dado, e dado digitado à mão erra: um id repetido faria duas
 * fases dividirem o mesmo progresso, e um baú apontando para uma curiosidade
 * inexistente abriria vazio.
 */
describe('Catálogo da Aventura', () => {
  const levels = ADVENTURE_WORLDS.flatMap((world) => world.levels);

  it('tem ids únicos para mundos e fases', () => {
    const worldIds = ADVENTURE_WORLDS.map((world) => world.id);
    const levelIds = levels.map((level) => level.id);

    expect(new Set(worldIds).size).toBe(worldIds.length);
    expect(new Set(levelIds).size).toBe(levelIds.length);
  });

  it('começa por um mundo aberto e só depende de mundos anteriores', () => {
    expect(ADVENTURE_WORLDS[0].unlock.kind).toBe('start');

    ADVENTURE_WORLDS.forEach((world, index) => {
      const unlock = world.unlock;

      if (unlock.kind === 'world-completed') {
        const requiredIndex = ADVENTURE_WORLDS.findIndex((candidate) => candidate.id === unlock.worldId);

        expect(requiredIndex).withContext(world.id).toBeGreaterThanOrEqual(0);
        expect(requiredIndex).withContext(world.id).toBeLessThan(index);
      }
    });
  });

  it('fecha cada mundo pronto com o guardião na última fase', () => {
    for (const world of ADVENTURE_WORLDS.filter((candidate) => candidate.levels.length > 0)) {
      const guardians = world.levels.filter((level) => level.guardian);

      expect(guardians.length).withContext(world.id).toBe(1);
      expect(world.levels.at(-1)?.guardian).withContext(world.id).toBeDefined();
    }
  });

  it('só guarda nos baús curiosidades que existem', () => {
    for (const level of levels) {
      const curiosityId = level.chest?.curiosityId;

      if (curiosityId) {
        expect(curiosityById(curiosityId)).withContext(level.id).not.toBeNull();
      }
    }
  });

  it('tem fases com pelo menos uma pergunta', () => {
    for (const level of levels) {
      expect(level.activity.questionCount).withContext(level.id).toBeGreaterThan(0);
    }
  });

  it('tem curiosidades com ids únicos', () => {
    const ids = ADVENTURE_CURIOSITIES.map((curiosity) => curiosity.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
