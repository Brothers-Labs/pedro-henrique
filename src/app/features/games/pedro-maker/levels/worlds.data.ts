import type { World, WorldId } from '../models/campaign.model';
import type { EnemyKind } from '../models/level.model';

/**
 * Os seis mundos da aventura.
 *
 * Cada chefão é original e tem desenho próprio — gelatina, cacto, bloco de gelo,
 * rocha de magma, cometa e abóbora —, além de cor, fúria e ajudantes próprios.
 */
export const WORLDS: readonly World[] = [
  {
    id: 1,
    name: 'Vale Verde',
    emoji: '🌳',
    description: 'Colinas, slimes saltitantes e o castelo do Rei Slime.',
    theme: 'vale',
    color: '#3cb95b',
    boss: {
      name: 'Rei Slime',
      emoji: '👑',
      color: '#43a7f0',
      accent: '#ffcf3f',
      hitPoints: 3,
      fury: 1,
      minion: 'slime',
      look: 'slime',
    },
  },
  {
    id: 2,
    name: 'Deserto Dourado',
    emoji: '🏜️',
    description: 'Dunas quentes, espinhudos e o castelo do Rei Cacto.',
    theme: 'deserto',
    color: '#e8a93a',
    boss: {
      name: 'Rei Cacto',
      emoji: '🌵',
      color: '#5fbf5a',
      accent: '#ff7aa8',
      hitPoints: 3,
      fury: 1.1,
      minion: 'spiky',
      look: 'cactus',
    },
    castle: { theme: 'castelo-rei-cacto', wall: 'desert-mountain' },
  },
  {
    id: 3,
    name: 'Montanha Congelada',
    emoji: '❄️',
    description: 'Gelo escorregadio, morcegos e picos nevados.',
    theme: 'gelo',
    color: '#5fc3ec',
    boss: {
      name: 'Gelatão',
      emoji: '🧊',
      color: '#a8e4ff',
      accent: '#ffffff',
      hitPoints: 3,
      fury: 1.2,
      minion: 'bat',
      look: 'ice',
    },
  },
  {
    id: 4,
    name: 'Vulcão Flamejante',
    emoji: '🌋',
    description: 'Lava borbulhante, robôs e pontes de pedra.',
    theme: 'vulcao',
    color: '#e8553a',
    boss: {
      name: 'Magmão',
      emoji: '🔥',
      color: '#ff7a3d',
      accent: '#ffd23f',
      hitPoints: 3,
      fury: 1.3,
      minion: 'robot',
      look: 'magma',
    },
  },
  {
    id: 5,
    name: 'Reino das Estrelas',
    emoji: '🌌',
    description: 'Plataformas no céu, fantasminhas e o último chefão.',
    theme: 'estrelas',
    color: '#8a6cf0',
    boss: {
      name: 'Cometa Rei',
      emoji: '☄️',
      color: '#9a7bff',
      accent: '#ffe066',
      hitPoints: 3,
      fury: 1.4,
      minion: 'ghost',
      look: 'comet',
    },
  },
  {
    id: 6,
    name: 'Dia das Bruxas',
    emoji: '🎃',
    description: 'Noite roxa, abóboras vivas, bruxas de vassoura e o castelo do Rei Abóbora.',
    theme: 'dia-das-bruxas',
    color: '#8a4fd1',
    boss: {
      name: 'Rei Abóbora',
      emoji: '🎃',
      color: '#ff8a1f',
      accent: '#ffe066',
      hitPoints: 3,
      fury: 1.5,
      minion: 'living-pumpkin',
      look: 'pumpkin',
    },
  },
];

/** Inimigos que aparecem nas fases geradas de cada mundo, do mais comum ao mais raro. */
export const WORLD_ENEMIES: Readonly<Record<WorldId, readonly [EnemyKind, ...EnemyKind[]]>> = {
  1: ['slime', 'slime', 'robot'],
  2: ['slime', 'spiky', 'robot'],
  3: ['slime', 'bat', 'spiky'],
  4: ['robot', 'spiky', 'bat'],
  5: ['ghost', 'bat', 'robot'],
  6: ['living-pumpkin', 'living-pumpkin', 'witch', 'ghost', 'king-cactus'],
};

/** Nomes das fases 1 a 9 de cada mundo. */
export const WORLD_LEVEL_NAMES: Readonly<Record<WorldId, readonly string[]>> = {
  1: [
    'Primeiros Passos',
    'Floresta Saltitante',
    'Caverna dos Cristais',
    'Colinas Saltitantes',
    'Ponte dos Slimes',
    'Rio das Moedas',
    'Trilha do Robô',
    'Morro Ventoso',
    'Portão do Castelo',
  ],
  2: [
    'Areia Quente',
    'Oásis Escondido',
    'Pirâmide Pequena',
    'Dunas Pulantes',
    'Cânion das Moedas',
    'Ruínas Antigas',
    'Tempestade de Areia',
    'Templo do Sol',
    'Portão Dourado',
  ],
  3: [
    'Primeira Neve',
    'Lago Congelado',
    'Trilha do Pinheiro',
    'Escorrega-Escorrega',
    'Caverna de Gelo',
    'Pico Nevado',
    'Ponte de Cristal',
    'Vento Gelado',
    'Portão do Iglu',
  ],
  4: [
    'Pedras Quentes',
    'Rio de Lava',
    'Pontes de Basalto',
    'Chaminé do Vulcão',
    'Fábrica de Robôs',
    'Salto Flamejante',
    'Cratera Brilhante',
    'Coração do Vulcão',
    'Portão de Fogo',
  ],
  5: [
    'Escada de Nuvens',
    'Jardim de Estrelas',
    'Lua Saltitante',
    'Cometa Veloz',
    'Castelo Flutuante',
    'Nebulosa Mágica',
    'Caminho da Via Láctea',
    'Constelação do Pedro',
    'Portão das Estrelas',
  ],
  6: [
    'Abóboras Saltitantes',
    'Floresta Assombrada',
    'Torre da Bruxa',
    'Rua dos Doces',
    'Lua Cheia',
    'Ponte das Bruxas',
    'Mansão Mal-Assombrada',
    'Caldeirão Borbulhante',
    'Portão das Abóboras',
  ],
};

export function worldById(id: WorldId): World {
  const world = WORLDS.find((candidate) => candidate.id === id);

  if (!world) {
    throw new Error(`Mundo ${id} não existe no catálogo.`);
  }

  return world;
}
