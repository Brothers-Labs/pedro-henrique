/** Configuração que muda de um ambiente de publicação para outro. */
export interface Environment {
  /**
   * Endereço base da API, sem barra no fim — por exemplo
   * `'https://api.exemplo.com.br/v1'`.
   *
   * `null` enquanto não existe servidor: as telas continuam funcionando e
   * avisam que o envio ainda não está disponível, em vez de quebrar.
   */
  readonly apiUrl: string | null;
}
