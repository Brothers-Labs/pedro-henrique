import type { BrushSize, DrawingColor } from '../models/drawing.model';

/**
 * Conteúdo da prancheta de desenho.
 *
 * A paleta parte das cores do próprio site e acrescenta o que falta para
 * desenhar de verdade — preto, branco, marrom e tons de pele —, porque uma
 * criança que quer desenhar a família precisa de mais do que seis cores.
 */

/** Tamanho interno da folha, em pixels. Retrato, como uma folha de papel. */
export const DRAWING_WIDTH = 1200;
export const DRAWING_HEIGHT = 1600;

/** Cor do papel; também é a cor com que a borracha pinta. */
export const PAPER_COLOR = '#ffffff';

export const DRAWING_COLORS: readonly DrawingColor[] = [
  { value: '#2a2350', label: 'Preto' },
  { value: '#ff4f9a', label: 'Rosa' },
  { value: '#e01b45', label: 'Vermelho' },
  { value: '#f4772e', label: 'Laranja' },
  { value: '#ffb703', label: 'Amarelo' },
  { value: '#12b886', label: 'Verde' },
  { value: '#0b7a52', label: 'Verde escuro' },
  { value: '#2ba8e0', label: 'Azul' },
  { value: '#1b5fbe', label: 'Azul escuro' },
  { value: '#7b52d3', label: 'Roxo' },
  { value: '#8b5a2b', label: 'Marrom' },
  { value: '#f3c6a5', label: 'Pele clara' },
  { value: '#a9714b', label: 'Pele média' },
  { value: '#5c3a21', label: 'Pele escura' },
  { value: '#9aa5b1', label: 'Cinza' },
  { value: PAPER_COLOR, label: 'Branco' },
];

/** Espessuras do pincel, medidas na folha interna. */
export const BRUSH_SIZES: readonly BrushSize[] = [
  { value: 8, label: 'Fino' },
  { value: 18, label: 'Médio' },
  { value: 34, label: 'Grosso' },
  { value: 60, label: 'Bem grosso' },
];

/** A borracha é sempre mais larga que o pincel: apagar precisa ser fácil. */
export const ERASER_SIZE_MULTIPLIER = 2.5;

/** Figurinhas carimbáveis com um toque. */
export const DRAWING_STAMPS: readonly string[] = [
  '🦖',
  '🚀',
  '⭐',
  '❤️',
  '🌈',
  '⚽',
  '🐶',
  '🌸',
  '☀️',
  '🍕',
  '🎈',
  '😀',
];

/** Títulos sorteados quando a criança salva sem escrever um nome. */
export const DRAWING_FALLBACK_TITLES: readonly string[] = [
  'Meu desenho',
  'Obra de arte',
  'Rabisco especial',
  'Desenho do dia',
];
