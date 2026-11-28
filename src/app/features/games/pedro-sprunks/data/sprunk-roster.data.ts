import type { SprunkCharacter } from '../models/sprunk.model';

type RosterEntry = Omit<SprunkCharacter, 'shape' | 'isCustom'> & Partial<Pick<SprunkCharacter, 'shape'>>;

const ROSTER_ENTRIES: readonly RosterEntry[] = [
  { id: 'zabumba', name: 'Zabumba', color: '#f4a62a', accessory: 'antenna-headphones', costume: 'overalls', eyes: 'happy', action: 'jump', soundId: 'bumbo' },
  { id: 'morcegao', name: 'Morcegão', color: '#3b2f5c', accessory: 'cat-ears', costume: 'cape', eyes: 'glow', action: 'shake', soundId: 'caixa' },
  { id: 'pirulito', name: 'Pirulito', color: '#ff7eb6', accessory: 'antenna-headphones', costume: 'stripes', eyes: 'round', action: 'jump', soundId: 'chimbal' },
  { id: 'sombrinha', name: 'Sombrinha', color: '#2b2540', accessory: 'bunny-ears', costume: 'skeleton', eyes: 'glow', action: 'jump', soundId: 'palmas' },
  { id: 'abacate', name: 'Abacate', color: '#3fae5a', accessory: 'cap', costume: 'scarf', eyes: 'happy', action: 'jump', soundId: 'tambor' },
  { id: 'brisa', name: 'Brisa', color: '#9fd3ff', accessory: 'propeller', costume: 'bowtie', eyes: 'round', action: 'shake', soundId: 'chocalho' },
  { id: 'laranjinha', name: 'Laranjinha', color: '#ff8a3d', accessory: 'antenna-headphones', costume: 'bowtie', eyes: 'round', action: 'jump', soundId: 'bumbo-duplo' },
  { id: 'pimentao', name: 'Pimentão', color: '#d6352b', accessory: 'spikes', costume: 'stripes', eyes: 'angry', action: 'shake', soundId: 'caixa-rapida' },
  { id: 'pratao', name: 'Pratão', color: '#f3efe4', accessory: 'cymbal', costume: 'tie', eyes: 'round', action: 'jump', soundId: 'prato' },
  { id: 'tamborim', name: 'Tamborim', color: '#e0a800', accessory: 'headphones', costume: 'drum', eyes: 'happy', action: 'jump', soundId: 'batucada' },
  { id: 'espinhudo', name: 'Espinhudo', color: '#a6e22e', accessory: 'big-spikes', costume: 'stripes', eyes: 'star', action: 'shake', soundId: 'palminhas' },
  { id: 'capuzinho', name: 'Capuzinho', color: '#f2c9a0', accessory: 'hood', costume: 'scarf', eyes: 'round', action: 'spin', soundId: 'chiado' },
  { id: 'portinha', name: 'Portinha', color: '#b5651d', accessory: 'door', costume: 'tie', eyes: 'round', action: 'shake', soundId: 'toc-toc' },
  { id: 'bolao', name: 'Bolão', color: '#5b6b80', shape: 'iron-ball', accessory: 'none', costume: 'none', eyes: 'round', action: 'lunge', soundId: 'corrente' },
  { id: 'pisca-pisca', name: 'Pisca-Pisca', color: '#1f3a4a', accessory: 'antenna-headphones', costume: 'tie', eyes: 'glow', action: 'spin', soundId: 'bip' },
  { id: 'mola', name: 'Mola', color: '#ffd23f', accessory: 'sprout', costume: 'overalls', eyes: 'star', action: 'spin', soundId: 'boing' },
  { id: 'corujinha', name: 'Corujinha', color: '#4a3b6b', accessory: 'horns', costume: 'scarf', eyes: 'glow', action: 'stretch', soundId: 'assobio' },
  { id: 'baldinho', name: 'Baldinho', color: '#2bb7c9', accessory: 'bucket', costume: 'overalls', eyes: 'crazy', action: 'shake', soundId: 'lata' },
  { id: 'robozinho', name: 'Robozinho', color: '#9aa7b8', accessory: 'robot', costume: 'overalls', eyes: 'round', action: 'spin', soundId: 'robo' },
  { id: 'antenado', name: 'Antenado', color: '#f4c430', accessory: 'antenna-ears', costume: 'tie', eyes: 'happy', action: 'jump', soundId: 'sinal' },
  { id: 'fiu-fiu', name: 'Fiu-Fiu', color: '#5b6b80', accessory: 'fedora', costume: 'scarf', eyes: 'happy', action: 'stretch', soundId: 'fiu-fiu' },
  { id: 'alo', name: 'Alô', color: '#d93a3a', accessory: 'emergency-phone', costume: 'tie', eyes: 'round', action: 'shake', soundId: 'sirene' },
  { id: 'forninho', name: 'Forninho', color: '#b48cff', accessory: 'microwave', costume: 'bowtie', eyes: 'star', action: 'jump', soundId: 'pim' },
  { id: 'trovoada', name: 'Trovoada', color: '#2f3550', accessory: 'spikes', costume: 'cape', eyes: 'shades', action: 'shake', soundId: 'baixo' },
  { id: 'breu', name: 'Breu', color: '#1d1b2e', accessory: 'top-hat', costume: 'tie', eyes: 'glow', action: 'shake', soundId: 'baixo-grave' },
  { id: 'girassol', name: 'Girassol', color: '#e0b400', accessory: 'sun-rays', costume: 'bowtie', eyes: 'happy', action: 'spin', soundId: 'dedilhado' },
  { id: 'foguete', name: 'Foguete', color: '#ff8a3d', accessory: 'visor', costume: 'stripes', eyes: 'round', action: 'stretch', soundId: 'teclado' },
  { id: 'algodao', name: 'Algodão', color: '#eef1f6', accessory: 'bear-ears', costume: 'scarf', eyes: 'sleepy', action: 'stretch', soundId: 'sino' },
  { id: 'garoa', name: 'Garoa', color: '#34405e', accessory: 'halo', costume: 'cape', eyes: 'sleepy', action: 'stretch', soundId: 'nuvem' },
  { id: 'hortela', name: 'Hortelã', color: '#a6e22e', accessory: 'flower', costume: 'overalls', eyes: 'star', action: 'spin', soundId: 'flauta' },
  { id: 'solzao', name: 'Solzão', color: '#ffd23f', shape: 'head', accessory: 'sun-rays', costume: 'none', eyes: 'happy', action: 'spin', soundId: 'raio-de-sol' },
  { id: 'uvinha', name: 'Uvinha', color: '#8e44c9', accessory: 'wacky-ears', costume: 'stripes', eyes: 'round', action: 'jump', soundId: 'baixo-pulante' },
  { id: 'arvorao', name: 'Arvorão', color: '#8b5a2b', accessory: 'tree-crown', costume: 'scarf', eyes: 'sleepy', action: 'stretch', soundId: 'madeira' },
  { id: 'ceu', name: 'Céu', color: '#9fd3ff', accessory: 'bear-ears', costume: 'bowtie', eyes: 'happy', action: 'jump', soundId: 'sininho' },
  { id: 'nublado', name: 'Nublado', color: '#8a94a6', accessory: 'tall-ears', costume: 'tie', eyes: 'sleepy', action: 'stretch', soundId: 'neblina' },
  { id: 'cristal', name: 'Cristal', color: '#7fe0f0', accessory: 'ice-crystals', costume: 'scarf', eyes: 'star', action: 'spin', soundId: 'gelinho' },
  { id: 'primavera', name: 'Primavera', color: '#ffe08a', accessory: 'flower-hair', costume: 'bowtie', eyes: 'happy', action: 'stretch', soundId: 'flautinha' },
  { id: 'sorvetinho', name: 'Sorvetinho', color: '#ffb3cf', accessory: 'ice-cream', costume: 'stripes', eyes: 'happy', action: 'jump', soundId: 'picole' },
  { id: 'pedrinho', name: 'Pedrinho', color: '#ffd1a6', accessory: 'letter-cap', costume: 'overalls', eyes: 'happy', action: 'jump', soundId: 'pulinho' },
  { id: 'vaga-lume', name: 'Vaga-lume', color: '#2e3a24', accessory: 'antenna-headphones', costume: 'skeleton', eyes: 'glow', action: 'spin', soundId: 'coro' },
  { id: 'lua', name: 'Lua', color: '#2f3f8a', accessory: 'crown', costume: 'bowtie', eyes: 'sleepy', action: 'stretch', soundId: 'uuh' },
  { id: 'cereja', name: 'Cereja', color: '#e8483f', accessory: 'bow', costume: 'stripes', eyes: 'happy', action: 'jump', soundId: 'la-la' },
  { id: 'pixel', name: 'Pixel', color: '#1f3a4a', accessory: 'monitor', costume: 'tie', eyes: 'glow', action: 'shake', soundId: 'bate-papo' },
  { id: 'bichana', name: 'Bichana', color: '#f0f0f5', accessory: 'cat-whiskers', costume: 'bowtie', eyes: 'round', action: 'stretch', soundId: 'miau' },
  { id: 'rosinha', name: 'Rosinha', color: '#ff9ccf', accessory: 'bunny-bow', costume: 'stripes', eyes: 'happy', action: 'jump', soundId: 'uh-uh' },
];

/**
 * A banda do Pedro Sprunks: quarenta e cinco bonecos fantasiados, um som cada.
 *
 * Mistura duas turmas no mesmo palco: a do dia, de cores vivas, e a da noite,
 * de corpo escuro e olhos brilhando. O Solzão é só cabeça e flutua como um sol. Qualquer mistura das duas soa bem, porque
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
