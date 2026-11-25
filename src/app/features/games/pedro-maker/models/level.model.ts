import type { ScreenMode } from '../config/screen.config';

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
 *
 * A Bomb-omb é a bombinha que anda: pisada, acende o pavio, para e, um
 * instante depois, explode — quebra os tijolos e derruba quem estiver perto,
 * inclusive o herói que não se afastou.
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
  'walking-bomb',
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
 * segurando o pulo (só nas fases antigas: o editor não oferece mais); com o
 * guaxinim, voa um pouquinho e gira o rabo. O Giga
 * Cogumelo deixa o herói gigante por alguns segundos, e o Cogumelo Turbo, bem
 * mais rápido. O Cogumelo Troca-Personagem age na hora: o herói vira o próximo
 * da turma, com o pulo e o freio dele. O Cogumelo Ímã puxa as moedas de longe,
 * e o Cogumelo Alto estica o herói: cabeça lá em cima, músculo fraco. O
 * Cogumelo Reverso troca os comandos por alguns segundos: esquerda vira direita.
 * O Cogumelo de Encolher deixa o herói pequenininho, do tamanho de meio bloco:
 * ele passa nos buraquinhos e pula um pouco mais alto. As moedas de
 * multiplicação (×2, ×4, ×1000 e ×9999) fazem cada moeda pega valer mais por
 * alguns segundos.
 *
 * O Cogumelo 1UP dá uma vida a mais: um coração extra no placar, além do
 * máximo da fase. A Flor de Bolha é um traje como as outras flores: o botão de
 * ação sopra bolhas que flutuam reto, sem cair nos buracos, e prendem o
 * inimigo que tocam. O Cogumelo Vida, que enchia os corações, saiu do editor:
 * continua só nas fases antigas que já o tinham.
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
  'reverse-mushroom',
  'mini-mushroom',
  'pedrere-mushroom',
  'coin-x2',
  'coin-x4',
  'coin-x1000',
  'coin-x9999',
  'extra-life-mushroom',
  'bubble-flower',
] as const;

export type PowerUpKind = (typeof POWER_UP_KINDS)[number];

/** Moedas de multiplicação e quanto cada uma multiplica as moedas pegas enquanto dura. */
export const COIN_MULTIPLIERS = {
  'coin-x2': 2,
  'coin-x4': 4,
  'coin-x1000': 1000,
  'coin-x9999': 9999,
} as const satisfies Partial<Record<PowerUpKind, number>>;

export type CoinMultiplierKind = keyof typeof COIN_MULTIPLIERS;

export const COIN_MULTIPLIER_KINDS = Object.keys(COIN_MULTIPLIERS) as readonly CoinMultiplierKind[];

export function isCoinMultiplier(kind: PowerUpKind): kind is CoinMultiplierKind {
  return kind in COIN_MULTIPLIERS;
}

/** Como a criança lê a moeda: "×2", "×9999". */
export function coinMultiplierLabel(kind: CoinMultiplierKind): string {
  return `×${COIN_MULTIPLIERS[kind]}`;
}

/**
 * Os poderes clássicos, que o Lucky Block sorteia. O Cogumelo Folha e o
 * Cogumelo Vida saíram do jogo novo: continuam só nas fases antigas que já os
 * tinham. No lugar do Cogumelo Vida, o Lucky Block sorteia o Cogumelo 1UP.
 */
export const CLASSIC_POWER_UPS = [
  'mushroom',
  'fire-flower',
  'ice-flower',
  'star',
  'extra-life-mushroom',
  'cat-mushroom',
  'raccoon-leaf',
  'giga-mushroom',
  'turbo-mushroom',
] as const satisfies readonly PowerUpKind[];

/**
 * `lucky`: o Lucky Block, que sorteia um poder clássico na hora da cabeçada.
 * `multi-coins`: o bloco de moedas, com cara de tijolo, que solta uma moeda a
 * cada cabeçada até esvaziar.
 * `empty`: a surpresa vazia, que só solta uma nuvenzinha de poeira — a pegadinha
 * de quem monta a fase.
 */
export const SURPRISE_CONTENTS = ['coins', 'heart', 'crystal', 'power-up', 'lucky', 'multi-coins', 'empty'] as const;

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
 *
 * O bloco ON/OFF é o interruptor da fase, que começa em ON: cada cabeçada por
 * baixo troca para OFF e de volta para ON. Com ON, os blocos vermelhos são
 * firmes e os azuis viram só um contorno, que se atravessa; com OFF, ao contrário.
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
  | 'ceiling-spring'
  | 'on-off-switch'
  | 'red-block'
  | 'blue-block';

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

/**
 * Itens coletáveis, incluindo as moedas gigantes numeradas. A Moeda
 * Gigantesca (`mega-coin`) ocupa dois blocos e, pega, estoura numa chuva de
 * moedas de verdade, que o herói sai catando.
 */
export type ItemType = 'coin' | 'big-coin' | 'huge-coin' | GiantCoinType | 'mega-coin' | 'crystal' | 'heart' | 'power-up';

/**
 * Desenho do portal final: o arco de pedra, o castelo ou a bandeira final,
 * que a criança reconhece como o fim da fase nos jogos de plataforma. O arco
 * e o castelo se atravessam; a bandeira é um mastro alto, e encostar nele em
 * qualquer altura já termina a fase.
 */
export const PORTAL_LOOKS = ['arch', 'castle', 'flag'] as const;

export type PortalLook = (typeof PORTAL_LOOKS)[number];

/**
 * A porta dourada leva à porta do mesmo par, como a de madeira, e na
 * primeira passagem ainda dá um punhado de moedas e destranca a fase secreta
 * escolhida para ela. O baú de moedas abre ao encostar e espalha moedas. O
 * cano mágico funciona como a porta, mas só leva a outro cano da mesma letra.
 */
export type MarkerType = 'start' | 'checkpoint' | 'portal' | 'door' | 'golden-door' | 'secret-door' | 'coin-chest' | 'warp-pipe';

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
  | 'pumpkin'
  /** Cacho de balões coloridos amarrados no chão: enfeite de festa, para a turma comemorar a fase. */
  | 'balloons'
  /** Flor Falante: diz a frase escrita no editor quando o herói chega perto. */
  | 'talking-flower';

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
  /** Bastão de fogo: bloco com uma fila de bolas de fogo girando em volta; `range` é quantas bolas. */
  | 'fire-bar'
  /** Botão P: encostar nele troca tijolos por moedas e moedas por tijolos por dez segundos. */
  | 'p-switch'
  /** Chave: vai para o bolso ao encostar e abre uma porta com cadeado. */
  | 'key'
  /** Porta com cadeado: parede de dois blocos de altura que só abre com uma chave no bolso. */
  | 'locked-door'
  /** Corrente: bloco firme que se solta quando alguém puxa uma alavanca da fase. */
  | 'chain'
  /** Alavanca: encostar nela puxa, todas as correntes da fase se soltam e as prensas esmagadoras sobem de vez. */
  | 'lever'
  /**
   * Prensa Esmagadora: bloco de ferro preso no teto que despenca até o chão,
   * esmaga quem estiver embaixo e sobe de novo, sem parar. Puxar uma alavanca
   * da fase faz a prensa subir e ficar lá em cima, com o caminho livre.
   */
  | 'crusher'
  /** Prensa Esmagadora Larga: a mesma prensa, com três blocos de largura; a peça marca o bloco do meio. */
  | 'wide-crusher'
  /** Corrente de Subir: corrente pendurada; segurando o pulo, qualquer herói sobe por ela. */
  | 'climb-chain'
  /**
   * Armadilha de Fogo: bloco de pedra com uma boca em cima que, de tempos em
   * tempos, solta uma coluna de fogo para o alto. Antes de acender, solta
   * fumacinha: dá para ver e esperar.
   */
  | 'fire-trap'
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
  /** Tela escolhida na aba Telas do editor; sem ela, vale a tela dos ajustes de quem joga. */
  readonly screen?: ScreenMode;
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
  /** Tela escolhida na aba Telas do editor; fases antigas não têm, e usam a dos ajustes. */
  readonly screen?: ScreenMode;
  /** Verdadeiro depois que a fase foi terminada pelo menos uma vez. */
  readonly completed: boolean;
  readonly bestStars: number;
  /**
   * Fase secreta já destrancada pela porta dourada de outra fase. Só conta
   * para as fases escolhidas como secretas: as outras abrem sempre.
   */
  readonly secretUnlocked: boolean;
}
