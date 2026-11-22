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
    id: 'dois-jogadores',
    emoji: '🧒',
    title: 'Jogar em dois ou em três',
    summary: 'Duas ou três crianças no mesmo mundo, cada uma no seu pedaço da tela.',
    steps: [
      { text: 'Na tela do PedroCraft, em "Quem vai jogar?", escolha 2 ou 3 jogadores e o personagem de cada um: Mario, Peach, Gui e toda a turma do Pedro Maker.' },
      { text: 'Com 2, a tela divide ao meio: o Jogador 1 fica na esquerda e o Jogador 2 na direita. Cada um tem a sua mochila, a sua vida e a sua barra.' },
      { text: 'Com 3, a tela divide em quatro: os Jogadores 1 e 2 em cima, o Jogador 3 embaixo à esquerda, e o quarto que sobra mostra como cada um joga.' },
      { text: 'Jogador 1: W A S D anda, o mouse olha, clique quebra, botão direito coloca e E abre a mochila.' },
      { text: 'Jogador 2: o primeiro controle de videogame, ou as setas para andar, I J K L para olhar, Enter para pular, U quebra, O coloca, N e M trocam o item e H abre a mochila.' },
      { text: 'Jogador 3: o segundo controle de videogame. O controle ligado primeiro é do Jogador 2. Aperte um botão em cada controle para o computador reconhecer os dois.' },
      { text: 'O mundo é de todos: o que um constrói, os outros veem. O que cai no chão vai para quem estiver mais perto.' },
    ],
    tip: 'Os bonecos dos personagens também moram na mochila do modo Criativo!',
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
      { text: 'Picareta: pedra, minério e tijolos.', items: ['wooden-pickaxe', 'stone-pickaxe', 'iron-pickaxe', 'golden-pickaxe', 'diamond-pickaxe'] },
      { text: 'Machado: troncos e tábuas.', items: ['wooden-axe'] },
      { text: 'Pá: terra, areia e cascalho.', items: ['wooden-shovel'] },
      { text: 'Enxada: prepara a terra para plantar.', items: ['wooden-hoe'] },
      { text: 'Tesoura: tira a lã da ovelha e pega folhas.', items: ['shears'] },
      { text: 'As ferramentas gastam com o uso. A barrinha embaixo do ícone mostra quanto falta.' },
    ],
    tip: 'Madeira, pedra, ferro, ouro e diamante: quanto melhor o material, mais forte. A picareta de ouro é a mais rápida, mas gasta logo!',
  },
  {
    id: 'ouro',
    emoji: '🟨',
    title: 'Ouro',
    summary: 'O metal amarelo e brilhante que fica embaixo da pedreira.',
    steps: [
      { text: 'O ouro mora embaixo da pedreira, mais fundo que o ferro. Procure a pedra com pontinhos amarelos!', items: ['gold-ore'], control: 'break' },
      { text: 'Só a picareta de ferro, de ouro ou de diamante tira o ouro da pedra.', items: ['iron-pickaxe', 'golden-pickaxe', 'diamond-pickaxe'] },
      { text: 'Na fornalha, o minério de ouro vira barra de ouro.', items: ['gold-ore', 'coal', 'gold-ingot'] },
      { text: 'Na mesa, 3 barras de ouro e 2 gravetos viram a picareta de ouro: a mais rápida de todas, mas gasta logo.', items: ['gold-ingot', 'stick', 'golden-pickaxe'] },
      { text: '9 barras de ouro viram um bloco de ouro, brilhante para enfeitar a casa.', items: ['gold-ingot', 'gold-block'] },
    ],
    tip: 'Quer cavar rapidinho? Use a picareta de ouro. Quer que ela dure bastante? Use a de diamante.',
  },
  {
    id: 'diamante',
    emoji: '💎',
    title: 'Diamante',
    summary: 'A pedra mais brilhante e mais forte do jogo.',
    steps: [
      { text: 'O diamante mora bem embaixo da pedreira. Cave para baixo e procure a pedra com pontinhos azuis!', items: ['diamond'], control: 'break' },
      { text: 'Só a picareta de ferro, de ouro ou de diamante tira o diamante da pedra.', items: ['iron-pickaxe', 'golden-pickaxe', 'diamond-pickaxe'] },
      { text: 'Na mesa, 3 diamantes e 2 gravetos viram a picareta de diamante: a mais forte e a que mais dura.', items: ['diamond', 'stick', 'diamond-pickaxe'] },
      { text: '9 diamantes viram um bloco de diamante, para enfeitar a casa.', items: ['diamond', 'diamond-block'] },
      { text: 'Na mesa, 3 blocos de diamante em fila viram 6 meios blocos: ótimos para degraus. Veja tudo sobre eles em "Meios blocos".', items: ['diamond-block', 'diamond-half'] },
      { text: 'O mais forte de todos: 4 blocos de diamante nos cantos, 4 obsidianas nos lados e um bloco de ouro no meio viram um bloco de netherite. Nem a TNT quebra!', items: ['diamond-block', 'obsidian', 'gold-block', 'netherite-block'] },
    ],
    tip: 'Leve tochas quando for cavar fundo: lá embaixo é escurinho.',
  },
  {
    id: 'esmeralda',
    emoji: '💚',
    title: 'Esmeralda e lápis-lazúli',
    summary: 'Duas pedras coloridas escondidas lá no fundo.',
    steps: [
      { text: 'A esmeralda mora bem fundo, perto da pedreira. Procure a pedra com pontinhos verdes!', items: ['emerald'], control: 'break' },
      { text: 'Só a picareta de ferro, de ouro ou de diamante tira a esmeralda da pedra.', items: ['iron-pickaxe', 'golden-pickaxe', 'diamond-pickaxe'] },
      { text: '9 esmeraldas viram um bloco de esmeralda, verdinho para enfeitar a casa.', items: ['emerald', 'emerald-block'] },
      { text: 'O lápis-lazúli é a pedra com pontinhos azuis-escuros. A picareta de pedra já tira!', items: ['stone-pickaxe', 'lapis'], control: 'break' },
      { text: 'Na mochila, 2 lãs e 1 lápis-lazúli viram 3 tapetes azuis.', items: ['wool', 'lapis', 'carpet-blue'], control: 'backpack' },
    ],
    tip: 'Pontinhos azul-claros são diamante; azul-escuros são lápis-lazúli.',
  },
  {
    id: 'meios-blocos',
    emoji: '🪜',
    title: 'Meios blocos',
    summary: 'Degraus baixinhos de ouro, diamante, esmeralda e netherite.',
    steps: [
      {
        text: 'Na mesa, 3 blocos iguais em fila viram 6 meios blocos.',
        items: ['gold-half', 'diamond-half', 'emerald-half', 'netherite-half'],
      },
      { text: 'Coloque um meio bloco no chão: ele tem só a metade da altura, um degrau baixinho.', control: 'use' },
      { text: 'Coloque outro meio bloco igual em cima dele: os dois viram um bloco inteiro!', items: ['gold-half', 'gold-block'], control: 'use' },
      { text: 'Na mochila, 2 meios blocos iguais também voltam a ser um bloco.', control: 'backpack' },
    ],
    tip: 'O meio bloco de netherite é forte como o bloco inteiro: nem a TNT quebra.',
  },
  {
    id: 'alavanca',
    emoji: '🕹️',
    title: 'Alavanca e linha',
    summary: 'Abra a porta e acenda a TNT de longe.',
    steps: [
      { text: 'Na mochila, 1 graveto em cima de 1 pedregulho vira uma alavanca.', items: ['stick', 'cobblestone', 'lever'], control: 'backpack' },
      { text: 'Coloque a alavanca no chão e use: a bolinha fica verde quando está ligada e vermelha quando está desligada.', items: ['lever'], control: 'use' },
      { text: 'Escolha a linha e coloque no chão, em fila, saindo da alavanca. As linhas se ligam sozinhas!', items: ['string'], control: 'use' },
      { text: 'Leve a linha até uma porta: ligue a alavanca e a porta abre; desligue e ela fecha.', items: ['lever', 'string', 'door'] },
      { text: 'Leve a linha até uma TNT, ou coloque a linha em cima dela, e ligue a alavanca. Corra para longe!', items: ['string', 'tnt'] },
    ],
    tip: 'Quando a alavanca está ligada, a linha inteira fica amarela: dá para ver por onde o comando passa.',
  },
  {
    id: 'obsidiana',
    emoji: '🟪',
    title: 'Obsidiana',
    summary: 'O bloco mais duro do jogo: nem a TNT quebra.',
    steps: [
      { text: 'A obsidiana fica lá no fundo de tudo, encostada na rocha-mãe. Ela é roxa bem escura.', items: ['obsidian'] },
      { text: 'Só a picareta de diamante tira a obsidiana. E demora um pouquinho!', items: ['diamond-pickaxe'], control: 'break' },
      { text: 'Construa com ela uma parede para proteger a casa: a explosão não derruba obsidiana.', items: ['obsidian'], control: 'use' },
    ],
    tip: 'Leve tochas: no fundo da pedreira é bem escurinho.',
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
      { text: 'Hambúrguer: pão, ovo frito e cenoura, na mochila.', items: ['bread', 'fried-egg', 'carrot', 'hamburger'] },
      { text: 'Batata frita: uma batata assada vira duas, na mochila.', items: ['baked-potato', 'fries'] },
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
    id: 'trem',
    emoji: '🚂',
    title: 'Trilhos e trem',
    summary: 'Monte uma linha de trem e passeie pela fazenda.',
    steps: [
      { text: 'Na mesa, 6 barras de ferro e 1 graveto viram 16 trilhos.', items: ['iron-ingot', 'stick', 'rail'] },
      { text: 'Coloque os trilhos no chão, um do lado do outro. Eles se ligam sozinhos e fazem curvas!', items: ['rail'], control: 'use' },
      { text: 'Na mesa, uma fornalha em cima, no meio, e 5 barras de ferro em volta viram o trem.', items: ['furnace', 'iron-ingot', 'train'] },
      { text: 'Escolha o trem na barra e use num trilho. Piuí, o trem sai andando!', items: ['train'], control: 'use' },
      { text: 'Nas encruzilhadas, olhe para o lado que você quer seguir.', control: 'look' },
      { text: 'Para descer do trem, pule.', control: 'jump' },
    ],
    tip: 'No fim da linha, o trem espera um pouquinho e volta sozinho. E o trem nunca se gasta!',
  },
  {
    id: 'tnt',
    emoji: '🧨',
    title: 'TNT',
    summary: 'Faça um buraco grande de uma vez só. Cuidado!',
    steps: [
      { text: 'Vença um creeper à noite e ele deixa pólvora.', items: ['gunpowder'] },
      { text: 'Na mesa, 5 pólvoras e 4 areias, em xadrez, viram uma TNT.', items: ['gunpowder', 'sand', 'tnt'] },
      { text: 'Coloque a TNT no chão.', items: ['tnt'], control: 'use' },
      { text: 'Escolha a tocha ou o isqueiro e use na TNT. Ela começa a piscar!', items: ['torch', 'flint-and-steel'], control: 'use' },
      { text: 'Corra para longe! Quando estoura, a TNT faz um buraco e machuca quem está perto.' },
      { text: 'Uma TNT perto da outra estoura junto, uma atrás da outra.', items: ['tnt'] },
    ],
    tip: 'Rocha-mãe, água e obsidiana aguentam a explosão. E a TNT acesa ainda dá para quebrar: o pavio apaga.',
  },
  {
    id: 'isqueiro',
    emoji: '🔥',
    title: 'Isqueiro',
    summary: 'Outro jeito de acender a TNT, feito de ferro e pedra.',
    steps: [
      { text: 'Quebre cascalho com a pá. Às vezes sai uma pederneira, a pedrinha cinza-escura!', items: ['gravel', 'flint'], control: 'break' },
      { text: 'Na mochila, 1 barra de ferro e 1 pederneira viram um isqueiro.', items: ['iron-ingot', 'flint', 'flint-and-steel'], control: 'backpack' },
      { text: 'Escolha o isqueiro e use na TNT. Faísca! O pavio acende.', items: ['flint-and-steel', 'tnt'], control: 'use' },
    ],
    tip: 'Cada TNT acesa gasta um uso do isqueiro. Na TNT que já está piscando, ele não gasta.',
  },
  {
    id: 'portal',
    emoji: '🟣',
    title: 'Portal do Nether',
    summary: 'Construa dois portais e viaje de um para o outro num instante.',
    steps: [
      { text: 'Junte 10 obsidianas. Só a picareta de diamante tira a obsidiana lá do fundo.', items: ['diamond-pickaxe', 'obsidian'], control: 'break' },
      { text: 'Monte uma moldura em pé: 2 obsidianas no chão, 3 de cada lado e 2 em cima. Os cantos podem ficar vazios.', items: ['obsidian'], control: 'use' },
      { text: 'O buraco do meio precisa ficar vazio, com 2 de largura e 3 de altura. Pode ser maior também!' },
      { text: 'Escolha o isqueiro e use na obsidiana de baixo, por dentro da moldura. Vuuum, o portal acende!', items: ['flint-and-steel'], control: 'use' },
      { text: 'Faça outro portal longe dali. Entre num portal, espere um pouquinho e você aparece no outro!', control: 'move' },
    ],
    tip: 'Quebrou um pedaço da moldura, o portal apaga. É só usar o isqueiro de novo. E a TNT não quebra o portal.',
  },
  {
    id: 'tapetes',
    emoji: '🧶',
    title: 'Tapetes',
    summary: 'Enfeite o chão da casa com tapetes coloridos.',
    steps: [
      { text: 'Use a tesoura na ovelha para ganhar lã.', items: ['shears', 'wool'] },
      { text: 'Na mochila, 2 lãs viram 3 tapetes brancos.', items: ['wool', 'carpet-white'], control: 'backpack' },
      {
        text: 'Para colorir, junte 2 lãs e uma cor: flor vermelha, cenoura, flor amarela, folhas, lápis-lazúli, beterraba ou carvão.',
        items: ['flower-red', 'carrot', 'flower-yellow', 'oak-leaves', 'lapis', 'beetroot', 'coal'],
      },
      { text: 'Coloque o tapete no chão. Ele é fininho e dá para andar em cima!', items: ['carpet-red', 'carpet-blue', 'carpet-green', 'carpet-purple'], control: 'use' },
    ],
    tip: 'O tapete precisa de chão firme embaixo. Se o chão sumir, o tapete cai junto.',
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
    id: 'bonecos',
    emoji: '🧸',
    title: 'Bonecos',
    summary: 'Verity, Lovity, Obesity e Squareity passeiam de dia; Falsity, Cruelty e Pointy aparecem à noite.',
    steps: [
      { text: 'Verity: a bolinha amarela do sorrisão. É amiga, passeia na grama de dia e às vezes deixa ouro.', items: ['gold-ingot'] },
      { text: 'Toque na Verity com o botão de usar: ela pula de alegria e fala com você!', items: ['verity'], control: 'use' },
      { text: 'Lovity: a bolinha rosa dos óculos de coração. É amiga, aparece de dia e deixa flor e, às vezes, maçã.', items: ['apple'] },
      { text: 'Obesity: o redondão comilão. É amigo e deixa batata frita. Dê um hambúrguer a ele e nasce um filhote!', items: ['hamburger', 'fries'], control: 'use' },
      { text: 'Squareity: o quadradão de óculos. É amigo e deixa tijolos de pedra.', items: ['stone-bricks'] },
      { text: 'Falsity: a bolinha azul dos dentinhos. Aparece à noite, pula rápido e vem atrás de você.' },
      { text: 'Cruelty: a bolinha vermelha dos dentões. Aparece à noite e corre atrás de você. Use a espada!', items: ['wooden-sword'], control: 'break' },
      { text: 'Pointy: o cheio de pontas. Aparece à noite e atira flechas de longe. Um escudo ajuda!', items: ['arrow', 'shield'] },
      {
        text: 'No modo Criativo, a Verity, a Falsity, o Cruelty e a Lovity estão na mochila. Use no chão e eles chegam mansinhos para brincar.',
        items: ['verity', 'falsity', 'cruelty', 'lovity'],
        control: 'use',
      },
    ],
    tip: 'Com o Modo Paz 🕊️, só os bonecos amigos aparecem.',
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
      { text: 'Creeper: chega perto, chia e pisca. Corra para longe antes de ele estourar! Vencido, ele deixa pólvora.', items: ['gunpowder'] },
      { text: 'Para se defender, use a espada ou o arco com flechas.', items: ['wooden-sword', 'bow', 'arrow'], control: 'break' },
      { text: 'Tochas, lanternas e fogueiras perto da casa fazem os inimigos não nascerem ali.', items: ['torch', 'lantern', 'campfire'] },
      { text: 'Armadura na mochila segura os golpes: cada golpe gasta um pouco dela, e você não perde coração.', items: ['leather-armor', 'iron-armor', 'golden-armor'] },
      { text: 'O couro da armadura vem da vaca.', items: ['leather'] },
      { text: 'Segure o escudo na mão para parar as flechas do esqueleto.', items: ['shield'], control: 'hotbar' },
      { text: 'Na lua cheia 🌕, o Rei Slime vem passear. Vencido, ele vira quatro slimes e deixa a coroa dele!', items: ['slime-crown'] },
      { text: 'Quer ajuda? Chame um golem de ferro: ele enfrenta os inimigos por você.', items: ['iron-golem'] },
    ],
    tip: 'Não quer inimigos? Ligue o Modo Paz 🕊️. Quer inimigos mais calmos? Escolha Fácil nas Configurações.',
  },
  {
    id: 'golem',
    emoji: '🗿',
    title: 'Golem de ferro',
    summary: 'Um amigo grandão que protege você dos monstros.',
    steps: [
      { text: 'Derreta minério de ferro na fornalha. Na mesa, 9 barras de ferro viram um bloco de ferro.', items: ['iron-ingot', 'iron-block'] },
      { text: 'Colha uma abóbora na fazenda.', items: ['pumpkin'] },
      { text: 'Na mesa, 4 blocos de ferro em forma de T e a abóbora em cima viram um golem.', items: ['iron-block', 'pumpkin', 'iron-golem'] },
      { text: 'Escolha o golem na barra e use no chão. Ele aparece na hora!', items: ['iron-golem'], control: 'use' },
      { text: 'O golem segue você e vai atrás dos monstros, de dia e de noite.' },
      { text: 'Ele é seu amigo: seus golpes e suas flechas não machucam ele.' },
    ],
    tip: 'Cabem até 3 golens no mundo. Cuidado com a TNT perto deles!',
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
