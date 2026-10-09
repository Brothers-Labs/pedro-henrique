/** Configuração que muda de um ambiente de publicação para outro. */
export interface Environment {
  /**
   * Endereço público do site, sem barra no fim. É a base das URLs canônicas e,
   * por elas, do sitemap gerado depois do build.
   */
  readonly siteUrl: string;

  /**
   * Endereço base da API, sem barra no fim — por exemplo
   * `'https://api.exemplo.com.br/v1'`.
   *
   * `null` enquanto não existe servidor: as telas continuam funcionando e
   * avisam que o envio ainda não está disponível, em vez de quebrar.
   */
  readonly apiUrl: string | null;

  /** Recebimento das assinaturas por Pix. */
  readonly pix: PixSettings;
}

export interface PixSettings {
  /** Chave Pix que recebe os pagamentos (e-mail, telefone, CPF/CNPJ ou chave aleatória). */
  readonly key: string | null;

  /** Nome do favorecido, que o app do banco mostra antes de confirmar o Pix. */
  readonly receiverName: string | null;
}
