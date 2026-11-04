/** Tinta das letras gravadas na madeira da placa. */
export const SIGN_INK = '#4a2a12';

const FONT_FAMILY = 'bold {size}px "Trebuchet MS", "Segoe UI", sans-serif';
const LINE_HEIGHT = 1.15;
const ELLIPSIS = '…';

/** Mede a largura de um texto num tamanho de fonte, em pixels. */
export type TextMeasure = (text: string, fontSize: number) => number;

export interface SignTextLayout {
  readonly lines: readonly string[];
  readonly fontSize: number;
}

export interface SignTextBox {
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly maxLines: number;
  /** Abaixo disto a letra fica ilegível: o texto é cortado com reticências em vez de encolher mais. */
  readonly minFontSize: number;
}

export function signFont(fontSize: number): string {
  return FONT_FAMILY.replace('{size}', String(fontSize));
}

/**
 * Distribui o texto da placa em linhas, com a maior letra que cabe.
 *
 * Tenta do maior tamanho para o menor; a primeira quebra que cabe na largura,
 * na altura e no número de linhas vence. Uma palavra mais larga que a placa é
 * partida no meio. Se nem a menor letra der conta, as linhas que sobram somem
 * e a última termina em reticências — a criança vê o começo e lê o resto no
 * balão quando chega perto.
 */
export function layoutSignText(text: string, box: SignTextBox, measure: TextMeasure): SignTextLayout {
  const words = text.trim().split(/\s+/).filter((word) => word.length > 0);

  if (words.length === 0) {
    return { lines: [], fontSize: box.minFontSize };
  }

  const largest = Math.floor(box.maxHeight / LINE_HEIGHT);

  for (let fontSize = largest; fontSize >= box.minFontSize; fontSize -= 1) {
    const lines = wrapWords(words, (line) => measure(line, fontSize) <= box.maxWidth);

    if (lines.length <= box.maxLines && lines.length * fontSize * LINE_HEIGHT <= box.maxHeight) {
      return { lines, fontSize };
    }
  }

  const fontSize = box.minFontSize;
  const fits = (line: string): boolean => measure(line, fontSize) <= box.maxWidth;
  const visibleLines = Math.max(1, Math.min(box.maxLines, Math.floor(box.maxHeight / (fontSize * LINE_HEIGHT))));
  const allLines = wrapWords(words, fits);

  if (allLines.length <= visibleLines) {
    return { lines: allLines, fontSize };
  }

  const lines = allLines.slice(0, visibleLines);

  return { lines: [...lines.slice(0, -1), withEllipsis(lines.at(-1) ?? '', fits)], fontSize };
}

/** Escreve o texto centralizado na área pedida, linha por linha. */
export function paintSignText(
  context: CanvasRenderingContext2D,
  text: string,
  area: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  minFontSize: number,
): void {
  const measure: TextMeasure = (line, fontSize) => {
    context.font = signFont(fontSize);

    return context.measureText(line).width;
  };
  const { lines, fontSize } = layoutSignText(
    text,
    { maxWidth: area.width, maxHeight: area.height, maxLines: 3, minFontSize },
    measure,
  );
  const lineHeight = fontSize * LINE_HEIGHT;
  const top = area.y + (area.height - lines.length * lineHeight) / 2 + lineHeight / 2;

  context.font = signFont(fontSize);
  context.fillStyle = SIGN_INK;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  lines.forEach((line, index) => context.fillText(line, area.x + area.width / 2, top + index * lineHeight));
}

/** Quebra gulosa: cada linha leva quantas palavras couberem; palavra grande demais é partida em letras. */
function wrapWords(words: readonly string[], fits: (line: string) => boolean): string[] {
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (fits(candidate)) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = '';

    for (const piece of splitToFit(word, fits)) {
      if (current) {
        lines.push(current);
      }

      current = piece;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

/** Parte uma palavra em pedaços que cabem; cada pedaço tem pelo menos uma letra. */
function splitToFit(word: string, fits: (line: string) => boolean): string[] {
  const pieces: string[] = [];
  let piece = '';

  for (const letter of word) {
    if (piece && !fits(piece + letter)) {
      pieces.push(piece);
      piece = letter;
    } else {
      piece += letter;
    }
  }

  if (piece) {
    pieces.push(piece);
  }

  return pieces;
}

function withEllipsis(line: string, fits: (line: string) => boolean): string {
  let kept = line;

  while (kept.length > 0 && !fits(`${kept}${ELLIPSIS}`)) {
    kept = kept.slice(0, -1);
  }

  return `${kept.trimEnd()}${ELLIPSIS}`;
}
