import { APPLIED_IDS_LIMIT, WALLET_HISTORY_LIMIT } from '../config/economy.config';
import type { Currency, Wallet, WalletTransaction } from '../models/economy.model';

export function createWallet(): Wallet {
  return { coins: 0, diamonds: 0, transactions: [], appliedIds: [] };
}

export function balanceOf(wallet: Wallet, currency: Currency): number {
  return currency === 'coins' ? wallet.coins : wallet.diamonds;
}

export function canAfford(wallet: Wallet, currency: Currency, amount: number): boolean {
  return balanceOf(wallet, currency) >= amount;
}

export function hasApplied(wallet: Wallet, id: string): boolean {
  return wallet.appliedIds.includes(id);
}

/**
 * Lança um conjunto de movimentos de uma vez só.
 *
 * Tudo ou nada: se algum débito deixaria o saldo negativo, nenhum movimento
 * entra e a função devolve `null`. Movimento com id já aplicado é ignorado —
 * é o que torna seguro reaplicar um resultado de partida ou um resgate.
 * Movimentos de valor zero não viram lançamento.
 */
export function applyTransactions(wallet: Wallet, transactions: readonly WalletTransaction[]): Wallet | null {
  const fresh = transactions.filter(
    (transaction) => transaction.amount !== 0 && !hasApplied(wallet, transaction.id),
  );

  if (new Set(fresh.map((transaction) => transaction.id)).size !== fresh.length) {
    throw new Error('Lançamentos de carteira com id repetido no mesmo lote.');
  }

  let coins = wallet.coins;
  let diamonds = wallet.diamonds;

  for (const transaction of fresh) {
    if (!Number.isInteger(transaction.amount)) {
      throw new Error(`Lançamento "${transaction.id}" com valor não inteiro.`);
    }

    if (transaction.currency === 'coins') {
      coins += transaction.amount;
    } else {
      diamonds += transaction.amount;
    }
  }

  if (coins < 0 || diamonds < 0) {
    return null;
  }

  if (fresh.length === 0) {
    return wallet;
  }

  return {
    coins,
    diamonds,
    transactions: [...[...fresh].reverse(), ...wallet.transactions].slice(0, WALLET_HISTORY_LIMIT),
    appliedIds: [...fresh.map((transaction) => transaction.id), ...wallet.appliedIds].slice(0, APPLIED_IDS_LIMIT),
  };
}

/** Atalho para montar um lançamento. */
export function transaction(id: string, currency: Currency, amount: number, reason: string, now: Date): WalletTransaction {
  return { id, currency, amount, reason, at: now.toISOString() };
}
