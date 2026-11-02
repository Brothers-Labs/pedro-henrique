import type { SprunkAccessory, SprunkCustomAction, SprunkEyes } from '../models/sprunk.model';

/**
 * As peças do criador de bonecos, com o nome que o Pedro lê na tela.
 *
 * Os registros tipados garantem que toda peça nova ganhe nome: esquecer uma é
 * erro de compilação, não um botão em branco.
 */
export const SPRUNK_ACCESSORY_LABELS: Readonly<Record<SprunkAccessory, string>> = {
  none: 'Nada',
  headphones: 'Fone',
  spikes: 'Espetos',
  propeller: 'Hélice',
  antennas: 'Antenas',
  sprout: 'Broto',
  'cat-ears': 'Orelhas de gato',
  bucket: 'Balde',
  visor: 'Viseira',
  crown: 'Coroa',
  'bear-ears': 'Orelhas de urso',
  'sun-rays': 'Raios de sol',
  horns: 'Chifres',
  flower: 'Flor',
  halo: 'Auréola',
  cap: 'Boné',
  bow: 'Laço',
  'bunny-ears': 'Orelhas de coelho',
  'top-hat': 'Cartola',
};

export const SPRUNK_EYES_LABELS: Readonly<Record<SprunkEyes, string>> = {
  round: 'Redondos',
  sleepy: 'Dormindo',
  happy: 'Felizes',
  shades: 'Óculos escuros',
  star: 'Estrelas',
};

/** O avanço na corrente é só da bola de ferro, então não entra no criador. */
export const SPRUNK_CUSTOM_ACTION_LABELS: Readonly<Record<SprunkCustomAction, string>> = {
  jump: 'Pular',
  spin: 'Girar',
  shake: 'Balançar',
  stretch: 'Esticar',
};

export const SPRUNK_ACCESSORIES = Object.keys(SPRUNK_ACCESSORY_LABELS) as readonly SprunkAccessory[];
export const SPRUNK_EYES = Object.keys(SPRUNK_EYES_LABELS) as readonly SprunkEyes[];
export const SPRUNK_CUSTOM_ACTIONS = Object.keys(SPRUNK_CUSTOM_ACTION_LABELS) as readonly SprunkCustomAction[];

export function isSprunkAccessory(value: string): value is SprunkAccessory {
  return Object.hasOwn(SPRUNK_ACCESSORY_LABELS, value);
}

export function isSprunkEyes(value: string): value is SprunkEyes {
  return Object.hasOwn(SPRUNK_EYES_LABELS, value);
}

export function isSprunkCustomAction(value: string): value is SprunkCustomAction {
  return Object.hasOwn(SPRUNK_CUSTOM_ACTION_LABELS, value);
}

/** Cores prontas para o corpo: vivas e com contorno escuro legível. */
export const SPRUNK_BODY_COLORS: readonly string[] = [
  '#e8483f',
  '#ff8a3d',
  '#ffd23f',
  '#a6e22e',
  '#3fae5a',
  '#2bb7c9',
  '#2f5fd0',
  '#8e44c9',
  '#ff7eb6',
  '#b5651d',
  '#9aa7b8',
  '#eef1f6',
];
