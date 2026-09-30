import type {
  PetAccessory,
  PetAccessoryId,
  PetAchievement,
  PetInteraction,
  PetInteractionId,
  PetStage,
  PetStageId,
  PetType,
  PetTypeId,
  PetXpSource,
} from '../models/pet.model';

/**
 * Catálogo e regras numéricas do mascote.
 *
 * Tudo o que dá XP, desbloqueia, evolui ou muda de humor está declarado aqui.
 * Nenhum componente inventa o próprio "+10": equilibrar o mascote é mexer
 * neste arquivo, e só nele.
 */

export const PET_CONFIG = {
  /** XP do primeiro nível. */
  baseLevelXp: 100,
  /** Quanto cada nível pede a mais que o anterior. */
  levelXpStep: 150,
  /**
   * Teto do custo de um nível.
   *
   * Sem teto, o nível 30 pediria milhares de XP e a evolução viraria uma
   * escada que nunca acaba. Com teto, subir continua possível para sempre.
   */
  maxLevelXp: 1600,

  /** Felicidade e energia de um mascote recém-adotado. */
  initialHappiness: 80,
  initialEnergy: 80,
  minMood: 0,
  maxMood: 100,

  /** Quantas atividades fecham o bônus de "dez exercícios". */
  activitiesPerBonus: 10,

  /** Tamanho máximo da linha do tempo guardada. */
  maxTimelineEvents: 40,
  /** Dias ativos guardados; o suficiente para as conquistas de frequência. */
  maxActiveDays: 30,

  /** Limite de caracteres do nome que a criança escolhe. */
  maxNameLength: 16,
} as const;

/** Quanto vale cada coisa que a criança faz. */
export const PET_XP: Readonly<Record<PetXpSource, number>> = {
  'boas-vindas': 0,
  atividade: 10,
  acerto: 2,
  'dez-atividades': 30,
  'nivel-de-jogo': 50,
  'meta-diaria': 40,
  conquista: 100,
};

/**
 * Estágios de evolução.
 *
 * A faixa de níveis mora só aqui: mudar quando o mascote vira adulto é mudar
 * um número nesta lista, sem procurar condição espalhada por tela nenhuma.
 */
export const PET_EVOLUTION_STAGES: readonly PetStage[] = [
  {
    id: 'bebe',
    label: 'Bebê',
    emoji: '🐣',
    minLevel: 1,
    description: 'Acabou de chegar e quer aprender tudo com você.',
  },
  {
    id: 'jovem',
    label: 'Jovem',
    emoji: '🐉',
    minLevel: 6,
    description: 'Cresceu, ganhou coragem e já encara desafios maiores.',
  },
  {
    id: 'adulto',
    label: 'Adulto',
    emoji: '🐲',
    minLevel: 16,
    description: 'Forte, esperto e pronto para qualquer aventura.',
  },
  {
    id: 'lendario',
    label: 'Lendário',
    emoji: '✨',
    minLevel: 31,
    description: 'Brilha de tanto aprender. Poucos chegam até aqui!',
  },
];

/**
 * Tipos de mascote.
 *
 * A personalidade fica na ficha, e não em `if` espalhado: quem fala com a
 * criança durante os jogos apenas lê a `voice` do tipo escolhido.
 */
export const PET_TYPES: readonly PetType[] = [
  {
    id: 'dragao',
    label: 'Dragão',
    emoji: '🐉',
    color: 'pink',
    description: 'Corajoso e curioso. Adora novos desafios.',
    personality: 'Corajoso e aventureiro',
    voice: {
      greeting: 'Vamos encarar um desafio hoje?',
      cheer: 'Que coragem! Isso foi incrível!',
      comfort: 'Dragão nenhum acerta de primeira. Bora de novo!',
    },
    stageLooks: {
      bebe: 'Filhote fofo, de crista pequena e ainda sem asas.',
      jovem: 'Ganhou asas pequenas e dois chifres.',
      adulto: 'Dragão completo, de asas grandes.',
      lendario: 'Dragão mágico, cercado de brilho.',
    },
  },
  {
    id: 'robo',
    label: 'Robô',
    emoji: '🤖',
    color: 'blue',
    description: 'Inteligente e divertido. Adora descobrir coisas.',
    personality: 'Curioso e inteligente',
    voice: {
      greeting: 'Meus circuitos querem aprender algo novo!',
      cheer: 'Cálculo perfeito! Guardei aqui na memória.',
      comfort: 'Erro anotado. Vamos recalcular juntos!',
    },
    stageLooks: {
      bebe: 'Robozinho pequeno, de uma antena só.',
      jovem: 'Estrutura maior, com braços de verdade.',
      adulto: 'Robô avançado, com painel no peito.',
      lendario: 'Robô futurista, flutuando com energia.',
    },
  },
  {
    id: 'dino',
    label: 'Dinossauro',
    emoji: '🦖',
    color: 'mint',
    description: 'Forte e aventureiro. Nunca desiste.',
    personality: 'Divertido e determinado',
    voice: {
      greeting: 'Rawr! Hoje a gente descobre coisa nova.',
      cheer: 'Rawr! Você é fortíssimo nisso!',
      comfort: 'Dinossauro nunca desiste. Tenta mais uma!',
    },
    stageLooks: {
      bebe: 'Filhote redondinho, de rabo curto.',
      jovem: 'Jovem aventureiro, com bracinhos e dentinhos.',
      adulto: 'Dinossauro forte, com placas nas costas.',
      lendario: 'Versão épica, com espinhos brilhantes.',
    },
  },
  {
    id: 'cachorro',
    label: 'Cachorro',
    emoji: '🐶',
    color: 'orange',
    description: 'Amigo e animado. Está sempre ao seu lado.',
    personality: 'Carinhoso e animado',
    voice: {
      greeting: 'Au au! Que bom que você voltou!',
      cheer: 'Au au! Eu sabia que você conseguia!',
      comfort: 'Tudo bem! Eu fico aqui com você. Vamos de novo?',
    },
    stageLooks: {
      bebe: 'Filhote de orelhas caídas.',
      jovem: 'Cachorro jovem, de rabo em pé.',
      adulto: 'Companheiro aventureiro, com coleira.',
      lendario: 'Versão heroica, com brilho de herói.',
    },
  },
];

/**
 * Acessórios.
 *
 * O nível de desbloqueio é a única regra: nada aqui se compra, e nenhum deles
 * muda o desempenho — são enfeite, e enfeite existe para ser escolhido.
 */
export const PET_ACCESSORIES: readonly PetAccessory[] = [
  {
    id: 'bone',
    label: 'Boné',
    emoji: '🧢',
    description: 'Para o sol das aventuras.',
    unlockLevel: 3,
    anchor: { x: 50, y: 13, scale: 0.36, rotation: -8 },
  },
  {
    id: 'oculos',
    label: 'Óculos',
    emoji: '👓',
    description: 'Para enxergar cada detalhe.',
    unlockLevel: 5,
    anchor: { x: 50, y: 33, scale: 0.34, rotation: 0 },
  },
  {
    id: 'gravata',
    label: 'Gravata',
    emoji: '🎀',
    description: 'Para os dias de festa.',
    unlockLevel: 8,
    anchor: { x: 50, y: 62, scale: 0.24, rotation: 0 },
  },
  {
    id: 'fone',
    label: 'Fone',
    emoji: '🎧',
    description: 'Música enquanto a gente estuda.',
    unlockLevel: 10,
    anchor: { x: 50, y: 24, scale: 0.44, rotation: 0 },
  },
  {
    id: 'capa',
    label: 'Capa',
    emoji: '🦸',
    description: 'Capa de herói de verdade.',
    unlockLevel: 15,
    anchor: { x: 21, y: 60, scale: 0.32, rotation: -12 },
  },
  {
    id: 'medalha',
    label: 'Medalha',
    emoji: '⭐',
    description: 'A medalha de quem não desiste.',
    unlockLevel: 20,
    anchor: { x: 50, y: 57, scale: 0.22, rotation: 0 },
  },
  {
    id: 'coroa',
    label: 'Coroa',
    emoji: '👑',
    description: 'A coroa dos lendários.',
    unlockLevel: 25,
    anchor: { x: 50, y: 6, scale: 0.34, rotation: 0 },
  },
];

/**
 * Conquistas do mascote.
 *
 * Cada uma observa um contador só. É o que permite mostrar progresso parcial
 * ("14 de 20") sem escrever uma regra de tela por conquista.
 */
export const PET_ACHIEVEMENTS: readonly PetAchievement[] = [
  {
    id: 'primeiro-passo',
    title: 'Primeiro passo',
    description: 'Chegue ao nível 2 com o seu mascote.',
    emoji: '🌱',
    measure: 'level',
    goal: 2,
  },
  {
    id: 'em-chamas',
    title: 'Em chamas',
    description: 'Acerte 10 desafios seguidos.',
    emoji: '🔥',
    measure: 'bestStreak',
    goal: 10,
  },
  {
    id: 'supercerebro',
    title: 'Supercérebro',
    description: 'Complete 100 atividades.',
    emoji: '🧠',
    measure: 'activities',
    goal: 100,
  },
  {
    id: 'estudioso',
    title: 'Estudioso',
    description: 'Jogue em 5 dias diferentes.',
    emoji: '📚',
    measure: 'activeDays',
    goal: 5,
  },
  {
    id: 'melhor-amigo',
    title: 'Melhor amigo',
    description: 'Brinque 20 vezes com o seu mascote.',
    emoji: '🐣',
    measure: 'interactions',
    goal: 20,
  },
  {
    id: 'evolucao',
    title: 'Evolução!',
    description: 'Faça o seu mascote evoluir pela primeira vez.',
    emoji: '🐉',
    measure: 'evolutions',
    goal: 1,
  },
  {
    id: 'lendario',
    title: 'Lendário',
    description: 'Chegue ao estágio Lendário.',
    emoji: '⭐',
    measure: 'isLegendary',
    goal: 1,
  },
];

/**
 * Brincadeiras.
 *
 * Nenhuma tira felicidade, e nenhuma é obrigatória: quem não brincar hoje não
 * perde nada amanhã. Brincar existe para ser gostoso, não para ser dever.
 */
export const PET_INTERACTIONS: readonly PetInteraction[] = [
  {
    id: 'lanche',
    label: 'Dar lanche',
    emoji: '🍎',
    happiness: 6,
    energy: 14,
    message: '{nome} adorou o lanche!',
  },
  {
    id: 'brincar',
    label: 'Brincar',
    emoji: '⚽',
    happiness: 14,
    energy: -6,
    message: '{nome} está super feliz!',
  },
  {
    id: 'carinho',
    label: 'Fazer carinho',
    emoji: '🤗',
    happiness: 12,
    energy: 2,
    message: '{nome} adorou o carinho!',
  },
  {
    id: 'conversar',
    label: 'Conversar',
    emoji: '💬',
    happiness: 8,
    energy: 0,
    message: '{nome} ouviu tudo com atenção!',
  },
  {
    id: 'descansar',
    label: 'Descansar',
    emoji: '😴',
    happiness: 4,
    energy: 20,
    message: '{nome} tirou um cochilo e recarregou a energia!',
  },
];

/** Comemorações do mascote durante os jogos. */
export const PET_CORRECT_MESSAGES: readonly string[] = [
  'Isso! Você conseguiu! 🎉',
  'Mandou muito bem!',
  'Sabia que você conseguia!',
  'Boa, {crianca}!',
];

/** Incentivos do erro: convidam a tentar de novo, nunca apontam fracasso. */
export const PET_WRONG_MESSAGES: readonly string[] = [
  'Quase! Vamos tentar outra vez? 💪',
  'Você está aprendendo!',
  'Não tem problema. Tenta mais uma!',
];

/** Fala reservada às sequências longas de acerto. */
export const PET_STREAK_MESSAGES: readonly string[] = [
  'Uau! Você está voando! 🚀',
  'Que sequência! Não para agora!',
];

const TYPES_BY_ID = new Map(PET_TYPES.map((type) => [type.id, type]));
const STAGES_BY_ID = new Map(PET_EVOLUTION_STAGES.map((stage) => [stage.id, stage]));
const ACCESSORIES_BY_ID = new Map(PET_ACCESSORIES.map((accessory) => [accessory.id, accessory]));
const INTERACTIONS_BY_ID = new Map(
  PET_INTERACTIONS.map((interaction) => [interaction.id, interaction]),
);

export const PET_TYPE_IDS: readonly PetTypeId[] = PET_TYPES.map((type) => type.id);

/** Ficha do tipo. Falha alto: um id fora do catálogo é erro de programação. */
export function petType(id: PetTypeId): PetType {
  const type = TYPES_BY_ID.get(id);

  if (!type) {
    throw new Error(`Mascote "${id}" não existe no catálogo.`);
  }

  return type;
}

export function petStage(id: PetStageId): PetStage {
  const stage = STAGES_BY_ID.get(id);

  if (!stage) {
    throw new Error(`Estágio "${id}" não existe no catálogo.`);
  }

  return stage;
}

export function petAccessory(id: PetAccessoryId): PetAccessory {
  const accessory = ACCESSORIES_BY_ID.get(id);

  if (!accessory) {
    throw new Error(`Acessório "${id}" não existe no catálogo.`);
  }

  return accessory;
}

export function petInteraction(id: PetInteractionId): PetInteraction {
  const interaction = INTERACTIONS_BY_ID.get(id);

  if (!interaction) {
    throw new Error(`Brincadeira "${id}" não existe no catálogo.`);
  }

  return interaction;
}

/** Troca `{nome}` pelo nome do mascote e `{crianca}` pelo nome de quem joga. */
export function fillNames(template: string, petName: string, childName: string): string {
  return template.replaceAll('{nome}', petName).replaceAll('{crianca}', childName);
}
