import type { SprunkCharacter } from '../models/sprunk.model';

type RosterEntry = Omit<SprunkCharacter, 'shape' | 'isCustom'> & Partial<Pick<SprunkCharacter, 'shape'>>;

const ROSTER_ENTRIES: readonly RosterEntry[] = [
  { id: 'pipoca', name: 'Pipoca', color: '#f4a62a', accessory: 'crown', eyes: 'happy', action: 'jump', soundId: 'bumbo' },
  { id: 'tomate', name: 'Tomate', color: '#e8483f', accessory: 'sprout', eyes: 'round', action: 'shake', soundId: 'caixa' },
  { id: 'chiclete', name: 'Chiclete', color: '#ff7eb6', accessory: 'headphones', eyes: 'happy', action: 'jump', soundId: 'chimbal' },
  { id: 'ameixa', name: 'Ameixa', color: '#8e44c9', accessory: 'bunny-ears', eyes: 'round', action: 'jump', soundId: 'palmas' },
  { id: 'jabuti', name: 'Jabuti', color: '#3fae5a', accessory: 'cap', eyes: 'round', action: 'jump', soundId: 'tambor' },
  { id: 'ventania', name: 'Ventania', color: '#9fd3ff', accessory: 'none', eyes: 'round', action: 'shake', soundId: 'chocalho' },
  { id: 'bolao', name: 'Bolão', color: '#5b6b80', shape: 'iron-ball', accessory: 'none', eyes: 'round', action: 'lunge', soundId: 'corrente' },
  { id: 'faisca', name: 'Faísca', color: '#ffd23f', accessory: 'antennas', eyes: 'star', action: 'spin', soundId: 'bip' },
  { id: 'biscoito', name: 'Biscoito', color: '#d9b38c', accessory: 'propeller', eyes: 'happy', action: 'spin', soundId: 'boing' },
  { id: 'mare', name: 'Maré', color: '#2bb7c9', accessory: 'bucket', eyes: 'sleepy', action: 'stretch', soundId: 'assobio' },
  { id: 'ferrugem', name: 'Ferrugem', color: '#b5651d', accessory: 'horns', eyes: 'shades', action: 'shake', soundId: 'baixo' },
  { id: 'grafite', name: 'Grafite', color: '#4a4a5a', accessory: 'spikes', eyes: 'shades', action: 'shake', soundId: 'baixo-grave' },
  { id: 'musgo', name: 'Musgo', color: '#6b8e23', accessory: 'top-hat', eyes: 'shades', action: 'shake', soundId: 'dedilhado' },
  { id: 'cometa', name: 'Cometa', color: '#ff8a3d', accessory: 'visor', eyes: 'round', action: 'stretch', soundId: 'teclado' },
  { id: 'neve', name: 'Neve', color: '#eef1f6', accessory: 'bear-ears', eyes: 'sleepy', action: 'stretch', soundId: 'sino' },
  { id: 'nimbus', name: 'Nimbus', color: '#9aa7b8', accessory: 'halo', eyes: 'sleepy', action: 'stretch', soundId: 'nuvem' },
  { id: 'limao', name: 'Limão', color: '#a6e22e', accessory: 'flower', eyes: 'star', action: 'spin', soundId: 'flauta' },
  { id: 'mostarda', name: 'Mostarda', color: '#e0b400', accessory: 'sun-rays', eyes: 'happy', action: 'spin', soundId: 'coro' },
  { id: 'safira', name: 'Safira', color: '#2f5fd0', accessory: 'cat-ears', eyes: 'sleepy', action: 'stretch', soundId: 'uuh' },
  { id: 'coral', name: 'Coral', color: '#ff6f61', accessory: 'bow', eyes: 'happy', action: 'jump', soundId: 'la-la' },
];

/**
 * A banda original do Pedro Sprunks: vinte bonecos, um som cada.
 *
 * A ordem é a da paleta: batidas primeiro, depois efeitos, melodias e vozes —
 * quem monta a banda costuma começar pela batida.
 */
export const SPRUNK_ROSTER: readonly SprunkCharacter[] = ROSTER_ENTRIES.map((entry) => ({
  shape: 'classic',
  ...entry,
  isCustom: false,
}));
