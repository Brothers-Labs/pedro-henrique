import type { Lane, PieceKind } from '../models/course.model';

/** Como a peça aparece no editor e o que ela faz na fase. */
export type PieceGroup = 'ajuda' | 'perigo' | 'robo';

export interface PieceDefinition {
  readonly kind: PieceKind;
  readonly label: string;
  readonly emoji: string;
  readonly group: PieceGroup;
  /** Falso para peças que ocupam a pista de lado a lado. */
  readonly usesLane: boolean;
  /** O que o editor conta quando a criança escolhe a peça. */
  readonly hint: string;
}

/**
 * As doze peças do Pedro Flash Maker, na ordem da paleta.
 *
 * Primeiro o que ajuda, depois os perigos e por último os robôs: a criança
 * monta a diversão antes de montar o desafio.
 */
export const PIECES: readonly PieceDefinition[] = [
  { kind: 'raios', label: 'Raios', emoji: '⚡', group: 'ajuda', usesLane: true, hint: 'Uma fileira de raios para juntar.' },
  { kind: 'mola', label: 'Mola', emoji: '🌀', group: 'ajuda', usesLane: false, hint: 'Joga o Pedro lá no alto.' },
  { kind: 'turbo', label: 'Turbo', emoji: '💨', group: 'ajuda', usesLane: false, hint: 'Placa que dispara o Pedro para a frente.' },
  { kind: 'rampa', label: 'Rampa', emoji: '🛹', group: 'ajuda', usesLane: false, hint: 'Um salto com manobra no ar.' },
  { kind: 'loop', label: 'Looping', emoji: '🎢', group: 'ajuda', usesLane: false, hint: 'Uma volta de cabeça para baixo. Só cabe numa reta.' },
  { kind: 'caixa', label: 'Caixa surpresa', emoji: '🎁', group: 'ajuda', usesLane: false, hint: 'Escudo, ímã de raios ou energia.' },
  { kind: 'espinhos', label: 'Espinhos', emoji: '🦔', group: 'perigo', usesLane: true, hint: 'Desvie ou pule por cima.' },
  { kind: 'barreira', label: 'Barreira', emoji: '🚧', group: 'perigo', usesLane: true, hint: 'Segura o Pedro se ele bater.' },
  { kind: 'buraco', label: 'Buraco', emoji: '🕳️', group: 'perigo', usesLane: false, hint: 'Pule para não cair.' },
  { kind: 'besouro', label: 'Robô besouro', emoji: '🪲', group: 'robo', usesLane: true, hint: 'Anda de um lado para o outro.' },
  { kind: 'abelha', label: 'Robô abelha', emoji: '🐝', group: 'robo', usesLane: true, hint: 'Voa na altura do Pedro: pule nela!' },
  { kind: 'tatu', label: 'Robô tatu', emoji: '🛞', group: 'robo', usesLane: true, hint: 'Vem rolando na direção do Pedro.' },
];

/** O editor gira a faixa nesta ordem a cada toque: meio, esquerda, direita. */
export const LANE_CYCLE: readonly Lane[] = [0, -1, 1];

const PIECES_BY_KIND = new Map(PIECES.map((piece) => [piece.kind, piece]));

/** Ficha da peça. Falha alto: um tipo fora do catálogo é erro de programação. */
export function pieceDefinition(kind: PieceKind): PieceDefinition {
  const piece = PIECES_BY_KIND.get(kind);

  if (!piece) {
    throw new Error(`Peça "${kind}" não existe no Pedro Flash.`);
  }

  return piece;
}

export function isPieceKind(value: unknown): value is PieceKind {
  return typeof value === 'string' && PIECES_BY_KIND.has(value as PieceKind);
}

export function isLane(value: unknown): value is Lane {
  return value === -1 || value === 0 || value === 1;
}
