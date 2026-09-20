/**
 * Modelos da prancheta de desenho.
 *
 * O desenho é guardado como uma lista de marcas — traços e carimbos — e não
 * como uma imagem pronta. É o que permite desfazer traço a traço, redesenhar
 * em qualquer tamanho de tela e continuar de onde parou depois de recarregar,
 * gastando alguns kilobytes em vez de alguns megabytes.
 */

export type DrawingTool = 'pincel' | 'borracha' | 'carimbo';

/** Ponto no sistema de coordenadas interno da prancheta, não da tela. */
export interface DrawingPoint {
  readonly x: number;
  readonly y: number;
}

/** Traço contínuo do pincel ou da borracha. */
export interface BrushMark {
  readonly kind: 'traco';
  readonly color: string;
  readonly size: number;
  readonly points: readonly DrawingPoint[];
}

/** Figurinha carimbada com um toque. */
export interface StampMark {
  readonly kind: 'carimbo';
  readonly emoji: string;
  readonly size: number;
  readonly point: DrawingPoint;
}

export type DrawingMark = BrushMark | StampMark;

/** Cor da paleta, com nome para quem usa leitor de tela. */
export interface DrawingColor {
  readonly value: string;
  readonly label: string;
}

/** Espessura oferecida na barra de ferramentas. */
export interface BrushSize {
  readonly value: number;
  readonly label: string;
}

/** Desenho guardado no aparelho. */
export interface StoredDrawing {
  readonly id: string;
  readonly title: string;
  /** Data em ISO (`yyyy-MM-ddTHH:mm:ss.sssZ`). */
  readonly createdAt: string;
  readonly width: number;
  readonly height: number;
  readonly blob: Blob;
}

/**
 * Projeção para a tela: troca o blob por uma object URL já criada, para que
 * nenhum componente precise cuidar do ciclo de vida dela.
 */
export type DrawingCardData = Omit<StoredDrawing, 'blob'> & {
  readonly imageUrl: string;
};
