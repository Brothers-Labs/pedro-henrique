/**
 * A ajuda do PedroCraft, escrita para uma criança ler (ou ouvir).
 *
 * Frases curtas, um passo por vez, com a figura do item ao lado. Os itens são
 * citados pelo id do conteúdo: a figura é a mesma da mochila, e um teste
 * confere que todo item citado existe. As receitas, a fornalha e a lista de
 * itens não moram aqui — são montadas do próprio conteúdo e nunca ficam
 * desatualizadas.
 */

/** Um gesto do jogo: o que tocar no tablet e o que apertar no computador. */
export type HelpControl = 'move' | 'look' | 'jump' | 'break' | 'use' | 'hotbar' | 'backpack' | 'pause' | 'help';

export interface HelpControlLabel {
  readonly touch: string;
  readonly keyboard: string;
}

export const HELP_CONTROLS: Readonly<Record<HelpControl, HelpControlLabel>> = {
  move: { touch: 'Arraste o círculo da esquerda', keyboard: 'Teclas W A S D' },
  look: { touch: 'Arraste o dedo no meio da tela', keyboard: 'Mexa o mouse (clique no mundo antes)' },
  jump: { touch: 'Botão ⤒', keyboard: 'Barra de espaço' },
  break: { touch: 'Segure o botão ⛏️', keyboard: 'Segure o clique do mouse' },
  use: { touch: 'Toque no botão 🧱', keyboard: 'Botão direito do mouse' },
  hotbar: { touch: 'Toque no item da barra de baixo', keyboard: 'Números 1 a 9 ou a rodinha do mouse' },
  backpack: { touch: 'Botão 🎒 lá em cima', keyboard: 'Tecla E' },
  pause: { touch: 'Botão ⏸ lá em cima', keyboard: 'Tecla Esc' },
  help: { touch: 'Botão ❓ lá em cima', keyboard: 'Tecla H' },
};

export interface HelpStep {
  readonly text: string;
  /** Figuras do passo, pelos ids dos itens. */
  readonly items?: readonly string[];
  /** O gesto que este passo usa. */
  readonly control?: HelpControl;
}

export interface HelpTopic {
  readonly id: string;
  readonly emoji: string;
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly HelpStep[];
  readonly tip?: string;
}

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: 'comecar',
    emoji: '🚶',
    title: 'Andar e olhar',
    summary: 'O primeiro passo: passear pela fazenda.',
    steps: [
      { text: 'Para andar, use o círculo da esquerda.', control: 'move' },
      { text: 'Para olhar em volta, arraste o dedo no meio da tela.', control: 'look' },
      { text: 'Para pular, toque no botão de pular. Na água, segure para nadar para cima.', control: 'jump' },
      { text: 'A cruzinha branca no meio da tela é a sua mira. Ela mostra o que você vai pegar.' },
    ],
    tip: 'Nas Configurações dá para ligar a leitura em voz alta e ver de novo o guia dos primeiros passos.',
  },
  {
    id: 'quebrar',
    emoji: '⛏️',
    title: 'Quebrar e pegar blocos',
    summary: 'Tudo no mundo é feito de blocos. Dá para pegar quase todos!',
    steps: [
      { text: 'Mire num bloco. Ele ganha uma borda branca.', items: ['oak-log'] },
      { text: 'Segure o botão de quebrar até o bloco sumir.', control: 'break' },
      { text: 'O bloco vira um item pequeno que voa até você e entra na mochila.' },
      { text: 'Pedra e minério pedem picareta. Sem ela, o bloco não dá nada.', items: ['wooden-pickaxe', 'cobblestone', 'iron-ore'] },
    ],
    tip: 'Com a ferramenta certa, tudo quebra muito mais rápido.',
  },
  {
    id: 'construir',
    emoji: '🧱',
    title: 'Colocar blocos e construir',
    summary: 'Faça a sua casa, uma torre ou um castelo.',
    steps: [
      { text: 'Escolha um bloco na barra de baixo.', items: ['oak-planks'], control: 'hotbar' },
      { text: 'Mire onde ele vai ficar.' },
      { text: 'Toque no botão de usar. O bloco aparece!', control: 'use' },
      { text: 'A porta abre e fecha com o mesmo botão de usar.', items: ['door'] },
    ],
    tip: 'Tábuas, pedregulho, vidro e tijolos de pedra ficam lindos juntos.',
  },
  {
    id: 'mochila',
    emoji: '🎒',
    title: 'Mochila e barra de itens',
    summary: 'Onde ficam as suas coisas.',
    steps: [
      { text: 'A barra de baixo tem 9 espaços. O item escolhido fica com borda amarela.', control: 'hotbar' },
      { text: 'Abra a mochila para ver tudo o que você tem.', control: 'backpack' },
      { text: 'Na mochila, toque num item para pegar e toque noutro espaço para soltar.' },
      { text: 'Segure o dedo num monte de itens para pegar só a metade.' },
    ],
  },
  {
    id: 'fabricar',
    emoji: '🛠️',
    title: 'Fabricar: da madeira à picareta',
    summary: 'Transforme o que você pega em coisas novas.',
    steps: [
      { text: 'Quebre troncos de árvore.', items: ['oak-log'], control: 'break' },
      { text: 'Abra a mochila e toque na receita das tábuas. 1 tronco vira 4 tábuas.', items: ['oak-log', 'oak-planks'], control: 'backpack' },
      { text: 'Toque na receita da mesa de trabalho. São 4 tábuas.', items: ['oak-planks', 'workbench'] },
      { text: 'Coloque a mesa no chão e use a mesa para abrir a grade grande.', items: ['workbench'], control: 'use' },
      { text: 'Na mesa, faça gravetos e a picareta de madeira.', items: ['stick', 'wooden-pickaxe'] },
    ],
    tip: 'O livro de receitas mostra primeiro o que você já consegue fazer. É só tocar!',
  },
  {
    id: 'ferramentas',
    emoji: '🪓',
    title: 'Ferramentas',
    summary: 'Cada ferramenta tem um trabalho.',
    steps: [
      { text: 'Picareta: pedra, minério e tijolos.', items: ['wooden-pickaxe', 'stone-pickaxe', 'iron-pickaxe', 'golden-pickaxe'] },
      { text: 'Machado: troncos e tábuas.', items: ['wooden-axe'] },
      { text: 'Pá: terra, areia e cascalho.', items: ['wooden-shovel'] },
      { text: 'Enxada: prepara a terra para plantar.', items: ['wooden-hoe'] },
      { text: 'Tesoura: tira a lã da ovelha e pega folhas.', items: ['shears'] },
      { text: 'As ferramentas gastam com o uso. A barrinha embaixo do ícone mostra quanto falta.' },
    ],
    tip: 'Madeira, pedra, ferro e ouro: quanto melhor o material, mais rápido e mais forte.',
  },
  {
    id: 'fornalha',
    emoji: '🔥',
    title: 'Fornalha: assar e derreter',
    summary: 'Faça vidro, barras de ferro e comida quentinha.',
    steps: [
      { text: 'Junte 8 pedregulhos e faça a fornalha na mesa.', items: ['cobblestone', 'furnace'] },
      { text: 'Coloque a fornalha no chão e use a fornalha.', control: 'use' },
      { text: 'Em cima vai o que você quer assar, embaixo vai o combustível.', items: ['iron-ore', 'coal'] },
      { text: 'Espere a setinha encher e pegue o que ficou pronto.', items: ['iron-ingot'] },
    ],
    tip: 'Carvão, troncos e tábuas servem de combustível. Tronco na fornalha também vira carvão!',
  },
  {
    id: 'fazenda',
    emoji: '🌾',
    title: 'Plantar e colher',
    summary: 'Cuide da sua fazenda e colha comida.',
    steps: [
      { text: 'Pegue sementes quebrando o capim alto.', items: ['wheat-seeds', 'carrot'], control: 'break' },
      { text: 'Faça uma enxada e use a enxada na grama. Ela vira terra arada.', items: ['wooden-hoe'], control: 'use' },
      { text: 'Escolha a semente e use na terra arada.', items: ['wheat-seeds'], control: 'use' },
      { text: 'Espere crescer. Com água perto, cresce duas vezes mais rápido!', items: ['water-bucket'] },
      { text: 'Quando estiver dourado e grande, quebre para colher.', items: ['wheat'], control: 'break' },
      { text: 'Plante a muda na grama e ela vira uma árvore.', items: ['oak-sapling'], control: 'use' },
    ],
    tip: 'Três trigos lado a lado na mesa viram um pão.',
  },
  {
    id: 'plantas',
    emoji: '🎃',
    title: 'Todas as plantações',
    summary: 'Cada planta dá uma comida diferente. Junte todas!',
    steps: [
      { text: 'Quebre o capim alto para achar sementes. Cada vez pode sair uma diferente!', control: 'break' },
      { text: 'Trigo e cenoura: as primeiras da fazenda.', items: ['wheat-seeds', 'carrot'] },
      { text: 'Batata: plante a própria batata. Na fornalha, vira batata assada.', items: ['potato', 'baked-potato'] },
      { text: 'Beterraba: com uma tigela, vira sopa.', items: ['beetroot-seeds', 'beetroot', 'beetroot-soup'] },
      { text: 'Abóbora e melancia: crescem devagar, mas valem a pena.', items: ['pumpkin-seeds', 'pumpkin', 'melon-seeds', 'melon-slice'] },
      { text: 'Girassol: dá sementes gostosas para comer.', items: ['sunflower-seeds'] },
      { text: 'Cana-de-açúcar: cresce até na areia, perto da água. Vira açúcar.', items: ['sugar-cane', 'sugar'] },
    ],
    tip: 'Veja o que cada coisa faz em "Todos os itens".',
  },
  {
    id: 'adubo',
    emoji: '✨',
    title: 'Adubo',
    summary: 'Faz as plantas crescerem na hora.',
    steps: [
      { text: 'Na mochila, 4 sementes de trigo viram 2 adubos.', items: ['wheat-seeds', 'fertilizer'], control: 'backpack' },
      { text: 'Um osso também vira 3 adubos. Os esqueletos deixam ossos.', items: ['bone', 'fertilizer'] },
      { text: 'Escolha o adubo e use numa planta que está crescendo. Ela cresce um pouco, com brilho!', control: 'use' },
      { text: 'Use adubo na muda pronta e ela vira árvore na hora.', items: ['oak-sapling'] },
    ],
  },
  {
    id: 'cozinha',
    emoji: '🍰',
    title: 'Cozinhar',
    summary: 'Comidas feitas curam mais que comida crua.',
    steps: [
      { text: 'Pão: 3 trigos lado a lado na mesa.', items: ['wheat', 'bread'] },
      { text: 'Sopa de beterraba: 3 beterrabas e uma tigela, na mochila.', items: ['beetroot', 'bowl', 'beetroot-soup'] },
      { text: 'Torta de abóbora: abóbora, açúcar e ovo, na mochila.', items: ['pumpkin', 'sugar', 'egg', 'pumpkin-pie'] },
      { text: 'Bolo: na mesa, 3 trigos em cima e açúcar, ovo e açúcar embaixo.', items: ['wheat', 'sugar', 'egg', 'cake'] },
      { text: 'Batata assada e ovo frito: na fornalha.', items: ['baked-potato', 'fried-egg'] },
    ],
    tip: 'O bolo é a comida mais forte: recupera 8 corações!',
  },
  {
    id: 'agua',
    emoji: '🪣',
    title: 'Água e balde',
    summary: 'Leve água para onde você quiser.',
    steps: [
      { text: 'Faça um balde com 3 barras de ferro.', items: ['iron-ingot', 'bucket'] },
      { text: 'Use o balde na água parada do lago ou do riacho.', items: ['bucket', 'water-bucket'], control: 'use' },
      { text: 'Use o balde cheio onde quiser. A água escorre um pouco para os lados.', control: 'use' },
      { text: 'Pegue a água de volta com o balde vazio, no lugar onde você despejou.' },
    ],
    tip: 'A água que escorre não dá para pegar: só a água parada.',
  },
  {
    id: 'animais',
    emoji: '🐑',
    title: 'Animais da fazenda',
    summary: 'Ovelhas, vacas e galinhas aparecem de dia na grama.',
    steps: [
      { text: 'Ovelha: use a tesoura nela e ganhe lã. A lã cresce de novo depois de um tempinho.', items: ['shears', 'wool'], control: 'use' },
      { text: 'Vaca: use o balde vazio nela e ganhe leite.', items: ['bucket', 'milk-bucket'], control: 'use' },
      { text: 'Galinha: ela bota ovos sozinha. Ovo na fornalha vira ovo frito.', items: ['egg', 'fried-egg'] },
      { text: 'Filhotes: dê trigo a duas ovelhas ou a duas vacas que estejam pertinho. Nasce um filhote!', items: ['wheat'], control: 'use' },
      { text: 'As galinhas gostam de sementes de trigo.', items: ['wheat-seeds'], control: 'use' },
      { text: 'O filhote cresce sozinho em alguns minutos.' },
    ],
    tip: 'Com lã e tábuas você faz uma cama!',
  },
  {
    id: 'vida',
    emoji: '❤️',
    title: 'Vida e comida',
    summary: 'Os corações mostram a sua vida.',
    steps: [
      { text: 'Os corações ficam em cima da barra de itens.' },
      { text: 'A vida volta sozinha, um coração de cada vez.' },
      { text: 'Para voltar mais rápido, escolha uma comida e use.', items: ['apple', 'bread', 'carrot', 'fried-egg'], control: 'use' },
      { text: 'Se a vida acabar, você acorda em casa com todas as suas coisas. Nada se perde!' },
    ],
  },
  {
    id: 'noite',
    emoji: '🌙',
    title: 'Dia, noite e a cama',
    summary: 'O dia é longo, e a noite é curtinha.',
    steps: [
      { text: 'Quando o céu fica azul-escuro e aparece a lua 🌙, é noite.' },
      { text: 'Faça uma cama com 3 lãs e 3 tábuas.', items: ['wool', 'oak-planks', 'bed'] },
      { text: 'Use a cama de dia: ela vira a sua casa, o lugar de voltar.', control: 'use' },
      { text: 'Use a cama de noite: você dorme e acorda de manhã.', control: 'use' },
    ],
    tip: 'Tochas iluminam a noite. Faça com carvão e graveto.',
  },
  {
    id: 'estacoes',
    emoji: '🍂',
    title: 'Estações e clima',
    summary: 'O ano tem primavera, verão, outono e inverno. Cada estação dura 7 dias.',
    steps: [
      { text: 'Embaixo dos corações aparecem a estação, o dia e se é manhã, tarde ou noite.' },
      { text: 'Primavera 🌸: as plantas crescem mais rápido e chove de vez em quando.' },
      { text: 'Verão ☀️: os dias ficam longos e as noites curtinhas.' },
      { text: 'Outono 🍂: as folhas das árvores ficam laranjas.' },
      { text: 'Inverno ❄️: neva, a grama fica branca e as plantas descansam.' },
      { text: 'A chuva rega a plantação que está a céu aberto. Que ajuda!' },
      { text: 'Para plantar no inverno, faça um telhado de vidro em cima da plantação: é a estufa!', items: ['glass', 'wheat-seeds'] },
    ],
    tip: 'Vidro sai da areia assada na fornalha.',
  },
  {
    id: 'inimigos',
    emoji: '🛡️',
    title: 'Inimigos da noite',
    summary: 'À noite aparecem inimigos fofos. De manhã, eles voltam para casa.',
    steps: [
      { text: 'Slime de lama: pula e, quando vence, vira dois pequenininhos.' },
      { text: 'Zumbi-espantalho: anda devagar atrás de você.' },
      { text: 'Aranha-botão: pula rápido.' },
      { text: 'Esqueleto-arqueiro: atira flechas de longe. Fique atrás de uma parede!' },
      { text: 'Para se defender, use a espada ou o arco com flechas.', items: ['wooden-sword', 'bow', 'arrow'], control: 'break' },
      { text: 'Tochas, lanternas e fogueiras perto da casa fazem os inimigos não nascerem ali.', items: ['torch', 'lantern', 'campfire'] },
      { text: 'Armadura na mochila segura os golpes: cada golpe gasta um pouco dela, e você não perde coração.', items: ['leather-armor', 'iron-armor', 'golden-armor'] },
      { text: 'O couro da armadura vem da vaca.', items: ['leather'] },
      { text: 'Segure o escudo na mão para parar as flechas do esqueleto.', items: ['shield'], control: 'hotbar' },
      { text: 'Na lua cheia 🌕, o Rei Slime vem passear. Vencido, ele vira quatro slimes e deixa a coroa dele!', items: ['slime-crown'] },
    ],
    tip: 'Não quer inimigos? Ligue o Modo Paz 🕊️. Quer inimigos mais calmos? Escolha Fácil nas Configurações.',
  },
  {
    id: 'modos',
    emoji: '🎮',
    title: 'Modos de jogo',
    summary: 'Cada mundo tem um modo, escolhido quando você cria o mundo.',
    steps: [
      { text: 'Aventura 🗺️: o jogo de sempre. Colha, construa, cuide da fazenda e da noite.' },
      { text: 'Criativo 🎨: você não perde vida e não aparecem inimigos. Os blocos nunca acabam e tudo quebra na hora.' },
      { text: 'No Criativo, abra a mochila e toque em qualquer item para pegar um monte dele.', control: 'backpack' },
      { text: 'No Criativo, segure o pulo no ar para voar para cima.', control: 'jump' },
      { text: 'Sobrevivência 🍎: além dos corações, tem a energia 🍗. Ela desce devagar.', items: ['bread'] },
      { text: 'Comer enche a energia. Se a energia acabar, a vida para de voltar sozinha, mas você nunca perde coração por fome.', control: 'use' },
    ],
    tip: 'Comidas feitas, como o bolo e a sopa, enchem mais energia.',
  },
  {
    id: 'missoes',
    emoji: '🏆',
    title: 'Missões',
    summary: 'O jogo dá uma missão de cada vez, para você saber o que fazer.',
    steps: [
      { text: 'A missão da vez fica no cartão lá em cima, com a figura do que você precisa.' },
      { text: 'Toque no cartão da missão para ouvir o que fazer.' },
      { text: 'Quando você cumpre, aparece uma comemoração e vem a próxima.' },
      { text: 'Cada missão cumprida também vale um desafio na sua jornada do site.' },
    ],
  },
  {
    id: 'mundos',
    emoji: '🌍',
    title: 'Mundos e salvar',
    summary: 'O seu mundo fica guardado no aparelho.',
    steps: [
      { text: 'O jogo salva sozinho enquanto você brinca, quando pausa e quando sai. Aparece "Salvo ✓" lá em cima.' },
      { text: 'Na tela do PedroCraft, toque em Continuar para voltar ao último mundo.' },
      { text: 'Em Novo mundo, dê um nome e toque em Criar mundo. Cada mundo é diferente!' },
      { text: 'Para pausar o jogo a qualquer hora, use o botão de pausa.', control: 'pause' },
    ],
    tip: 'Cabem até 5 mundos. Para criar outro, apague um que você não quer mais.',
  },
];
