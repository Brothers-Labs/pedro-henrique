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
  | 'castelo-rei-slime'
  | 'castelo-rei-cacto'
  | 'praia'
  | 'classico'
  | 'dia-das-bruxas';

/**
 * A tartaruga anda devagar e pode ser pisada; a planta carnívora mora num
 * cano, sobe e desce, e só cai com fogo ou estrela. O pinguim patrulha
 * ligeiro; a bolinha de lava salta da lava e não se apaga com fogo. A abelha
 * voa de um lado para o outro e pode ser pisada.
 *
 * Dos jogos clássicos de encanador vêm o goomba, que anda e cai com um pisão;
 * a bala de canhão, que cruza a fase voando reto e não se apaga com fogo; e o
 * thwomp, o bloco de pedra que despenca quando o herói passa embaixo. O Rei
 * Slime é o slime grandão de coroa: pisado, se divide em dois slimes.
 *
 * Os peixes moram na água: o nadador vai e volta ondulando, e o saltador fica
 * mergulhado e pula para fora num arco alto. Os dois caem com um pisão.
 *
 * Os do Dia das Bruxas: o Rei Cacto, grandão de coroa e espinhos, que não se
 * pisa e solta espinhudos; a abóbora viva, que anda aos pulinhos; e a bruxa
 * de vassoura.
 */
export const ENEMY_KINDS = [
  'slime',
  'spiky',
  'bat',
  'robot',
  'ghost',
  'turtle',
  'piranha',
  'penguin',
  'lava-bubble',
  'bee',
  'goomba',
  'bullet',
  'thwomp',
  'king-slime',
  'iron-ball',
  'fish',
  'jumping-fish',
  'king-cactus',
  'living-pumpkin',
  'witch',
] as const;

export type EnemyKind = (typeof ENEMY_KINDS)[number];

const ENEMY_KIND_SET: ReadonlySet<string> = new Set(ENEMY_KINDS);

export function isEnemyKind(type: string): type is EnemyKind {
  return ENEMY_KIND_SET.has(type);
}

/**
 * Poderes que o Pedro pode pegar.
 *
 * Do cogumelo em diante são os clássicos dos jogos de plataforma: cogumelo que
 * faz crescer, flor de fogo, flor de gelo, estrela da invencibilidade e
 * cogumelo de vida. O Cogumelo Gato, o Cogumelo Folha e a Folha do Guaxinim
 * também fazem crescer: com o gato, o herói escala paredes; com a folha, plana
 * segurando o pulo; com o guaxinim, voa um pouquinho e gira o rabo. O Giga
 * Cogumelo deixa o herói gigante por alguns segundos, e o Cogumelo Turbo, bem
 * mais rápido. O Cogumelo Troca-Personagem age na hora: o herói vira o próximo
 * da turma, com o pulo e o freio dele. O Cogumelo Ímã puxa as moedas de longe,
 * e o Cogumelo Alto estica o herói: cabeça lá em cima, músculo fraco.
 */
export const POWER_UP_KINDS = [
  'super-jump',
  'shield',
  'turbo',
  'magnet',
  'wings',
  'mushroom',
  'fire-flower',
  'ice-flower',
  'star',
  'one-up',
  'cat-mushroom',
  'leaf-mushroom',
  'raccoon-leaf',
  'giga-mushroom',
  'turbo-mushroom',
  'swap-mushroom',
  'magnet-mushroom',
  'tall-mushroom',
] as const;

export type PowerUpKind = (typeof POWER_UP_KINDS)[number];

/** Os poderes clássicos, que o Lucky Block sorteia. */
export const CLASSIC_POWER_UPS = [
  'mushroom',
  'fire-flower',
  'ice-flower',
  'star',
  'one-up',
  'cat-mushroom',
  'leaf-mushroom',
  'raccoon-leaf',
  'giga-mushroom',
  'turbo-mushroom',
] as const satisfies readonly PowerUpKind[];

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
 * cano verde clássico — a boca aparece sozinha no bloco de cima. A montanha
 * do deserto é arenito em listras, com areia por cima: empilhada, vira os
 * paredões vermelhos dos cânions.
 */
export type TerrainType = 'ground' | 'stone' | 'ice' | 'sand' | 'wood' | 'pipe' | 'desert-mountain';

/**
 * A nuvem é uma plataforma de mão única: segura quem cai de cima. A água não
 * segura ninguém: quem entra nela nada. Os espinhos seguram, mas machucam
 * quem encosta. O bloco musical é sólido e faz quicar quem pisa nele. A grama
 * invisível é chão de verdade que não aparece: só se mostra depois que o
 * herói encosta nela. A mola de cabeça pra baixo fica presa no teto: quem
 * bate a cabeça nela é lançado para baixo.
 */
export type BlockType =
  | 'cannon'
  | 'brick'
  | 'surprise'
  | 'spring'
  | 'crumble'
  | 'platform'
  | 'cloud'
  | 'lava'
  | 'water'
  | 'spikes'
  | 'note'
  | 'invisible-grass'
  | 'ceiling-spring';

/**
 * Valores das moedas gigantes numeradas, da menor para a maior.
 *
 * É a fonte única: o tipo de cada moeda, o valor somado, o número estampado e
 * as peças do editor saem desta lista. Moeda nova é só um número a mais aqui.
 * A moeda de 10 (`big-coin`) e a de 50 (`huge-coin`) vieram antes e mantêm o
 * tipo antigo, para as fases já salvas continuarem abrindo.
 */
export const GIANT_COIN_VALUES = [
  5, 25, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000,
  2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000,
  1_000_000_000, 2_500_000_000, 5_000_000_000, 10_000_000_000,
] as const;

export type GiantCoinValue = (typeof GIANT_COIN_VALUES)[number];

export type GiantCoinType = `coin-${GiantCoinValue}`;

export const GIANT_COIN_TYPES: readonly GiantCoinType[] = GIANT_COIN_VALUES.map((value) => giantCoinType(value));

const GIANT_COIN_VALUE_BY_TYPE: ReadonlyMap<string, GiantCoinValue> = new Map(
  GIANT_COIN_VALUES.map((value) => [giantCoinType(value), value]),
);

export function giantCoinType(value: GiantCoinValue): GiantCoinType {
  return `coin-${value}`;
}

export function isGiantCoinType(type: string): type is GiantCoinType {
  return GIANT_COIN_VALUE_BY_TYPE.has(type);
}

export function giantCoinValue(type: GiantCoinType): GiantCoinValue {
  const value = GIANT_COIN_VALUE_BY_TYPE.get(type);

  if (value === undefined) {
    throw new Error(`Moeda gigante desconhecida: ${type}`);
  }

  return value;
}

/**
 * Um registro com uma entrada por moeda gigante, para as tabelas tipadas por
 * objeto (comportamento, cores do minimapa) não repetirem a lista à mão.
 */
export function perGiantCoin<Value>(valueFor: (type: GiantCoinType) => Value): Readonly<Record<GiantCoinType, Value>> {
  // A lista de tipos cobre a união inteira, então o objeto montado tem todas as chaves.
  return Object.fromEntries(GIANT_COIN_TYPES.map((type) => [type, valueFor(type)])) as Record<GiantCoinType, Value>;
}

/**
 * O valor como a criança lê na moeda e no editor: de 10 mil para cima vira
 * "10k", de um milhão para cima, "1M", e de um bilhão para cima, "1B".
 * Abaixo disso o número cabe inteiro.
 */
export function formatCoinValue(value: number): string {
  if (value >= 1_000_000_000) {
    return `${value / 1_000_000_000}B`;
  }

  if (value >= 1_000_000) {
    return `${value / 1_000_000}M`;
  }

  if (value >= 10_000) {
    return `${value / 1_000}k`;
  }

  return String(value);
}

/** Itens coletáveis, incluindo as moedas gigantes numeradas. */
export type ItemType = 'coin' | 'big-coin' | 'huge-coin' | GiantCoinType | 'crystal' | 'heart' | 'power-up';

/**
 * Desenho do portal final: o arco de pedra ou o castelo, que a criança
 * reconhece como o fim da fase nos jogos de plataforma. Só muda o visual.
 */
export const PORTAL_LOOKS = ['arch', 'castle'] as const;

export type PortalLook = (typeof PORTAL_LOOKS)[number];

/**
 * A porta dourada leva à porta do mesmo par, como a de madeira, e na
 * primeira passagem ainda dá um punhado de moedas e destranca a fase secreta
 * escolhida para ela. O baú de moedas abre ao encostar e espalha moedas.
 */
export type MarkerType = 'start' | 'checkpoint' | 'portal' | 'door' | 'golden-door' | 'secret-door' | 'coin-chest';

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
  | 'crate'
  | 'pumpkin';

/** Gatilhos invisíveis: dicas do tutorial e falas do mascote. */
export type TriggerType = 'hint' | 'mascot-tip';

/**
 * O escorregador fica em pé no chão, com a escada à esquerda: quem pousa na
 * rampa desce sozinho, ganhando velocidade, e sai correndo lá embaixo. A
 * plataforma de esqueleto espera parada: quando o herói pisa, ela segue
 * para a direita até bater numa parede; ali treme, se desmancha e, um
 * tempinho depois, volta montada no lugar de onde saiu.
 */
export type LevelObjectType =
  | TerrainType
  | BlockType
  | 'moving-platform'
  | 'skeleton-platform'
  | 'slide'
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
  /** Porta dourada: id da fase do Pedro que ela destranca na primeira passagem. */
  readonly secretLevel?: string;
  /** Desenho do portal final; sem ele, o arco de pedra. */
  readonly portalLook?: PortalLook;
}

export interface LevelObject {
  readonly id: string;
  readonly type: LevelObjectType;
  readonly x: number;
  readonly y: number;
  readonly properties?: LevelObjectProperties;
}

/** Molde do desenho do chefão: cada mundo tem o seu. */
export type BossLook = 'slime' | 'cactus' | 'ice' | 'magma' | 'comet' | 'pumpkin';

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
  /**
   * Fase secreta já destrancada pela porta dourada de outra fase. Só conta
   * para as fases escolhidas como secretas: as outras abrem sempre.
   */
  readonly secretUnlocked: boolean;
}
