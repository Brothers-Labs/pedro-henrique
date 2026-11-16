/**
 * Cor do texto que dá para ler em cima de um fundo: escuro nos fundos
 * claros, branco nos escuros. Usa a luminância relativa do WCAG.
 */
export function readableTextColor(background: string): '#1b1530' | '#ffffff' {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(background);

  if (!match) {
    return '#ffffff';
  }

  const [red, green, blue] = match.slice(1).map((channel) => toLinear(Number.parseInt(channel, 16) / 255));
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  // Ponto em que o contraste com branco e com o escuro fica igual.
  return luminance > 0.2 ? '#1b1530' : '#ffffff';
}

function toLinear(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
