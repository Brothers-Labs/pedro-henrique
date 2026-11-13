import { QUALITY } from './quality';
import { isSoftwareRenderer, renderPixelRatio, startsInUltra, ULTRA_MAX_PIXEL_RATIO, ULTRA_MAX_SUPERSAMPLING, ULTRA_RENDER_WIDTH } from './ultra-resolution';

describe('Resolução 4K do Pedro Maker', () => {
  it('só tenta o 4K quem começa na qualidade alta', () => {
    expect(startsInUltra('alta')).toBeTrue();
    expect(startsInUltra('media')).toBeFalse();
    expect(startsInUltra('baixa')).toBeFalse();
  });

  it('fora do 4K usa a densidade da tela até o teto da qualidade', () => {
    expect(renderPixelRatio(QUALITY.alta, false, 1, 1920)).toBe(1);
    expect(renderPixelRatio(QUALITY.alta, false, 3, 400)).toBe(QUALITY.alta.pixelRatio);
    expect(renderPixelRatio(QUALITY.baixa, false, 0, 800)).toBe(1);
  });

  it('no 4K desenha o quadro com 3840 pixels de largura numa tela Full HD', () => {
    const ratio = renderPixelRatio(QUALITY.alta, true, 1, 1920);

    expect(ratio).toBe(2);
    expect(1920 * ratio).toBe(ULTRA_RENDER_WIDTH);
  });

  it('no 4K estica no máximo o dobro numa janela pequena e usa a densidade maior das telas que já têm mais', () => {
    expect(renderPixelRatio(QUALITY.alta, true, 1, 640)).toBe(ULTRA_MAX_SUPERSAMPLING);
    expect(renderPixelRatio(QUALITY.alta, true, 2.5, 3840)).toBe(2.5);
    expect(renderPixelRatio(QUALITY.alta, true, 4, 1000)).toBe(ULTRA_MAX_PIXEL_RATIO);
  });

  it('reconhece a placa de vídeo emulada por software, onde o 4K fica desligado', () => {
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')).toBeTrue();
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBeTrue();
    expect(isSoftwareRenderer('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBeFalse();
  });
});
