import type {
  IqAttentionSet,
  IqLanguageItem,
  IqSkill,
  IqToken,
  IqTokenSet,
} from '../models/iq-game.model';

export const IQ_SKILL_LABELS: Readonly<Record<IqSkill, string>> = {
  logica: 'Lógica',
  numeros: 'Números',
  visual: 'Raciocínio visual',
  memoria: 'Memória',
  atencao: 'Atenção',
  linguagem: 'Linguagem',
};

/** Conjuntos de peças dos padrões: forma e cor mudam juntas, nunca só a cor. */
export const IQ_PATTERN_SETS: readonly [IqTokenSet, ...IqTokenSet[]] = [
  {
    id: 'formas',
    minDifficulty: 1,
    tokens: [
      { symbol: '🔵', label: 'círculo azul' },
      { symbol: '🟥', label: 'quadrado vermelho' },
      { symbol: '🔺', label: 'triângulo laranja' },
      { symbol: '⭐', label: 'estrela amarela' },
    ],
  },
  {
    id: 'bichos',
    minDifficulty: 1,
    tokens: [
      { symbol: '🐶', label: 'cachorro' },
      { symbol: '🐱', label: 'gato' },
      { symbol: '🐦', label: 'passarinho' },
      { symbol: '🐢', label: 'tartaruga' },
    ],
  },
  {
    id: 'setas',
    minDifficulty: 3,
    tokens: [
      { symbol: '⬆️', label: 'seta para cima' },
      { symbol: '➡️', label: 'seta para a direita' },
      { symbol: '⬇️', label: 'seta para baixo' },
      { symbol: '⬅️', label: 'seta para a esquerda' },
    ],
  },
  {
    id: 'letras',
    minDifficulty: 4,
    tokens: [
      { symbol: 'A', label: 'letra A' },
      { symbol: 'B', label: 'letra B' },
      { symbol: 'C', label: 'letra C' },
      { symbol: 'D', label: 'letra D' },
    ],
  },
];

/** Peças usadas na contagem visual e na ilha da memória. */
export const IQ_MEMORY_TOKENS: readonly [IqToken, IqToken, ...IqToken[]] = [
  { symbol: '🍎', label: 'maçã' },
  { symbol: '🚗', label: 'carro' },
  { symbol: '🌻', label: 'girassol' },
  { symbol: '🎈', label: 'balão' },
  { symbol: '🐞', label: 'joaninha' },
  { symbol: '🍌', label: 'banana' },
  { symbol: '🧸', label: 'ursinho' },
  { symbol: '🚀', label: 'foguete' },
  { symbol: '🐟', label: 'peixe' },
  { symbol: '🎩', label: 'chapéu' },
];

/** Emoji repetido nas contagens visuais das crianças menores. */
export const IQ_COUNTING_SYMBOL = '🟡';

/** Alvo e distratores parecidos entre si, para a busca exigir atenção. */
export const IQ_ATTENTION_SETS: readonly [IqAttentionSet, ...IqAttentionSet[]] = [
  {
    target: { symbol: '🐭', label: 'ratinho' },
    distractors: [
      { symbol: '🐹', label: 'hamster' },
      { symbol: '🐰', label: 'coelho' },
    ],
  },
  {
    target: { symbol: '⭐', label: 'estrela' },
    distractors: [
      { symbol: '✨', label: 'brilhos' },
      { symbol: '🌟', label: 'estrela brilhante' },
    ],
  },
  {
    target: { symbol: '🍏', label: 'maçã verde' },
    distractors: [
      { symbol: '🍎', label: 'maçã vermelha' },
      { symbol: '🍐', label: 'pera' },
    ],
  },
  {
    target: { symbol: '🔵', label: 'círculo azul' },
    distractors: [
      { symbol: '🔷', label: 'losango azul' },
      { symbol: '🟣', label: 'círculo roxo' },
    ],
  },
];

/**
 * Banco da ilha das palavras.
 *
 * Até a dificuldade 2 são classificações visuais ("qual não pertence ao grupo");
 * a partir da 3 entram analogias, que pedem leitura mais firme.
 */
export const IQ_LANGUAGE_ITEMS: readonly IqLanguageItem[] = [
  {
    id: 'lin-grupo-frutas',
    minDifficulty: 1,
    maxDifficulty: 2,
    prompt: 'Qual não pertence ao grupo das frutas?',
    options: [
      { symbol: '🍌', label: 'banana' },
      { symbol: '🍇', label: 'uva' },
      { symbol: '🚌', label: 'ônibus' },
      { symbol: '🍓', label: 'morango' },
    ],
    correctIndex: 2,
  },
  {
    id: 'lin-grupo-bichos',
    minDifficulty: 1,
    maxDifficulty: 2,
    prompt: 'Qual não é um animal?',
    options: [
      { symbol: '🐘', label: 'elefante' },
      { symbol: '🌳', label: 'árvore' },
      { symbol: '🐸', label: 'sapo' },
      { symbol: '🐝', label: 'abelha' },
    ],
    correctIndex: 1,
  },
  {
    id: 'lin-grupo-transporte',
    minDifficulty: 1,
    maxDifficulty: 2,
    prompt: 'Qual não serve para viajar?',
    options: [
      { symbol: '✈️', label: 'avião' },
      { symbol: '🚲', label: 'bicicleta' },
      { symbol: '🍕', label: 'pizza' },
      { symbol: '🚂', label: 'trem' },
    ],
    correctIndex: 2,
  },
  {
    id: 'lin-grupo-roupas',
    minDifficulty: 1,
    maxDifficulty: 3,
    prompt: 'Qual não é uma roupa?',
    options: [
      { symbol: '👕', label: 'camiseta' },
      { symbol: '🧦', label: 'meia' },
      { symbol: '🪑', label: 'cadeira' },
      { symbol: '🧢', label: 'boné' },
    ],
    correctIndex: 2,
  },
  {
    id: 'lin-grupo-instrumentos',
    minDifficulty: 2,
    maxDifficulty: 3,
    prompt: 'Qual não faz música?',
    options: [
      { symbol: '🎸', label: 'violão' },
      { symbol: '🥁', label: 'bateria' },
      { symbol: '🪥', label: 'escova de dente' },
      { symbol: '🎺', label: 'trompete' },
    ],
    correctIndex: 2,
  },
  {
    id: 'lin-grupo-clima',
    minDifficulty: 2,
    maxDifficulty: 3,
    prompt: 'Qual não é coisa do céu?',
    options: [
      { symbol: '☁️', label: 'nuvem' },
      { symbol: '🌈', label: 'arco-íris' },
      { symbol: '🥕', label: 'cenoura' },
      { symbol: '⛈️', label: 'tempestade' },
    ],
    correctIndex: 2,
  },
  {
    id: 'lin-analogia-peixe',
    minDifficulty: 3,
    maxDifficulty: 5,
    prompt: 'Pássaro está para o céu assim como peixe está para...',
    options: [
      { symbol: 'a água', label: 'a água' },
      { symbol: 'a árvore', label: 'a árvore' },
      { symbol: 'a areia', label: 'a areia' },
      { symbol: 'o vento', label: 'o vento' },
    ],
    correctIndex: 0,
  },
  {
    id: 'lin-analogia-luva',
    minDifficulty: 3,
    maxDifficulty: 5,
    prompt: 'Sapato está para o pé assim como luva está para...',
    options: [
      { symbol: 'a mão', label: 'a mão' },
      { symbol: 'a cabeça', label: 'a cabeça' },
      { symbol: 'a perna', label: 'a perna' },
      { symbol: 'o joelho', label: 'o joelho' },
    ],
    correctIndex: 0,
  },
  {
    id: 'lin-analogia-professor',
    minDifficulty: 3,
    maxDifficulty: 5,
    prompt: 'Médico está para o hospital assim como professor está para...',
    options: [
      { symbol: 'a escola', label: 'a escola' },
      { symbol: 'a padaria', label: 'a padaria' },
      { symbol: 'o cinema', label: 'o cinema' },
      { symbol: 'a praia', label: 'a praia' },
    ],
    correctIndex: 0,
  },
  {
    id: 'lin-analogia-filhote',
    minDifficulty: 4,
    maxDifficulty: 5,
    prompt: 'Cachorro está para filhote assim como gato está para...',
    options: [
      { symbol: 'gatinho', label: 'gatinho' },
      { symbol: 'cavalo', label: 'cavalo' },
      { symbol: 'passarinho', label: 'passarinho' },
      { symbol: 'ratinho', label: 'ratinho' },
    ],
    correctIndex: 0,
  },
  {
    id: 'lin-analogia-quente',
    minDifficulty: 4,
    maxDifficulty: 5,
    prompt: 'Quente está para frio assim como alto está para...',
    options: [
      { symbol: 'baixo', label: 'baixo' },
      { symbol: 'longe', label: 'longe' },
      { symbol: 'rápido', label: 'rápido' },
      { symbol: 'grande', label: 'grande' },
    ],
    correctIndex: 0,
  },
  {
    id: 'lin-analogia-livro',
    minDifficulty: 5,
    maxDifficulty: 5,
    prompt: 'Página está para o livro assim como folha está para...',
    options: [
      { symbol: 'a árvore', label: 'a árvore' },
      { symbol: 'a chuva', label: 'a chuva' },
      { symbol: 'o papel', label: 'o papel' },
      { symbol: 'a flor', label: 'a flor' },
    ],
    correctIndex: 0,
  },
];

/** Comemorações do acerto; a fase escolhe uma para não piscar na tela. */
export const IQ_CORRECT_MESSAGES: readonly string[] = [
  'Muito bem!',
  'Excelente!',
  'Você encontrou o caminho!',
  'Isso mesmo, continue assim!',
];

/** Incentivos do erro: nunca corrigem duro nem falam em fracasso. */
export const IQ_WRONG_MESSAGES: readonly string[] = [
  'Quase lá! Vamos tentar o próximo desafio.',
  'Boa tentativa! O próximo desafio te espera.',
  'Tudo bem, faz parte da aventura. Seguimos!',
];
