import type {
  IqAchievement,
  IqAgeBand,
  IqAttentionSet,
  IqIsland,
  IqLanguageItem,
  IqLifetimeStats,
  IqSkill,
  IqToken,
  IqTokenSet,
} from '../models/iq-game.model';

/**
 * Conteúdo do Desafio da Mente.
 *
 * Os desafios não vêm prontos: guardamos aqui as faixas etárias, o mapa e os
 * bancos de peças, e o motor monta cada desafio na hora, no nível certo. Só a
 * ilha das palavras precisa de conteúdo escrito à mão.
 */

/** Idades aceitas no controle da tela inicial. */
export const IQ_MIN_AGE = 4;
export const IQ_MAX_AGE = 16;
export const IQ_DEFAULT_AGE = 7;

/** Faixas em ordem crescente de idade; a busca por idade depende dessa ordem. */
export const IQ_AGE_BANDS: readonly [IqAgeBand, ...IqAgeBand[]] = [
  {
    id: 'pequeno-explorador',
    title: 'Pequeno Explorador',
    emoji: '🐣',
    color: 'mint',
    minAge: 4,
    maxAge: 5,
    description: 'Desafios bem leves, com figuras e cores para ver e contar.',
    startingDifficulty: 1,
    challengesPerIsland: 5,
  },
  {
    id: 'explorador',
    title: 'Explorador',
    emoji: '🧭',
    color: 'blue',
    minAge: 6,
    maxAge: 7,
    description: 'Lógica e números simples, do jeitinho de quem já lê.',
    startingDifficulty: 2,
    challengesPerIsland: 5,
  },
  {
    id: 'aventureiro',
    title: 'Aventureiro',
    emoji: '🚀',
    color: 'purple',
    minAge: 8,
    maxAge: 9,
    description: 'Desafios intermediários de raciocínio e memória.',
    startingDifficulty: 3,
    challengesPerIsland: 6,
  },
  {
    id: 'mestre-desafios',
    title: 'Mestre dos Desafios',
    emoji: '🏅',
    color: 'orange',
    minAge: 10,
    maxAge: 12,
    description: 'Desafios avançados, com padrões e rotações mais difíceis.',
    startingDifficulty: 4,
    challengesPerIsland: 7,
  },
  {
    id: 'super-estrategista',
    title: 'Super Estrategista',
    emoji: '🐉',
    color: 'pink',
    minAge: 13,
    maxAge: IQ_MAX_AGE,
    description: 'Os desafios mais complexos da jornada inteira.',
    startingDifficulty: 5,
    challengesPerIsland: 8,
  },
];

/** Mapa da jornada, na ordem em que as etapas são liberadas. */
export const IQ_ISLANDS: readonly [IqIsland, ...IqIsland[]] = [
  {
    id: 'padroes',
    name: 'Ilha dos Padrões e Lógica',
    emoji: '🧩',
    color: 'purple',
    description: 'Descubra o que vem depois.',
    kind: 'desafios',
    types: ['padrao'],
    skill: 'logica',
  },
  {
    id: 'numeros',
    name: 'Ilha do Raciocínio Numérico',
    emoji: '🔢',
    color: 'blue',
    description: 'Sequências e contagens.',
    kind: 'desafios',
    types: ['sequencia'],
    skill: 'numeros',
  },
  {
    id: 'visual',
    name: 'Ilha do Raciocínio Visual',
    emoji: '🔷',
    color: 'mint',
    description: 'Formas, diferenças e giros.',
    kind: 'desafios',
    types: ['diferente', 'rotacao'],
    skill: 'visual',
  },
  {
    id: 'memoria',
    name: 'Ilha da Memória',
    emoji: '🎴',
    color: 'pink',
    description: 'Guarde na cabeça e responda.',
    kind: 'desafios',
    types: ['memoria'],
    skill: 'memoria',
  },
  {
    id: 'atencao',
    name: 'Ilha da Atenção',
    emoji: '🔎',
    color: 'yellow',
    description: 'Ache o que está escondido.',
    kind: 'desafios',
    types: ['atencao'],
    skill: 'atencao',
  },
  {
    id: 'palavras',
    name: 'Ilha das Palavras e Significados',
    emoji: '💬',
    color: 'orange',
    description: 'Grupos, ideias e comparações.',
    kind: 'desafios',
    types: ['linguagem'],
    skill: 'linguagem',
  },
  {
    id: 'castelo',
    name: 'Castelo do Desafio Final',
    emoji: '🏰',
    color: 'purple',
    description: 'Um pouquinho de cada habilidade.',
    kind: 'desafios',
    types: ['padrao', 'sequencia', 'rotacao', 'memoria', 'atencao', 'linguagem'],
    skill: null,
  },
  {
    id: 'bau',
    name: 'Baú de recompensa',
    emoji: '🎁',
    color: 'yellow',
    description: 'O prêmio de quem chegou até o fim.',
    kind: 'recompensa',
    types: [],
    skill: null,
  },
];

export const IQ_SKILL_LABELS: Readonly<Record<IqSkill, string>> = {
  logica: 'Lógica',
  numeros: 'Números',
  visual: 'Raciocínio visual',
  memoria: 'Memória',
  atencao: 'Atenção',
  linguagem: 'Linguagem',
};

/** Nome completo da habilidade no relatório dos responsáveis. */
export const IQ_SKILL_FULL_LABELS: Readonly<Record<IqSkill, string>> = {
  logica: 'Raciocínio lógico',
  numeros: 'Raciocínio numérico',
  visual: 'Raciocínio visual',
  memoria: 'Memória',
  atencao: 'Atenção',
  linguagem: 'Linguagem',
};

/** Como cada habilidade é comemorada na tela da criança. */
export const IQ_SUPER_POWER_LABELS: Readonly<Record<IqSkill, string>> = {
  logica: 'Detetive de padrões',
  numeros: 'Mago dos números',
  visual: 'Olhar de artista',
  memoria: 'Memória de elefante',
  atencao: 'Olhos de águia',
  linguagem: 'Mestre das palavras',
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

/** Conquistas de longo prazo; somam entre uma jornada e outra. */
export const IQ_ACHIEVEMENTS: readonly IqAchievement[] = [
  {
    id: 'mestre-padroes',
    title: 'Mestre dos Padrões',
    description: 'Acertar 10 desafios de lógica.',
    emoji: '🧩',
  },
  {
    id: 'super-memoria',
    title: 'Super Memória',
    description: 'Concluir a Ilha da Memória sem errar nenhuma.',
    emoji: '🧠',
  },
  {
    id: 'olhos-aguia',
    title: 'Olhos de Águia',
    description: 'Concluir a Ilha da Atenção.',
    emoji: '🦅',
  },
  {
    id: 'mente-em-chamas',
    title: 'Mente em Chamas',
    description: 'Acertar 5 desafios seguidos.',
    emoji: '🔥',
  },
  {
    id: 'grande-explorador',
    title: 'Grande Explorador',
    description: 'Visitar e concluir todas as ilhas.',
    emoji: '🗺️',
  },
  {
    id: 'mestre-da-mente',
    title: 'Mestre da Mente',
    description: 'Terminar a jornada inteira.',
    emoji: '👑',
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

export const IQ_LEVEL_UP_MESSAGE = 'Você está indo muito bem. Novo desafio desbloqueado!';

/** Ponto de partida de quem ainda não jogou nenhuma jornada. */
export const IQ_EMPTY_LIFETIME_STATS: IqLifetimeStats = {
  totalXp: 0,
  bestStreak: 0,
  correctBySkill: {
    logica: 0,
    numeros: 0,
    visual: 0,
    memoria: 0,
    atencao: 0,
    linguagem: 0,
  },
  clearedIslandIds: [],
  perfectMemoryRuns: 0,
  attentionRuns: 0,
  journeysCompleted: 0,
};

/** Aviso obrigatório na área de responsáveis. */
export const IQ_GUARDIAN_DISCLAIMER =
  'Esta atividade possui finalidade educativa e de acompanhamento de desempenho. ' +
  'Não substitui avaliação psicológica ou neuropsicológica realizada por profissional habilitado.';
