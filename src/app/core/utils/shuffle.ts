/** Embaralha uma cópia do array com Fisher-Yates, sem alterar a origem. */
export function shuffle<TItem>(items: readonly TItem[]): TItem[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

/** Sorteia um item do array; devolve `undefined` se ele estiver vazio. */
export function pickRandom<TItem>(items: readonly TItem[]): TItem | undefined {
  return items[Math.floor(Math.random() * items.length)];
}
