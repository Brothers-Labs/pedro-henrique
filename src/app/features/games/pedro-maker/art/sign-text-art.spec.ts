import { layoutSignText, type SignTextBox, type TextMeasure } from './sign-text-art';
import { paintObjectIcon } from './texture-catalog';

/** Cada letra ocupa 0,6 do tamanho da fonte: previsível, sem depender das fontes do navegador. */
const monospace: TextMeasure = (text, fontSize) => text.length * fontSize * 0.6;

const BOARD: SignTextBox = { maxWidth: 120, maxHeight: 60, maxLines: 3, minFontSize: 8 };

describe('Texto escrito na placa', () => {
  it('escreve uma frase curta numa linha só, com a maior letra que cabe', () => {
    const layout = layoutSignText('Oi!', BOARD, monospace);

    expect(layout.lines).toEqual(['Oi!']);
    expect(layout.fontSize).toBe(Math.floor(60 / 1.15));
  });

  it('quebra a frase em linhas sem passar da largura da placa', () => {
    const layout = layoutSignText('Cuidado com o buraco lá na frente', BOARD, monospace);

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.length).toBeLessThanOrEqual(3);
    expect(layout.lines.join(' ')).toBe('Cuidado com o buraco lá na frente');

    for (const line of layout.lines) {
      expect(monospace(line, layout.fontSize)).toBeLessThanOrEqual(BOARD.maxWidth);
    }
  });

  it('parte uma palavra mais larga que a placa em vez de deixá-la vazar', () => {
    const layout = layoutSignText('Supercalifragilisticoexpialidoso', { ...BOARD, maxLines: 4 }, monospace);

    for (const line of layout.lines) {
      expect(monospace(line, layout.fontSize)).toBeLessThanOrEqual(BOARD.maxWidth);
    }

    expect(layout.lines.join('')).toBe('Supercalifragilisticoexpialidoso');
  });

  it('corta com reticências o que não cabe nem na menor letra', () => {
    const longText = 'Esta é uma placa muito comprida com tanta coisa escrita que não cabe de jeito nenhum nela';
    const layout = layoutSignText(longText, { maxWidth: 60, maxHeight: 30, maxLines: 2, minFontSize: 10 }, monospace);

    expect(layout.fontSize).toBe(10);
    expect(layout.lines.length).toBe(2);
    expect(layout.lines.at(-1)?.endsWith('…')).toBeTrue();

    for (const line of layout.lines) {
      expect(monospace(line, layout.fontSize)).toBeLessThanOrEqual(60);
    }
  });

  it('não escreve nada numa placa sem texto ou só com espaços', () => {
    expect(layoutSignText('', BOARD, monospace).lines).toEqual([]);
    expect(layoutSignText('    ', BOARD, monospace).lines).toEqual([]);
  });

  it('desenha o texto da placa no ícone do editor, e cada frase dá um ícone diferente', () => {
    const text = spyOn(CanvasRenderingContext2D.prototype, 'fillText').and.callThrough();
    const hello = paintObjectIcon({ type: 'sign', properties: { text: 'Olá' } }, 'vale').toDataURL();

    expect(text.calls.allArgs().some(([line]) => line === 'Olá')).toBeTrue();

    const jump = paintObjectIcon({ type: 'sign', properties: { text: 'Pule!' } }, 'vale').toDataURL();
    const blank = paintObjectIcon({ type: 'sign' }, 'vale').toDataURL();

    expect(new Set([hello, jump, blank]).size).toBe(3);
  });
});
