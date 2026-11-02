/**
 * Cores do macacão e do que vem com ele, compartilhadas pelo retrato e pelo
 * modelo 3D dos heróis de macacão. Boné e camiseta continuam no `outfit` de
 * cada herói, porque são as cores que os menus mostram.
 */
export interface OverallsColors {
  readonly overalls: string;
  readonly button: string;
  readonly shoe: string;
  readonly hair: string;
  readonly mustache: string;
}

/** Macacão azul de botões amarelos: o do Gui, do Mario e do Luigi. */
export const CLASSIC_OVERALLS: OverallsColors = {
  overalls: '#2f5fd0',
  button: '#ffd23f',
  shoe: '#6b3f22',
  hair: '#3a2516',
  mustache: '#2a1a10',
};

/** Giuseppe, o padeiro do bairro: avental marrom, cabelo e bigode grisalhos. */
export const GIUSEPPE_OVERALLS: OverallsColors = {
  overalls: '#8a5a35',
  button: '#f4e3c3',
  shoe: '#3d2a1c',
  hair: '#b9b9c4',
  mustache: '#9a9aa8',
};

/** Zeca Trovão: macacão preto, botões de raio e botas cinza. */
export const ZECA_OVERALLS: OverallsColors = {
  overalls: '#24232e',
  button: '#ffe14d',
  shoe: '#5d6372',
  hair: '#1b1b22',
  mustache: '#1b1b22',
};

/** Tina Turbo: macacão branco de corrida e tênis vermelhos. */
export const TINA_OVERALLS: OverallsColors = {
  overalls: '#f2f4f8',
  button: '#ff4f9a',
  shoe: '#e8483f',
  hair: '#7a3b1d',
  mustache: '#7a3b1d',
};

/** Bruno Bigorna: macacão verde-oliva de ferreiro e botas pesadas. */
export const BRUNO_OVERALLS: OverallsColors = {
  overalls: '#5f6f2a',
  button: '#c9ccd4',
  shoe: '#2b2b2b',
  hair: '#d0632a',
  mustache: '#a84a1a',
};

/** Ana Faísca, a inventora: macacão grafite e botões dourados de engrenagem. */
export const ANA_OVERALLS: OverallsColors = {
  overalls: '#3d3a4a',
  button: '#ffd23f',
  shoe: '#2a2350',
  hair: '#1b1b22',
  mustache: '#1b1b22',
};

/** Caio Cometa: macacão prateado de astronauta e cabelo ruivo. */
export const CAIO_OVERALLS: OverallsColors = {
  overalls: '#9aa7b8',
  button: '#ff4f9a',
  shoe: '#1f3a8a',
  hair: '#c8552a',
  mustache: '#c8552a',
};

/** Nina Neblina: tons de azul-claro e cabelo prateado, leve como a névoa. */
export const NINA_OVERALLS: OverallsColors = {
  overalls: '#5b8fb9',
  button: '#eef1f6',
  shoe: '#46607a',
  hair: '#c0c6d0',
  mustache: '#c0c6d0',
};

/** Otto Onda, o surfista: macacão azul-petróleo e chinelos de madeira. */
export const OTTO_OVERALLS: OverallsColors = {
  overalls: '#1d4e5f',
  button: '#ffd23f',
  shoe: '#a0703c',
  hair: '#4a2a12',
  mustache: '#3a200c',
};
