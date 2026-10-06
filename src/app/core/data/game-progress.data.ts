import type {
  Achievement,
  AchievementId,
  GameDefinition,
  GameId,
} from '../models/game-progress.model';

/**
 * Regras numéricas e catálogo da jornada de jogos.
 *
 * Tudo o que vale ponto está aqui. Nenhum componente inventa o próprio "+10":
 * mudar o equilíbrio do jogo é mudar este arquivo, e só ele.
 */

export const GAME_CONFIG = {
  /** Padrão de desafios por nível; um jogo pode pedir outro na própria ficha. */
  challengesPerLevel: 10,

  pointsPerCorrectAnswer: 10,
  pointsPerLevelCompleted: 50,
  /** Bônus extra de quem fechou o nível sem errar nenhuma vez. */
  pointsPerPerfectLevel: 50,

  /** A partir de quantos acertos seguidos a sequência começa a valer bônus. */
  streakBonusThreshold: 3,
  /** Bônus por acerto depois do limite, somado uma vez por acerto. */
  pointsPerStreakStep: 5,
  /** Teto do bônus de sequência, para a pontuação não disparar. */
  maxStreakBonus: 20,

  /**
   * Proporção de acertos do nível para ganhar cada estrela.
   *
   * São proporções, e não quantidades, porque nem todo jogo fecha o nível com
   * dez desafios: `0.7` vale 7 de 10 tanto quanto vale 7 de 10 em qualquer
   * outro tamanho de nível.
   */
  starThresholds: [0.7, 0.9, 1],

  /** Pontos que separam um nível geral do seguinte. */
  pointsPerOverallLevel: 500,
} as const;

/**
 * Catálogo dos jogos.
 *
 * A ordem é a da trilha de abas da página. `challengesPerLevel` só se afasta do
 * padrão onde o jogo é longo demais para dez rodadas seguidas.
 */
export const GAME_CATALOG: readonly GameDefinition[] = [
  {
    id: 'matematica',
    label: 'Matemática',
    emoji: '➕',
    color: 'blue',
    tagline: 'Contas que crescem com você.',
    unit: 'conta',
    challengesPerLevel: GAME_CONFIG.challengesPerLevel,
    tracksAccuracy: true,
  },
  {
    id: 'ingles',
    label: 'Inglês',
    emoji: '🔤',
    color: 'purple',
    tagline: 'Palavras e frases, uma de cada vez.',
    unit: 'desafio',
    challengesPerLevel: GAME_CONFIG.challengesPerLevel,
    tracksAccuracy: true,
  },
  {
    id: 'quiz',
    label: 'Quiz',
    emoji: '❓',
    color: 'yellow',
    tagline: 'Perguntas sobre mim e sobre o mundo.',
    unit: 'pergunta',
    challengesPerLevel: GAME_CONFIG.challengesPerLevel,
    tracksAccuracy: true,
  },
  {
    id: 'qi',
    label: 'Desafio de raciocínio',
    emoji: '🧠',
    color: 'pink',
    tagline: 'Padrões, lógica, atenção e formas.',
    unit: 'desafio',
    challengesPerLevel: GAME_CONFIG.challengesPerLevel,
    tracksAccuracy: true,
  },
  {
    id: 'memoria',
    label: 'Memória',
    emoji: '🧩',
    color: 'mint',
    tagline: 'Encontre os pares antes que eles sumam.',
    unit: 'rodada',
    challengesPerLevel: GAME_CONFIG.challengesPerLevel,
    tracksAccuracy: true,
  },
  {
    id: 'velha',
    label: 'Jogo da velha',
    emoji: '❌',
    color: 'orange',
    tagline: 'Um adversário que fica mais esperto a cada nível.',
    unit: 'partida',
    challengesPerLevel: GAME_CONFIG.challengesPerLevel,
    tracksAccuracy: false,
  },
  {
    id: 'feijoes',
    label: 'Trilha dos feijões',
    emoji: '🫘',
    color: 'mint',
    /** Uma partida inteira leva minutos: dez seguidas viraria maratona. */
    tagline: 'Forme trilhas de três e capture os feijões do rival.',
    unit: 'partida',
    challengesPerLevel: 3,
    tracksAccuracy: false,
  },
  {
    id: 'pedro-maker',
    label: 'Pedro Maker',
    emoji: '🗺️',
    color: 'blue',
    /** Cada fase vencida no Pedro Maker conta como um desafio da jornada. */
    tagline: 'A grande aventura de plataforma: corra, pule e crie fases.',
    unit: 'fase',
    challengesPerLevel: 3,
    tracksAccuracy: false,
  },
  {
    id: 'pedro-kart',
    label: 'Pedro Kart',
    emoji: '🏎️',
    color: 'orange',
    /** Cada corrida terminada conta como um desafio; chegar no pódio conta como acerto. */
    tagline: 'Corridas de kart com o Pedro Maker e pistas que você mesmo cria.',
    unit: 'corrida',
    challengesPerLevel: 3,
    tracksAccuracy: false,
  },
];

const CATALOG_BY_ID = new Map(GAME_CATALOG.map((game) => [game.id, game]));

export const GAME_IDS: readonly GameId[] = GAME_CATALOG.map((game) => game.id);

/** Ficha do jogo. Falha alto: um id fora do catálogo é erro de programação. */
export function gameDefinition(gameId: GameId): GameDefinition {
  const definition = CATALOG_BY_ID.get(gameId);

  if (!definition) {
    throw new Error(`Jogo "${gameId}" não existe no catálogo.`);
  }

  return definition;
}

/**
 * Conquistas.
 *
 * Poucas e claras de propósito: a criança precisa conseguir entender o que
 * falta para a próxima. A estrutura aceita novas sem tocar em nenhuma tela.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'primeiro-nivel',
    title: 'Primeiro nível',
    description: 'Você concluiu o seu primeiro nível!',
    emoji: '🏆',
  },
  {
    id: 'em-chamas',
    title: 'Em chamas',
    description: 'Cinco acertos seguidos sem errar nenhum.',
    emoji: '🔥',
  },
  {
    id: 'cem-pontos',
    title: 'Cem pontos',
    description: 'Você juntou as suas primeiras 100 estrelas.',
    emoji: '⭐',
  },
  {
    id: 'nivel-perfeito',
    title: 'Nível perfeito',
    description: 'Você fechou um nível sem errar nenhuma vez.',
    emoji: '🎯',
  },
  {
    id: 'explorador-de-jogos',
    title: 'Explorador de jogos',
    description: 'Você subiu de nível em três jogos diferentes.',
    emoji: '🗺️',
  },
  {
    id: 'mil-pontos',
    title: 'Mil pontos',
    description: 'Mil estrelas juntadas em todos os jogos.',
    emoji: '🌟',
  },
  {
    id: 'maratonista',
    title: 'Maratonista',
    description: 'Cinquenta desafios concluídos.',
    emoji: '🚀',
  },
];

const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export function achievementById(id: AchievementId): Achievement {
  const achievement = ACHIEVEMENTS_BY_ID.get(id);

  if (!achievement) {
    throw new Error(`Conquista "${id}" não existe no catálogo.`);
  }

  return achievement;
}

/** Elogios do acerto. A tela sorteia um para não repetir sempre o mesmo. */
export const CORRECT_MESSAGES: readonly string[] = [
  'Muito bem!',
  'Isso mesmo!',
  'Acertou em cheio!',
  'Boa! Continue assim.',
  'Perfeito!',
];

/** Incentivos do erro: convidam a seguir, nunca apontam fracasso. */
export const ENCOURAGEMENT_MESSAGES: readonly string[] = [
  'Quase! Vamos tentar outra?',
  'Boa tentativa! A próxima vem aí.',
  'Tudo bem errar — é assim que a gente aprende.',
  'Faltou pouquinho! Bora continuar.',
];

/** Mensagem final conforme os acertos do nível, do melhor para o mais leve. */
export const LEVEL_FEEDBACK: readonly { readonly minCorrect: number; readonly message: string }[] = [
  { minCorrect: 10, message: 'INCRÍVEL! Você acertou todos os desafios! 🏆' },
  { minCorrect: 8, message: 'MUITO BEM! Seu raciocínio foi excelente! 🌟' },
  { minCorrect: 6, message: 'MUITO BOM! Continue treinando o seu cérebro! 🧠' },
  { minCorrect: 4, message: 'BOA AVENTURA! Cada desafio ajuda você a aprender! 🚀' },
  { minCorrect: 0, message: 'VOCÊ CONSEGUIU TERMINAR! Vamos descobrir coisas novas! 💪' },
];
