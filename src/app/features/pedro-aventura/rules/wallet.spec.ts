import { WALLET_HISTORY_LIMIT } from '../config/economy.config';
import { applyTransactions, createWallet, transaction } from './wallet';

const NOW = new Date('2026-10-20T12:00:00-03:00');

describe('wallet', () => {
  it('credita e debita, guardando o lançamento no histórico', () => {
    const credited = applyTransactions(createWallet(), [transaction('a', 'coins', 100, 'teste', NOW)]);
    const debited = credited && applyTransactions(credited, [transaction('b', 'coins', -40, 'teste', NOW)]);

    expect(debited?.coins).toBe(60);
    expect(debited?.transactions.map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('ignora um lançamento com id já aplicado', () => {
    const once = applyTransactions(createWallet(), [transaction('premio', 'diamonds', 30, 'teste', NOW)]);
    const twice = once && applyTransactions(once, [transaction('premio', 'diamonds', 30, 'teste', NOW)]);

    expect(twice?.diamonds).toBe(30);
    expect(twice).toBe(once);
  });

  it('recusa o lote inteiro quando o saldo ficaria negativo', () => {
    const wallet = applyTransactions(createWallet(), [transaction('a', 'coins', 50, 'teste', NOW)]);

    expect(wallet && applyTransactions(wallet, [
      transaction('b', 'diamonds', 10, 'teste', NOW),
      transaction('c', 'coins', -60, 'teste', NOW),
    ])).toBeNull();
  });

  it('recusa valor quebrado e id repetido no mesmo lote', () => {
    expect(() => applyTransactions(createWallet(), [transaction('a', 'coins', 1.5, 'teste', NOW)])).toThrowError();
    expect(() =>
      applyTransactions(createWallet(), [transaction('a', 'coins', 1, 'teste', NOW), transaction('a', 'coins', 1, 'teste', NOW)]),
    ).toThrowError();
  });

  it('limita o histórico curto sem esquecer os ids já aplicados', () => {
    let wallet = createWallet();

    for (let index = 0; index < WALLET_HISTORY_LIMIT + 10; index += 1) {
      wallet = applyTransactions(wallet, [transaction(`t${index}`, 'coins', 1, 'teste', NOW)]) ?? wallet;
    }

    expect(wallet.transactions.length).toBe(WALLET_HISTORY_LIMIT);
    expect(applyTransactions(wallet, [transaction('t0', 'coins', 1, 'teste', NOW)])?.coins).toBe(wallet.coins);
  });
});
