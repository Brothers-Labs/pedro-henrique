import { PET_CONFIG, petInteraction } from '../data/pet.data';
import type { Pet, PetCelebration, PetXpSource } from '../models/pet.model';
import {
  accessoryStateOf,
  achievementProgressOf,
  achievementsProgressOf,
  addXp,
  applyInteraction,
  createPet,
  equipAccessory,
  evolutionPreview,
  grantRewardAccessory,
  levelPercentage,
  renamePet,
  sanitizePetName,
  stageFor,
  withActivity,
  xpForLevel,
  xpToNextLevel,
} from './pet-progress';

const NOW = new Date('2026-09-20T10:00:00.000Z');

function newPet(): Pet {
  return createPet('dragao', 'Foguinho', NOW);
}

/** Leva o mascote até o nível pedido pelo caminho normal: ganhando XP. */
function raiseTo(pet: Pet, level: number): Pet {
  let current = pet;

  while (current.level < level) {
    current = addXp(current, [{ source: 'atividade', amount: xpForLevel(current.level) }], NOW).pet;
  }

  return current;
}

function kinds(celebrations: readonly PetCelebration[]): readonly string[] {
  return celebrations.map((celebration) => celebration.kind);
}

describe('xpForLevel', () => {
  it('cresce um degrau por nível até o teto', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(250);
    expect(xpForLevel(7)).toBe(1000);
  });

  it('respeita o teto para subir de nível nunca virar impossível', () => {
    expect(xpForLevel(11)).toBe(PET_CONFIG.maxLevelXp);
    expect(xpForLevel(40)).toBe(PET_CONFIG.maxLevelXp);
  });
});

describe('stageFor', () => {
  it('segue as faixas do catálogo', () => {
    expect(stageFor(1).id).toBe('bebe');
    expect(stageFor(5).id).toBe('bebe');
    expect(stageFor(6).id).toBe('jovem');
    expect(stageFor(15).id).toBe('jovem');
    expect(stageFor(16).id).toBe('adulto');
    expect(stageFor(31).id).toBe('lendario');
    expect(stageFor(99).id).toBe('lendario');
  });
});

describe('createPet', () => {
  it('nasce no nível 1, sem XP e com a primeira memória', () => {
    const pet = newPet();

    expect(pet.level).toBe(1);
    expect(pet.xp).toBe(0);
    expect(pet.name).toBe('Foguinho');
    expect(pet.timeline.length).toBe(1);
    expect(pet.timeline[0].type).toBe('adocao');
  });

  it('usa o nome do tipo quando a criança não escreve nada', () => {
    expect(createPet('robo', '   ', NOW).name).toBe('Robô');
  });

  it('limita o tamanho do nome escolhido', () => {
    const pet = createPet('dino', 'Nome absurdamente comprido demais', NOW);

    expect(pet.name.length).toBe(PET_CONFIG.maxNameLength);
  });
});

describe('addXp', () => {
  it('soma as parcelas e sobe um nível só, mesmo quando sobra XP', () => {
    const outcome = addXp(
      newPet(),
      [
        { source: 'atividade', amount: 10 },
        { source: 'acerto', amount: 2 },
        { source: 'meta-diaria', amount: 120 },
      ],
      NOW,
    );

    expect(outcome.gainedXp).toBe(132);
    expect(outcome.pet.level).toBe(2);
    expect(outcome.pet.xp).toBe(32);
    expect(kinds(outcome.celebrations)).toContain('nivel');
  });

  it('nunca aceita XP negativo', () => {
    const pet = newPet();
    const outcome = addXp(pet, [{ source: 'atividade', amount: -500 }], NOW);

    expect(outcome.gainedXp).toBe(0);
    expect(outcome.pet.xp).toBe(0);
    expect(outcome.pet.level).toBe(1);
  });

  it('comemora uma vez só quando um ganho grande sobe dois níveis', () => {
    const outcome = addXp(newPet(), [{ source: 'conquista', amount: 400 }], NOW);

    expect(outcome.pet.level).toBe(3);
    expect(kinds(outcome.celebrations).filter((kind) => kind === 'nivel').length).toBe(1);
  });

  it('troca a comemoração de nível pela de evolução ao mudar de estágio', () => {
    const almost = raiseTo(newPet(), 5);
    const outcome = addXp(almost, [{ source: 'atividade', amount: xpForLevel(5) }], NOW);

    expect(outcome.pet.level).toBe(6);
    expect(stageFor(outcome.pet.level).id).toBe('jovem');
    expect(kinds(outcome.celebrations)).toContain('evolucao');
    expect(kinds(outcome.celebrations)).not.toContain('nivel');
  });

  it('não evolui duas vezes para o mesmo estágio', () => {
    const jovem = raiseTo(newPet(), 6);
    const outcome = addXp(jovem, [{ source: 'atividade', amount: xpForLevel(6) }], NOW);

    expect(outcome.pet.level).toBe(7);
    expect(outcome.pet.counters.evolutions).toBe(1);
    expect(kinds(outcome.celebrations)).not.toContain('evolucao');
  });

  it('desbloqueia o acessório do nível alcançado', () => {
    const pet = raiseTo(newPet(), 3);

    expect(accessoryStateOf(pet, 'bone')).toBe('disponivel');
    expect(accessoryStateOf(pet, 'coroa')).toBe('bloqueado');
  });

  it('nunca libera pelo nível um acessório que é prêmio', () => {
    const pet = raiseTo(newPet(), 30);

    expect(accessoryStateOf(pet, 'coroa')).toBe('disponivel');
    expect(accessoryStateOf(pet, 'mochila')).toBe('bloqueado');
  });

  it('entrega o acessório de prêmio uma vez só, com memória na linha do tempo', () => {
    const once = grantRewardAccessory(newPet(), 'mochila', NOW);
    const twice = grantRewardAccessory(once, 'mochila', NOW);

    expect(accessoryStateOf(once, 'mochila')).toBe('disponivel');
    expect(twice).toBe(once);
    expect(once.timeline.filter((event) => event.type === 'acessorio').length).toBe(1);
  });

  it('não entrega como prêmio um acessório que vem pelo nível', () => {
    const pet = newPet();

    expect(grantRewardAccessory(pet, 'coroa', NOW)).toBe(pet);
  });

  it('guarda apenas os níveis redondos na linha do tempo', () => {
    const pet = raiseTo(newPet(), 5);
    const levelEvents = pet.timeline.filter((event) => event.type === 'nivel');

    expect(levelEvents.length).toBe(1);
    expect(levelEvents[0].description).toContain('nível 5');
  });
});

describe('conquistas', () => {
  it('desbloqueia ao atingir a meta e não repete depois', () => {
    const pet = raiseTo(newPet(), 2);
    const firstStep = achievementProgressOf(pet, achievementsProgressOf(pet)[0].achievement);

    expect(firstStep.isCompleted).toBeTrue();

    const again = addXp(pet, [{ source: 'atividade', amount: 10 }], NOW);

    expect(kinds(again.celebrations)).not.toContain('conquista');
    expect(again.pet.achievements.filter((entry) => entry.id === 'primeiro-passo').length).toBe(1);
  });

  it('mostra progresso parcial do que ainda falta', () => {
    let pet = newPet();

    for (let index = 0; index < 3; index += 1) {
      pet = withActivity(pet, { streak: index, day: `2026-09-2${index}` });
    }

    const studious = achievementsProgressOf(pet).find(
      (entry) => entry.achievement.id === 'estudioso',
    );

    expect(studious?.current).toBe(3);
    expect(studious?.goal).toBe(5);
    expect(studious?.isCompleted).toBeFalse();
  });

  it('conta a amizade pelas brincadeiras', () => {
    let pet = newPet();

    for (let index = 0; index < 20; index += 1) {
      pet = applyInteraction(pet, 'carinho', NOW).pet;
    }

    const friend = achievementsProgressOf(pet).find(
      (entry) => entry.achievement.id === 'melhor-amigo',
    );

    expect(friend?.isCompleted).toBeTrue();
  });
});

describe('applyInteraction', () => {
  it('mantém felicidade e energia entre 0 e 100', () => {
    let pet = newPet();

    for (let index = 0; index < 10; index += 1) {
      pet = applyInteraction(pet, 'brincar', NOW).pet;
    }

    expect(pet.happiness).toBe(PET_CONFIG.maxMood);
    expect(pet.energy).toBeGreaterThanOrEqual(PET_CONFIG.minMood);
    expect(pet.energy).toBeLessThanOrEqual(PET_CONFIG.maxMood);
  });

  it('descansar devolve energia sem passar do limite', () => {
    const rest = petInteraction('descansar');
    const pet = applyInteraction(newPet(), 'descansar', NOW).pet;

    expect(pet.energy).toBe(Math.min(PET_CONFIG.maxMood, PET_CONFIG.initialEnergy + rest.energy));
  });

  it('nunca dá XP: brincar é companhia, não tarefa', () => {
    const outcome = applyInteraction(newPet(), 'lanche', NOW);

    expect(outcome.gainedXp).toBe(0);
    expect(outcome.pet.totalXp).toBe(0);
  });
});

describe('acessórios', () => {
  it('não veste o que ainda está bloqueado', () => {
    const pet = equipAccessory(newPet(), 'coroa');

    expect(pet.equippedAccessory).toBeNull();
  });

  it('veste e tira o que já foi desbloqueado', () => {
    const unlocked = raiseTo(newPet(), 3);
    const dressed = equipAccessory(unlocked, 'bone');

    expect(dressed.equippedAccessory).toBe('bone');
    expect(accessoryStateOf(dressed, 'bone')).toBe('equipado');
    expect(equipAccessory(dressed, null).equippedAccessory).toBeNull();
  });
});

describe('leituras da tela', () => {
  it('calcula a porcentagem e o que falta do nível atual', () => {
    const pet = addXp(newPet(), [{ source: 'atividade', amount: 40 }], NOW).pet;

    expect(levelPercentage(pet)).toBe(40);
    expect(xpToNextLevel(pet)).toBe(60);
  });

  it('descreve a próxima evolução enquanto ela existir', () => {
    const preview = evolutionPreview(raiseTo(newPet(), 3));

    expect(preview?.next.id).toBe('jovem');
    expect(preview?.levelsRemaining).toBe(3);
  });

  it('não promete evolução para quem já é lendário', () => {
    const legendary = { ...newPet(), level: 31 };

    expect(evolutionPreview(legendary)).toBeNull();
  });
});

describe('sanitizePetName', () => {
  it('remove espaços sobrando e mantém o nome legível', () => {
    expect(sanitizePetName('  Fogu   inho  ')).toBe('Fogu inho');
  });

  it('recusa renomear para vazio', () => {
    const pet = newPet();

    expect(renamePet(pet, '   ').name).toBe('Foguinho');
    expect(renamePet(pet, 'Brasa').name).toBe('Brasa');
  });
});

describe('withActivity', () => {
  it('conta a atividade, guarda o dia e a melhor sequência', () => {
    const pet = withActivity(withActivity(newPet(), { streak: 3, day: '2026-09-20' }), {
      streak: 1,
      day: '2026-09-20',
    });

    expect(pet.counters.activities).toBe(2);
    expect(pet.counters.bestStreak).toBe(3);
    expect(pet.counters.activeDays).toEqual(['2026-09-20']);
  });

  it('ignora sequência negativa vinda de um dado corrompido', () => {
    const pet = withActivity(newPet(), { streak: -9, day: '2026-09-20' });

    expect(pet.counters.bestStreak).toBe(0);
  });
});

describe('origens do XP', () => {
  it('registra de onde veio cada parcela concedida', () => {
    const sources: readonly PetXpSource[] = ['atividade', 'acerto'];
    const outcome = addXp(
      newPet(),
      sources.map((source) => ({ source, amount: 5 })),
      NOW,
    );

    expect(outcome.grants.map((grant) => grant.source)).toEqual(sources);
  });
});
