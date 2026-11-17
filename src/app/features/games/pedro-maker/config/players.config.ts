import type { HeroId } from '../models/progress.model';
import type { MakerPlayerCount, MakerSettings } from '../models/settings.model';
import { type CharacterPalette, swappedPalette } from './character.config';

/** Um botão de "Quem vai jogar?", com o mesmo jeito dos botões do Pedro Craft. */
export interface PlayerCountOption {
  readonly count: MakerPlayerCount;
  readonly emoji: string;
  readonly name: string;
  readonly summary: string;
}

export const PLAYER_COUNT_OPTIONS: readonly PlayerCountOption[] = [
  { count: 1, emoji: '🧒', name: '1 jogador', summary: 'A aventura inteira para uma criança, com o teclado todo ou o toque.' },
  {
    count: 2,
    emoji: '🧒🧒',
    name: '2 jogadores',
    summary: 'Os dois na mesma fase. O Jogador 1 usa A, D e W; o Jogador 2, as setas ou o controle.',
  },
  {
    count: 3,
    emoji: '🧒🧒🧒',
    name: '3 jogadores',
    summary: 'A turma toda na mesma fase. O Jogador 3 usa um segundo controle de videogame.',
  },
];

/**
 * Cores dos amigos que entram na fase, na ordem: o Jogador 2 e o Jogador 3.
 * Amigo com o mesmo herói do Jogador 1 veste a roupa de "Meu personagem",
 * como ele; os outros vestem a roupa de sempre do herói escolhido.
 */
export function partnerPalettes(
  character: CharacterPalette,
  settings: Pick<MakerSettings, 'players' | 'partnerHero' | 'thirdHero'>,
): readonly CharacterPalette[] {
  const heroes: readonly HeroId[] = [settings.partnerHero, settings.thirdHero].slice(0, settings.players - 1);

  return heroes.map((hero) => swappedPalette(character, hero));
}
