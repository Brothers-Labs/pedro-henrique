/**
 * Cores das princesas originais do Pedro Maker, compartilhadas pelo retrato e
 * pelo modelo 3D. O vestido e a coroa também estão no `outfit` de cada uma
 * (camiseta e boné), porque são as cores que os menus mostram.
 */
export interface PrincessColors {
  readonly dress: string;
  /** Faixa da cintura e barra do vestido. */
  readonly trim: string;
  readonly hair: string;
  /** Pedra da coroa e do decote. */
  readonly gem: string;
  readonly shoe: string;
}

/** Ouro da coroa: igual para todas, é o que faz a princesa ser reconhecida de longe. */
export const CROWN_GOLD = '#ffc629';

/** Princesa Estrela: vestido lilás com faixa branca e uma estrela azul na coroa. */
export const ESTRELA_PRINCESS: PrincessColors = {
  dress: '#a77bf0',
  trim: '#f6f0ff',
  hair: '#4a2a12',
  gem: '#3fa3f5',
  shoe: '#5b3aa8',
};

/** Princesa Jade: vestido verde-jade, cabelo preto e pedra vermelha. */
export const JADE_PRINCESS: PrincessColors = {
  dress: '#1fa37a',
  trim: '#ffe7a3',
  hair: '#1b1b22',
  gem: '#e8343a',
  shoe: '#14684d',
};

/** Princesa Coral: vestido coral com barra turquesa e cabelo ruivo. */
export const CORAL_PRINCESS: PrincessColors = {
  dress: '#ff7a5c',
  trim: '#2bb7c9',
  hair: '#b8482a',
  gem: '#2bb7c9',
  shoe: '#a8452f',
};
