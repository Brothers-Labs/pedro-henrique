import type { MathOperation } from '../models/math-game.model';

/**
 * Conteúdo do jogo de matemática.
 *
 * Não há contas prontas aqui: só as frases da tela e os moldes dos problemas.
 * As contas nascem na hora, a partir do nível, para que jogar de novo nunca
 * devolva exatamente a mesma lista.
 */

export const MATH_OPERATION_LABELS: Readonly<Record<MathOperation, string>> = {
  soma: 'Soma',
  subtracao: 'Subtração',
  multiplicacao: 'Multiplicação',
  divisao: 'Divisão',
};

/** Coisas contáveis que aparecem nos problemas escritos. */
export const MATH_STORY_ITEMS: readonly string[] = [
  'carrinhos',
  'figurinhas',
  'dinossauros',
  'bolinhas de gude',
  'adesivos',
  'peças de montar',
  'gravetos',
  'conchas',
];

/**
 * Moldes dos problemas dos níveis mais altos.
 *
 * `{nome}`, `{a}`, `{b}` e `{item}` são trocados na hora de montar o enunciado.
 * Cada molde existe para uma operação: a história precisa combinar com a conta.
 */
export const MATH_STORY_TEMPLATES: Readonly<Record<MathOperation, readonly string[]>> = {
  soma: [
    '{nome} tinha {a} {item} e ganhou mais {b}. Quantos tem agora?',
    'Na caixa havia {a} {item}. {nome} colocou outros {b} dentro. Quantos ficaram na caixa?',
  ],
  subtracao: [
    '{nome} tinha {a} {item} e deu {b} para a irmã. Quantos sobraram?',
    'Havia {a} {item} na mesa e {b} caíram no chão. Quantos ficaram na mesa?',
  ],
  multiplicacao: [
    '{nome} tem {a} caixinhas com {b} {item} em cada uma. Quantos são ao todo?',
    'São {a} amigos e cada um ganhou {b} {item}. Quantos foram entregues?',
  ],
  divisao: [
    '{nome} quer dividir {a} {item} igualzinho entre {b} amigos. Quantos cada um recebe?',
    'Havia {a} {item} para guardar em {b} caixas iguais. Quantos vão em cada caixa?',
  ],
};

/** Comemorações do acerto, sorteadas para não repetir sempre a mesma. */
export const MATH_CELEBRATIONS: readonly string[] = [
  'Acertou! Você é craque nas contas.',
  'Isso mesmo! Seguindo firme.',
  'Boa! Essa conta você já domina.',
  'Perfeito! Vamos para a próxima.',
];

/** Incentivos do erro: sempre convidam a seguir, nunca corrigem duro. */
export const MATH_ENCOURAGEMENTS: readonly string[] = [
  'Quase lá! Conte de novo com calma.',
  'Tudo bem errar. A próxima vem aí!',
  'Você está perto. Que tal pedir uma dica antes?',
];
