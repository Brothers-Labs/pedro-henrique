import { pickRandom } from '../../../core/utils/shuffle';
import type { WorldView } from '../models/adventure.model';

/**
 * Falas do mascote durante a Aventura.
 *
 * Nunca há "você falhou": errar é parte de aprender, e o mascote fala como um
 * amigo do lado, não como um juiz. `{crianca}` vira o nome da criança, `{fase}`
 * o número da fase e `{mundo}` o nome do mundo.
 */
export const COMPANION_LINES = {
  beforeLevel: ['{crianca}, estamos quase chegando!', 'Vamos juntos, {crianca}!', 'Eu confio em você!'],
  beforeGuardian: 'É o grande desafio! Respira fundo, {crianca}. Estou aqui do seu lado.',
  correct: ['Boa!', 'Mandou muito bem!', 'Isso aí!', 'Que demais!', 'Acertou em cheio!'],
  wrong: ['Quase! Vamos para a próxima.', 'Falta pouquinho!', 'Você está aprendendo!', 'Tudo bem, a gente tenta de novo!'],
  completed: 'Conseguimos, {crianca}!',
  perfect: 'PERFEITO! ⭐⭐⭐',
  worldUnlocked: 'Uau! Um lugar novo apareceu no mapa!',
  comingSoon: 'Uma nova aventura está chegando...',
  map: {
    current: '{crianca}, estamos na fase {fase} da {mundo}!',
    almostDone: 'Estamos quase chegando ao final da {mundo}!',
    worldDone: 'Terminamos a {mundo}! Que aventura, {crianca}!',
    locked: 'Essa fase ainda está trancada. Termine a fase anterior primeiro!',
  },
} as const;

/** Sorteia uma fala; a lista nunca é vazia, então sempre há o que dizer. */
export function pickLine(lines: readonly [string, ...string[]]): string {
  return pickRandom(lines) ?? lines[0];
}

/** Troca os marcadores de uma fala pelos valores informados. */
export function fillLine(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (marker, key: string) => (key in values ? String(values[key]) : marker));
}

/** Fala do mascote sobre onde a jornada está, usada no mapa e nos cartões. */
export function journeyGreeting(view: WorldView | null, childName: string): string {
  if (!view) {
    return COMPANION_LINES.comingSoon;
  }

  const values = { crianca: childName, mundo: view.world.name, fase: view.companionLevel?.order ?? 1 };

  if (view.status === 'completed') {
    return fillLine(COMPANION_LINES.map.worldDone, values);
  }

  const remaining = view.levels.length - view.completedLevels;

  return fillLine(remaining <= 2 ? COMPANION_LINES.map.almostDone : COMPANION_LINES.map.current, values);
}
