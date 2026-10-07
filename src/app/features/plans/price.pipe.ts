import { Pipe, PipeTransform } from '@angular/core';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Centavos em reais: `1999` vira "R$ 19,99". */
export function formatPriceInCents(cents: number): string {
  return BRL.format(cents / 100);
}

@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(cents: number): string {
    return formatPriceInCents(cents);
  }
}
