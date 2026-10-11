import type { AdventureCuriosity } from '../models/adventure.model';

/**
 * Diário do mascote: curiosidades guardadas nos baús da Aventura.
 *
 * Valem para qualquer mascote (dragão, robô, dino ou cachorro), por isso falam
 * de gostos e manias, e não do corpo de um tipo só.
 */
export const ADVENTURE_CURIOSITIES: readonly AdventureCuriosity[] = [
  {
    id: 'comida-favorita',
    emoji: '🍎',
    title: 'Comida favorita',
    text: '{nome} adora maçã bem vermelhinha. Diz que dá energia para contar até mil!',
  },
  {
    id: 'como-dorme',
    emoji: '😴',
    title: 'Como {nome} dorme',
    text: 'Quando {nome} dorme profundamente, ronca baixinho e sonha com números dançando.',
  },
  {
    id: 'maior-sonho',
    emoji: '☁️',
    title: 'O maior sonho',
    text: 'O maior sonho de {nome} é visitar todos os mundos do mapa junto com você.',
  },
  {
    id: 'musica-favorita',
    emoji: '🎧',
    title: 'Música favorita',
    text: '{nome} gosta de músicas com palmas. Bate o pé no ritmo sem nem perceber.',
  },
];

export function curiosityById(id: string): AdventureCuriosity | null {
  return ADVENTURE_CURIOSITIES.find((curiosity) => curiosity.id === id) ?? null;
}
