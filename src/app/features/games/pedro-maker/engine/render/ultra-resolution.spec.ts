import { HD_RENDER_WIDTH, isScreenMode, SCREEN_LOOKS, SCREEN_MODES, UHD_RENDER_WIDTH } from '../../config/screen.config';
import { QUALITY } from './quality';
import {
  isSoftwareRenderer,
  renderPixelRatio,
  screenPixelRatio,
  startsInUltra,
  ULTRA_MAX_PIXEL_RATIO,
  ULTRA_MAX_SUPERSAMPLING,
  ULTRA_RENDER_WIDTH,
} from './ultra-resolution';

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

describe('Telas do Pedro Maker (NES, SNES, Nintendo 64, 3D, HD e 4K)', () => {
  it('as telas retrô desenham só as linhas da época, nunca mais que a densidade normal', () => {
    expect(screenPixelRatio(SCREEN_LOOKS.nes, QUALITY.alta, true, 1, 1280, 720) * 720).toBeCloseTo(192, 6);
    expect(screenPixelRatio(SCREEN_LOOKS.snes, QUALITY.alta, true, 2, 1280, 720) * 720).toBeCloseTo(288, 6);
    expect(screenPixelRatio(SCREEN_LOOKS.n64, QUALITY.alta, true, 1, 1280, 720) * 720).toBeCloseTo(360, 6);
    // Numa janela baixinha, o N64 não passa da densidade da tela.
    expect(screenPixelRatio(SCREEN_LOOKS.n64, QUALITY.alta, true, 1, 400, 200)).toBe(1);
  });

  it('cada tela retrô corta as cores e só o NES e o SNES têm pixel quadradinho', () => {
    expect(SCREEN_LOOKS.nes.colorLevels).toBeLessThan(SCREEN_LOOKS.snes.colorLevels ?? 0);
    expect(SCREEN_LOOKS.snes.colorLevels).toBeLessThan(SCREEN_LOOKS.n64.colorLevels ?? 0);
    expect(SCREEN_MODES.filter((mode) => SCREEN_LOOKS[mode].isPixelated)).toEqual(['nes', 'snes']);
    expect(SCREEN_LOOKS['3d'].colorLevels).toBeNull();
  });

  it('o HD busca 1920 pixels de largura e o 4K, 3840', () => {
    expect(screenPixelRatio(SCREEN_LOOKS.hd, QUALITY.alta, true, 1, 960, 540) * 960).toBe(HD_RENDER_WIDTH);
    expect(screenPixelRatio(SCREEN_LOOKS['4k'], QUALITY.alta, true, 1, 1920, 1080) * 1920).toBe(UHD_RENDER_WIDTH);
    // Tela que já passa do Full HD fica na densidade dela.
    expect(screenPixelRatio(SCREEN_LOOKS.hd, QUALITY.alta, true, 1, 2560, 1440)).toBe(1);
  });

  it('sem supersampling (aparelho fraco ou jogo engasgando), HD e 4K viram o 3D', () => {
    const threeD = screenPixelRatio(SCREEN_LOOKS['3d'], QUALITY.media, false, 3, 400, 800);

    expect(threeD).toBe(QUALITY.media.pixelRatio);
    expect(screenPixelRatio(SCREEN_LOOKS.hd, QUALITY.media, false, 3, 400, 800)).toBe(threeD);
    expect(screenPixelRatio(SCREEN_LOOKS['4k'], QUALITY.media, false, 3, 400, 800)).toBe(threeD);
  });

  it('reconhece só as seis telas como escolha válida', () => {
    expect(SCREEN_MODES.every((mode) => isScreenMode(mode))).toBeTrue();
    expect(isScreenMode('8k')).toBeFalse();
    expect(isScreenMode(undefined)).toBeFalse();
  });
});
