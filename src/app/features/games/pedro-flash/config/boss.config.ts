import type { BossId } from '../models/runner.model';

/** Ataques que um chefão sabe fazer. */
export type BossAttackKind = 'bomba' | 'onda';

export interface BossProfile {
  readonly id: BossId;
  readonly name: string;
  readonly emoji: string;
  readonly description: string;
  /** Golpes que ele aguenta na dificuldade normal. */
  readonly hits: number;
  readonly attacks: readonly BossAttackKind[];
  /** Segundos entre um ataque e outro na dificuldade normal. */
  readonly attackSeconds: number;
  readonly color: string;
  readonly accent: string;
}

/**
 * Os robôs do Doutor Apagão, que quer roubar a eletricidade do mundo.
 *
 * Cada chefão ensina um jeito de desviar — o primeiro joga bombas (andar
 * para o lado), o segundo solta ondas (pular) — e o último junta os dois.
 */
export const BOSSES: readonly BossProfile[] = [
  {
    id: 'trovao',
    name: 'Robô Trovão',
    emoji: '🤖',
    description: 'Joga bombas na pista. Desvie para o lado!',
    hits: 3,
    attacks: ['bomba'],
    attackSeconds: 1.7,
    color: '#5b6b8c',
    accent: '#ffd23f',
  },
  {
    id: 'tufao',
    name: 'Robô Tufão',
    emoji: '🌪️',
    description: 'Solta ondas de choque no chão. Pule por cima!',
    hits: 4,
    attacks: ['onda'],
    attackSeconds: 2.1,
    color: '#2f8f8a',
    accent: '#7fe3ff',
  },
  {
    id: 'apagao',
    name: 'Doutor Apagão',
    emoji: '🦹',
    description: 'O chefão final: bombas e ondas ao mesmo tempo.',
    hits: 5,
    attacks: ['bomba', 'onda'],
    attackSeconds: 1.5,
    color: '#3a2d5c',
    accent: '#ff4fd8',
  },
];

const BOSSES_BY_ID = new Map(BOSSES.map((boss) => [boss.id, boss]));

export function bossProfile(id: BossId): BossProfile {
  const boss = BOSSES_BY_ID.get(id);

  if (!boss) {
    throw new Error(`Chefão "${id}" não existe no Pedro Flash.`);
  }

  return boss;
}
