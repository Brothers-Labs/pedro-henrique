/**
 * Modelos de fase do Pedro Maker.
 *
 * Campanha, editor e gerador de fase surpresa falam a mesma língua: uma fase é
 * uma grade com uma lista de objetos. É isso que permite testar no motor
 * exatamente a fase que o Pedro montou no editor, sem conversão nenhuma.
 *
 * As coordenadas são sempre em células da grade (coluna e linha), com a linha
 * zero no topo. Quem converte para pixels é o motor.
 */

export type LevelTheme =
  | 'vale'
  | 'floresta'
  | 'caverna'
  | 'deserto'
  | 'gelo'
  | 'vulcao'
  | 'estrelas'
  | 'castelo'
  | 'praia'
  | 'classico';

/**
 * A tartaruga anda devagar e pode ser pisada; a planta carnívora mora num
 * cano, sobe e desce, e só cai com fogo ou estrela. O pinguim patrulha
 * ligeiro; a bolinha de lava salta da lava e não se apaga com fogo. A abelha
 * voa de um lado para o outro e pode ser pisada.
 */
export type EnemyKind =
  | 'slime'
  | 'spiky'
  | 'bat'
  | 'robot'
  | 'ghost'
  | 'turtle'
  | 'piranha'
  | 'penguin'
  | 'lava-bubble'
  | 'bee';

/**
 * Poderes que o Pedro pode pegar.
 *
 * Os quatro últimos são os clássicos dos jogos de plataforma: cogumelo que faz
 * crescer, flor de fogo, estrela da invencibilidade e cogumelo de vida.
 */
export const POWER_UP_KINDS = [
  'super-jump',
  'shield',
  'turbo',
  'magnet',
  'wings',
  'mushroom',
  'fire-flower',
  'star',
  'one-up',
] as const;

export type PowerUpKind = (typeof POWER_UP_KINDS)[number];

/** Os poderes clássicos, que o Lucky Block sorteia. */
export const CLASSIC_POWER_UPS = ['mushroom', 'fire-flower', 'star', 'one-up'] as const satisfies readonly PowerUpKind[];

/**
 * `lucky`: o Lucky Block, que sorteia um poder clássico na hora da cabeçada.
 * `multi-coins`: o bloco de moedas, com cara de tijolo, que solta uma moeda a
 * cada cabeçada até esvaziar.
 */
export const SURPRISE_CONTENTS = ['coins', 'heart', 'crystal', 'power-up', 'lucky', 'multi-coins'] as const;

export type SurpriseContent = (typeof SURPRISE_CONTENTS)[number];

export type PlatformAxis = 'horizontal' | 'vertical';

/**
 * Terreno sólido, montado bloco a bloco como num mundo de cubos.
 *
 * O cano é terreno também: bloqueia por todos os lados e, empilhado, vira o
 * cano verde clássico — a boca aparece sozinha no bloco de cima.
 */
export type TerrainType = 'ground' | 'stone' | 'ice' | 'sand' | 'wood' | 'pipe';

/**
 * A nuvem é uma plataforma de mão única: segura quem cai de cima. A água não
 * segura ninguém: quem entra nela nada. Os espinhos seguram, mas machucam
 * quem encosta. O bloco musical é sólido e faz quicar quem pisa nele.
 */
export type BlockType =
  | 'brick'
  | 'surprise'
  | 'spring'
  | 'crumble'
  | 'platform'
  | 'cloud'
  | 'lava'
  | 'water'
  | 'spikes'
  | 'note';

/** A moeda gigante vale várias moedas de uma vez. */
export type ItemType = 'coin' | 'big-coin' | 'crystal' | 'heart' | 'power-up';

export type MarkerType = 'start' | 'checkpoint' | 'portal' | 'door' | 'secret-door';

export type DecorType =
  | 'tree'
  | 'bush'
  | 'flower'
  | 'rock'
  | 'sign'
  | 'fence'
  | 'snowman'
  | 'toadstool'
  | 'barrel'
  | 'lamp'
  | 'grass'
  | 'arrow'
  | 'crate';

/** Gatilhos invisíveis: dicas do tutorial e falas do mascote. */
export type TriggerType = 'hint' | 'mascot-tip';

export type LevelObjectType =
  | TerrainType
  | BlockType
  | 'moving-platform'
  | EnemyKind
  | 'boss'
  | ItemType
  | MarkerType
  | DecorType
  | TriggerType;

/**
 * Propriedades opcionais de um objeto.
 *
 * Tipadas campo a campo, e não como dicionário solto, para que um erro de
 * digitação numa fase escrita à mão apareça na compilação e não no jogo.
 */
export interface LevelObjectProperties {
  readonly contents?: SurpriseContent;
  readonly powerUp?: PowerUpKind;
  readonly axis?: PlatformAxis;
  /** Distância percorrida pela plataforma móvel, em células. */
  readonly range?: number;
  /** Texto de placa, dica ou fala do mascote. */
  readonly text?: string;
  /** Versão da dica para quem joga no toque, com os botões da tela. */
  readonly touchText?: string;
  /** Portas com o mesmo par se ligam uma à outra. */
  readonly pair?: string;
}

export interface LevelObject {
  readonly id: string;
  readonly type: LevelObjectType;
  readonly x: number;
  readonly y: number;
  readonly properties?: LevelObjectProperties;
}

/** Molde do desenho do chefão: cada mundo tem o seu. */
export type BossLook = 'slime' | 'cactus' | 'ice' | 'magma' | 'comet';

/** Chefão da fase final de cada mundo. */
export interface BossDefinition {
  readonly name: string;
  readonly emoji: string;
  /** Cor principal do corpo, em hexadecimal. */
  readonly color: string;
  readonly accent: string;
  readonly hitPoints: number;
  /** Multiplica velocidade de investida e altura do pulo. */
  readonly fury: number;
  readonly minion: EnemyKind;
  readonly look: BossLook;
}

/** Tudo o que o motor precisa para montar uma fase. */
export interface LevelBlueprint {
  readonly id: string;
  readonly name: string;
  readonly theme: LevelTheme;
  readonly width: number;
  readonly height: number;
  readonly objects: readonly LevelObject[];
  /** Tempo de referência da conquista "Velocista". */
  readonly targetTimeSeconds: number;
  readonly boss?: BossDefinition;
}

/** Fase criada pelo Pedro no editor, guardada no aparelho. */
export interface CustomLevel {
  readonly id: string;
  readonly name: string;
  readonly theme: LevelTheme;
  /** Datas ISO completas, como no restante do site. */
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly width: number;
  readonly height: number;
  readonly objects: readonly LevelObject[];
  /** Verdadeiro depois que a fase foi terminada pelo menos uma vez. */
  readonly completed: boolean;
  readonly bestStars: number;
}
