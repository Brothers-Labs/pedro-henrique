/** Cede a vez à página: a barra de progresso pinta e o navegador respira antes do próximo lote. */
export function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
