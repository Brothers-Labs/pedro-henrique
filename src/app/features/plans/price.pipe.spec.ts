import { formatPriceInCents } from './price.pipe';

describe('formatPriceInCents', () => {
  it('formata centavos em reais, com vírgula', () => {
    // O Intl separa "R$" do número com espaço não separável.
    expect(formatPriceInCents(999).replace(/\s/g, ' ')).toBe('R$ 9,99');
    expect(formatPriceInCents(2999).replace(/\s/g, ' ')).toBe('R$ 29,99');
  });
});
