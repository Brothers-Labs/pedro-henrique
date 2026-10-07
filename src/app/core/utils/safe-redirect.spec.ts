import { redirectQueryParams, resolveSafeRedirect } from './safe-redirect';

describe('resolveSafeRedirect', () => {
  it('aceita caminhos internos, com busca e âncora', () => {
    expect(resolveSafeRedirect('/jogos')).toBe('/jogos');
    expect(resolveSafeRedirect('/jogos/pedro-kart?pista=2#topo')).toBe('/jogos/pedro-kart?pista=2#topo');
  });

  it('cai no padrão quando não há destino', () => {
    expect(resolveSafeRedirect(null)).toBe('/');
    expect(resolveSafeRedirect(undefined)).toBe('/');
    expect(resolveSafeRedirect('')).toBe('/');
    expect(resolveSafeRedirect(null, '/falar')).toBe('/falar');
  });

  it('recusa destinos fora do site', () => {
    expect(resolveSafeRedirect('https://site-falso.com')).toBe('/');
    expect(resolveSafeRedirect('//site-falso.com')).toBe('/');
    expect(resolveSafeRedirect('/\\site-falso.com')).toBe('/');
    expect(resolveSafeRedirect('javascript:alert(1)')).toBe('/');
  });

  it('recusa caracteres de controle escondidos no caminho', () => {
    expect(resolveSafeRedirect('/\t/site-falso.com')).toBe('/');
    expect(resolveSafeRedirect('/jogos\n')).toBe('/');
  });
});

describe('redirectQueryParams', () => {
  it('leva o destino adiante', () => {
    expect(redirectQueryParams('/jogos')).toEqual({ voltar: '/jogos' });
  });

  it('não suja a URL quando o destino é o início', () => {
    expect(redirectQueryParams('/')).toEqual({});
  });
});
