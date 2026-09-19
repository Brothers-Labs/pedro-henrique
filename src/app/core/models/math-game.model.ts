/** Tipo de conta proposto em um desafio. */
export type MathOperation = 'soma' | 'subtracao' | 'multiplicacao' | 'divisao';

/**
 * Uma conta pronta para a tela.
 *
 * `options` vazio significa que a resposta é digitada: é assim que o jogo
 * endurece a partir dos níveis mais altos, sem mudar mais nada da mecânica.
 */
export interface MathChallenge {
  readonly id: string;
  readonly operation: MathOperation;
  /** `conta` mostra a expressão; `problema` embrulha a conta em uma história. */
  readonly kind: 'conta' | 'problema';
  /** A conta escrita (`7 + 5`) ou o enunciado do problema. */
  readonly statement: string;
  readonly prompt: string;
  readonly hint: string;
  readonly answer: number;
  readonly options: readonly number[];
}
