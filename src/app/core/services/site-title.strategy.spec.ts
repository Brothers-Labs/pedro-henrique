import { environment } from '../../../environments/environment';
import { buildCanonicalUrl } from './site-title.strategy';

describe('buildCanonicalUrl', () => {
  it('monta a URL canônica sobre o endereço público do site', () => {
    expect(buildCanonicalUrl('/falar')).toBe(`${environment.siteUrl}/falar`);
  });

  it('usa a barra para a home', () => {
    expect(buildCanonicalUrl('/')).toBe(`${environment.siteUrl}/`);
    expect(buildCanonicalUrl('')).toBe(`${environment.siteUrl}/`);
  });

  it('deixa a query string e o fragmento de fora', () => {
    expect(buildCanonicalUrl('/redefinir-senha?token=segredo#topo')).toBe(
      `${environment.siteUrl}/redefinir-senha`,
    );
  });
});
