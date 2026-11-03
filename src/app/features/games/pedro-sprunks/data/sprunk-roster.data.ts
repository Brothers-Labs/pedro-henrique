import type { SprunkCharacter } from '../models/sprunk.model';

type RosterEntry = Omit<SprunkCharacter, 'shape' | 'isCustom'> & Partial<Pick<SprunkCharacter, 'shape'>>;

const ROSTER_ENTRIES: readonly RosterEntry[] = [
  { id: 'zabumba', name: 'Zabumba', color: '#f4a62a', accessory: 'antenna-headphones', costume: 'overalls', eyes: 'happy', action: 'jump', soundId: 'bumbo' },
  { id: 'morcegao', name: 'Morcegão', color: '#3b2f5c', accessory: 'cat-ears', costume: 'cape', eyes: 'glow', action: 'shake', soundId: 'caixa' },
  { id: 'pirulito', name: 'Pirulito', color: '#ff7eb6', accessory: 'antenna-headphones', costume: 'stripes', eyes: 'round', action: 'jump', soundId: 'chimbal' },
  { id: 'sombrinha', name: 'Sombrinha', color: '#2b2540', accessory: 'bunny-ears', costume: 'skeleton', eyes: 'glow', action: 'jump', soundId: 'palmas' },
  { id: 'abacate', name: 'Abacate', color: '#3fae5a', accessory: 'cap', costume: 'scarf', eyes: 'happy', action: 'jump', soundId: 'tambor' },
  { id: 'brisa', name: 'Brisa', color: '#9fd3ff', accessory: 'propeller', costume: 'bowtie', eyes: 'round', action: 'shake', soundId: 'chocalho' },
  { id: 'bolao', name: 'Bolão', color: '#5b6b80', shape: 'iron-ball', accessory: 'none', costume: 'none', eyes: 'round', action: 'lunge', soundId: 'corrente' },
  { id: 'pisca-pisca', name: 'Pisca-Pisca', color: '#1f3a4a', accessory: 'antenna-headphones', costume: 'tie', eyes: 'glow', action: 'spin', soundId: 'bip' },
  { id: 'mola', name: 'Mola', color: '#ffd23f', accessory: 'sprout', costume: 'overalls', eyes: 'star', action: 'spin', soundId: 'boing' },
  { id: 'corujinha', name: 'Corujinha', color: '#4a3b6b', accessory: 'horns', costume: 'scarf', eyes: 'glow', action: 'stretch', soundId: 'assobio' },
  { id: 'trovoada', name: 'Trovoada', color: '#2f3550', accessory: 'spikes', costume: 'cape', eyes: 'shades', action: 'shake', soundId: 'baixo' },
  { id: 'breu', name: 'Breu', color: '#1d1b2e', accessory: 'top-hat', costume: 'tie', eyes: 'glow', action: 'shake', soundId: 'baixo-grave' },
  { id: 'girassol', name: 'Girassol', color: '#e0b400', accessory: 'sun-rays', costume: 'bowtie', eyes: 'happy', action: 'spin', soundId: 'dedilhado' },
  { id: 'foguete', name: 'Foguete', color: '#ff8a3d', accessory: 'visor', costume: 'stripes', eyes: 'round', action: 'stretch', soundId: 'teclado' },
  { id: 'algodao', name: 'Algodão', color: '#eef1f6', accessory: 'bear-ears', costume: 'scarf', eyes: 'sleepy', action: 'stretch', soundId: 'sino' },
  { id: 'garoa', name: 'Garoa', color: '#34405e', accessory: 'halo', costume: 'cape', eyes: 'sleepy', action: 'stretch', soundId: 'nuvem' },
  { id: 'hortela', name: 'Hortelã', color: '#a6e22e', accessory: 'flower', costume: 'overalls', eyes: 'star', action: 'spin', soundId: 'flauta' },
  { id: 'vaga-lume', name: 'Vaga-lume', color: '#2e3a24', accessory: 'antenna-headphones', costume: 'skeleton', eyes: 'glow', action: 'spin', soundId: 'coro' },
  { id: 'lua', name: 'Lua', color: '#2f3f8a', accessory: 'crown', costume: 'bowtie', eyes: 'sleepy', action: 'stretch', soundId: 'uuh' },
  { id: 'cereja', name: 'Cereja', color: '#e8483f', accessory: 'bow', costume: 'stripes', eyes: 'happy', action: 'jump', soundId: 'la-la' },
];

/**
 * A banda do Pedro Sprunks: vinte bonecos fantasiados, um som cada.
 *
 * Mistura duas turmas no mesmo palco: a do dia, de cores vivas, e a da noite,
 * de corpo escuro e olhos brilhando. Qualquer mistura das duas soa bem, porque
 * todos os sons saem da mesma escala.
 *
 * A ordem é a da paleta: batidas primeiro, depois efeitos, melodias e vozes —
 * quem monta a banda costuma começar pela batida.
 */
export const SPRUNK_ROSTER: readonly SprunkCharacter[] = ROSTER_ENTRIES.map((entry) => ({
  shape: 'classic',
  ...entry,
  isCustom: false,
}));
