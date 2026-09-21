/**
 * Régua comum dos desenhos do mascote.
 *
 * Os quatro mascotes são desenhados na mesma caixa de 120×120 para que trocar
 * de companheiro não mude o enquadramento — e para que os acessórios, que são
 * posicionados em porcentagem, caiam no lugar certo em todos eles.
 */

/** Cresce o desenho a partir do centro da caixa, sem deslocá-lo. */
export function scaleTransformFor(scale: number): string {
  return `translate(60 60) scale(${scale}) translate(-60 -60)`;
}
