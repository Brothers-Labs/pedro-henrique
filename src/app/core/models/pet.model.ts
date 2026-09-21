import type { ThemeColor } from './profile.model';

/**
 * Modelos do mascote.
 *
 * O mascote é um companheiro, não um bichinho virtual punitivo: ele só sobe.
 * Não existe fome, não existe abandono e ficar dias sem entrar não tira nada
 * do que já foi conquistado — por isso nenhum campo aqui decai com o tempo.
 */

export type PetTypeId = 'dragao' | 'robo' | 'dino' | 'cachorro';

export type PetStageId = 'bebe' | 'jovem' | 'adulto' | 'lendario';

export type PetAccessoryId =
  | 'bone'
  | 'oculos'
  | 'gravata'
  | 'fone'
  | 'capa'
  | 'medalha'
  | 'coroa';

export type PetAchievementId =
  | 'primeiro-passo'
  | 'em-chamas'
  | 'supercerebro'
  | 'estudioso'
  | 'melhor-amigo'
  | 'evolucao'
  | 'lendario';

export type PetInteractionId = 'lanche' | 'brincar' | 'carinho' | 'conversar' | 'descansar';

/** De onde veio cada XP. Fica registrado para a origem nunca virar mistério. */
export type PetXpSource =
  | 'boas-vindas'
  | 'atividade'
  | 'acerto'
  | 'dez-atividades'
  | 'nivel-de-jogo'
  | 'meta-diaria'
  | 'conquista';

/** Fala do mascote conforme a personalidade do tipo escolhido. */
export interface PetVoice {
  readonly greeting: string;
  readonly cheer: string;
  readonly comfort: string;
}

/** Ficha de um tipo de mascote. Tudo o que o catálogo sabe sobre ele. */
export interface PetType {
  readonly id: PetTypeId;
  readonly label: string;
  readonly emoji: string;
  readonly color: ThemeColor;
  readonly description: string;
  readonly personality: string;
  readonly voice: PetVoice;
  /** Como o corpo muda em cada estágio, para a criança saber o que vem. */
  readonly stageLooks: Readonly<Record<PetStageId, string>>;
}

/** Estágio de evolução. A faixa de níveis vive só aqui. */
export interface PetStage {
  readonly id: PetStageId;
  readonly label: string;
  readonly emoji: string;
  readonly minLevel: number;
  readonly description: string;
}

/** Posição do acessório sobre o mascote, em porcentagem da caixa do avatar. */
export interface PetAccessoryAnchor {
  readonly x: number;
  readonly y: number;
  /** Tamanho relativo à largura do avatar. */
  readonly scale: number;
  readonly rotation: number;
}

export interface PetAccessory {
  readonly id: PetAccessoryId;
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
  readonly unlockLevel: number;
  readonly anchor: PetAccessoryAnchor;
}

/** Contador que uma conquista observa. Evita um `if` por conquista. */
export type PetAchievementMeasure =
  | 'level'
  | 'bestStreak'
  | 'activities'
  | 'activeDays'
  | 'interactions'
  | 'evolutions'
  | 'isLegendary';

export interface PetAchievement {
  readonly id: PetAchievementId;
  readonly title: string;
  readonly description: string;
  readonly emoji: string;
  readonly measure: PetAchievementMeasure;
  /** Valor do contador que completa a conquista. */
  readonly goal: number;
}

export interface PetInteraction {
  readonly id: PetInteractionId;
  readonly label: string;
  readonly emoji: string;
  /** Variação da felicidade; sempre dentro dos limites de 0 a 100. */
  readonly happiness: number;
  readonly energy: number;
  /** Mensagem com o marcador `{nome}` no lugar do nome do mascote. */
  readonly message: string;
}

export type PetEventType = 'adocao' | 'nivel' | 'evolucao' | 'conquista' | 'acessorio';

/** Marco da linha do tempo. Só entram aqui momentos que valem ser lembrados. */
export interface PetEvent {
  readonly id: string;
  readonly type: PetEventType;
  readonly emoji: string;
  readonly description: string;
  /** Data ISO completa; a tela formata conforme o espaço que tem. */
  readonly createdAt: string;
}

/** Conquista já obtida, com a data em que aconteceu. */
export interface PetAchievementRecord {
  readonly id: PetAchievementId;
  readonly completedAt: string;
}

/** Contadores que alimentam as conquistas e a meta diária. */
export interface PetCounters {
  readonly activities: number;
  readonly bestStreak: number;
  readonly interactions: number;
  readonly evolutions: number;
  /** Dias distintos (`yyyy-MM-dd`) com alguma atividade, dos mais recentes. */
  readonly activeDays: readonly string[];
}

/**
 * O mascote guardado no aparelho.
 *
 * O estágio não é um campo: ele vem sempre do nível, para que não exista a
 * possibilidade de um save dizer "lendário" com nível 3.
 */
export interface Pet {
  readonly type: PetTypeId;
  readonly name: string;
  /** Começa em 1 e só sobe. */
  readonly level: number;
  /** XP acumulado dentro do nível atual. */
  readonly xp: number;
  readonly totalXp: number;
  /** 0 a 100. */
  readonly happiness: number;
  /** 0 a 100. */
  readonly energy: number;
  readonly equippedAccessory: PetAccessoryId | null;
  readonly unlockedAccessories: readonly PetAccessoryId[];
  readonly achievements: readonly PetAchievementRecord[];
  readonly counters: PetCounters;
  readonly timeline: readonly PetEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Coleção guardada no aparelho.
 *
 * Já nasce como mapa de vários mascotes, ainda que hoje só um seja adotado:
 * é o que permite desbloquear novos companheiros no futuro sem migração.
 */
export interface PetCollection {
  readonly version: number;
  readonly activeType: PetTypeId | null;
  readonly pets: Readonly<Partial<Record<PetTypeId, Pet>>>;
}

/**
 * Momento digno de comemoração, pronto para a tela consumir.
 *
 * É união discriminada porque cada tipo pede uma celebração diferente: nível e
 * conquista viram aviso, evolução vira o modal grande.
 */
export type PetCelebration =
  | {
      readonly kind: 'nivel';
      readonly level: number;
      readonly accessory: PetAccessory | null;
    }
  | {
      readonly kind: 'evolucao';
      readonly from: PetStage;
      readonly to: PetStage;
      readonly level: number;
      readonly accessory: PetAccessory | null;
    }
  | { readonly kind: 'conquista'; readonly achievement: PetAchievement };

/**
 * Parcela de XP com a origem declarada.
 *
 * Um único desafio pode render várias delas ao mesmo tempo — o desafio em si,
 * o acerto, o bônus de dez e a primeira atividade do dia. Elas viajam juntas
 * para que o nível suba uma vez só, e não uma vez por parcela.
 */
export interface PetXpGrant {
  readonly source: PetXpSource;
  readonly amount: number;
}

/** Resultado de qualquer mudança no mascote, já pronto para a tela reagir. */
export interface PetOutcome {
  readonly pet: Pet;
  readonly gainedXp: number;
  readonly grants: readonly PetXpGrant[];
  readonly celebrations: readonly PetCelebration[];
}

/** Situação de um acessório para a criança. */
export type PetAccessoryState = 'equipado' | 'disponivel' | 'bloqueado';

/** Progresso de uma conquista, pronto para a barra e o texto. */
export interface PetAchievementProgress {
  readonly achievement: PetAchievement;
  readonly current: number;
  readonly goal: number;
  readonly percentage: number;
  readonly isCompleted: boolean;
  readonly completedAt: string | null;
}

/** Quanto falta para a próxima evolução, para o cartão de prévia. */
export interface PetEvolutionPreview {
  readonly current: PetStage;
  readonly next: PetStage;
  readonly level: number;
  readonly levelsRemaining: number;
  readonly percentage: number;
}
